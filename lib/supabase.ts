import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-vyfster-focus.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const isSupabaseConfigured = () => {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder-vyfster-focus.supabase.co' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder'
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type UserRole = 'student' | 'admin';

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  room_number: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export interface StudyLog {
  id: string;
  user_id: string;
  module_code: string;
  description?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  is_verified_location: boolean;
  is_manual: boolean;
  mandatory_session_id?: string;
  created_at: string;
}

export interface MandatorySession {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  grace_period_mins: number;
  lat: number;
  lng: number;
  radius_meters: number;
  late_fine_amount: number;
  absent_fine_amount: number;
  created_by?: string;
  created_at: string;
}

export interface Fine {
  id: string;
  user_id: string;
  session_id?: string;
  amount: number;
  reason: 'late' | 'absent' | 'manual';
  status: 'unpaid' | 'paid';
  notes?: string;
  created_at: string;
  paid_at?: string;
  users?: { full_name: string; room_number: string };
  mandatory_sessions?: { title: string };
}

export interface LeaderboardEntry {
  id: string;
  full_name: string;
  room_number: string;
  total_minutes: number;
  session_count: number;
  verified_minutes: number;
}
