-- ========================================================
-- VYFSTER FOCUS — Supabase SQL Schema & Security Policies
-- Run this in your Supabase Project: SQL Editor -> New Query -> Run
-- ========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ========================================================
-- 1. USERS (extends Supabase auth.users)
-- ========================================================
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  room_number text not null,
  role text not null default 'student' check (role in ('student', 'admin')),
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Authenticated users can view all corridor member profiles (needed for leaderboard & fines ledger)
create policy "Authenticated users can view corridor profiles"
  on public.users for select
  using (auth.role() = 'authenticated');

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Allow insert on signup"
  on public.users for insert
  with check (auth.uid() = id);

-- Helper security definer function to check admin without RLS recursion
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- ========================================================
-- 2. STUDY LOGS
-- ========================================================
create table if not exists public.study_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  module_code text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_minutes int generated always as (
    greatest(0, round(extract(epoch from (end_time - start_time)) / 60)::int)
  ) stored,
  is_verified_location boolean not null default false,
  is_manual boolean not null default false,
  mandatory_session_id uuid,
  created_at timestamptz not null default now()
);

alter table public.study_logs enable row level security;

create policy "Students can insert own logs"
  on public.study_logs for insert
  with check (auth.uid() = user_id);

create policy "Students can update own logs"
  on public.study_logs for update
  using (auth.uid() = user_id);

create policy "Authenticated users can read all logs for stats and leaderboards"
  on public.study_logs for select
  using (auth.role() = 'authenticated');

-- ========================================================
-- 3. MANDATORY SESSIONS
-- ========================================================
create table if not exists public.mandatory_sessions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  grace_period_mins int not null default 5,
  lat double precision not null default -25.7545,
  lng double precision not null default 28.2314,
  radius_meters int not null default 100,
  late_fine_amount numeric(10,2) not null default 5.00,
  absent_fine_amount numeric(10,2) not null default 20.00,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

alter table public.mandatory_sessions enable row level security;

create policy "All authenticated users can view mandatory sessions"
  on public.mandatory_sessions for select
  using (auth.role() = 'authenticated');

create policy "Admins can insert mandatory sessions"
  on public.mandatory_sessions for insert
  with check (public.is_admin());

create policy "Admins can update mandatory sessions"
  on public.mandatory_sessions for update
  using (public.is_admin());

create policy "Admins can delete mandatory sessions"
  on public.mandatory_sessions for delete
  using (public.is_admin());

-- ========================================================
-- 4. FINES LEDGER
-- ========================================================
create table if not exists public.fines_ledger (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  session_id uuid references public.mandatory_sessions(id) on delete set null,
  amount numeric(10,2) not null,
  reason text not null check (reason in ('late', 'absent', 'manual')),
  status text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  notes text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.fines_ledger enable row level security;

create policy "All authenticated users can view corridor fines"
  on public.fines_ledger for select
  using (auth.role() = 'authenticated');

create policy "Users can log own late fine or admins can insert"
  on public.fines_ledger for insert
  with check (
    auth.uid() = user_id or public.is_admin()
  );

create policy "Admins can update fines"
  on public.fines_ledger for update
  using (public.is_admin());

-- ========================================================
-- TRIGGER: Auto-create user profile on signup
-- ========================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, room_number, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Vyfster Resident'),
    coalesce(new.raw_user_meta_data->>'room_number', '000'),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    room_number = excluded.room_number;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ========================================================
-- VIEWS: Weekly Leaderboard & Floor Stats
-- ========================================================
create or replace view public.weekly_leaderboard as
select
  u.id,
  u.full_name,
  u.room_number,
  coalesce(sum(sl.duration_minutes), 0)::int as total_minutes,
  count(sl.id)::int as session_count,
  coalesce(sum(case when sl.is_verified_location then sl.duration_minutes else 0 end), 0)::int as verified_minutes
from public.users u
left join public.study_logs sl on sl.user_id = u.id
  and sl.end_time >= date_trunc('week', now())
  and sl.end_time is not null
where u.role = 'student'
group by u.id, u.full_name, u.room_number
order by total_minutes desc;

create or replace view public.corridor_stats as
select
  coalesce(sum(sl.duration_minutes), 0)::int as total_minutes_all_time,
  coalesce(sum(case when sl.end_time >= date_trunc('week', now()) then sl.duration_minutes else 0 end), 0)::int as total_minutes_this_week,
  count(distinct sl.user_id)::int as active_students
from public.study_logs sl
where sl.end_time is not null;

-- Grant permissions to standard Supabase API roles
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant select on public.weekly_leaderboard to anon, authenticated;
grant select on public.corridor_stats to anon, authenticated;
