# 🌟 Vyfster Focus — Study Time Tracker & Corridor Monitor

A modern, high-performance web application built for the **Vyfster corridor** to track study hours, manage mandatory sessions with GPS geofencing, enforce punctuality fines, and celebrate corridor achievements via gamified leaderboards.

---

## 🎨 Visual System & Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript + React 18
- **Styling:** Tailwind CSS (Dark streetwear / edgy monochrome glassmorphism)
- **Backend & Auth:** Supabase (PostgreSQL with Row Level Security, Auth triggers)
- **Icons & Visuals:** Lucide React, Framer Motion, Recharts
- **Audio:** Web Audio API sound cues for Pomodoro transitions

---

## 🚀 Quick Start (Local Run)

The application is fully installed and compiled in `D:\vyfster-focus`.

### 1. Run Development Server
Open PowerShell in `D:\vyfster-focus` and run:
```powershell
$nodePath = "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\VisualStudio\NodeJs"
$env:PATH = "$nodePath;" + $env:PATH
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Run Production Build
```powershell
$nodePath = "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\VisualStudio\NodeJs"
$env:PATH = "$nodePath;" + $env:PATH
npm run build
npm start
```

---

## 🗄️ Phase 2: Supabase Setup (Database & Authentication)

1. **Create Supabase Project:**
   - Go to [supabase.com](https://supabase.com) and create a free project named `vyfster-focus`.
2. **Execute Database Schema:**
   - In Supabase, go to the **SQL Editor** on the left menu.
   - Click **New Query**, copy and paste the contents of `supabase/schema.sql`, and click **Run**.
   - This sets up the `users`, `study_logs`, `mandatory_sessions`, and `fines_ledger` tables, automatic profile triggers, and RLS policies.
3. **Configure Environment Variables:**
   - In Supabase, go to **Project Settings > API**.
   - Copy your `Project URL` and `anon public` key.
   - Update your `D:\vyfster-focus\.env.local` file:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
     ```

### 👑 Promoting Your User to Admin
1. Sign up through the app at `/auth`.
2. In Supabase, go to **Table Editor > users**.
3. Find your user row and change `role` from `'student'` to `'admin'`.
4. Refresh your dashboard to unlock the **Admin Control Panel**!

---

## 🌐 Phase 3: Free Web Hosting on Vercel

1. **Push Code to GitHub:**
   In `D:\vyfster-focus`, link your GitHub repository:
   ```powershell
   $gitPath = "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd"
   $env:PATH = "$gitPath;" + $env:PATH
   git remote add origin https://github.com/YOUR_USERNAME/vyfster-focus.git
   git push -u origin main
   ```
2. **Import into Vercel:**
   - Go to [vercel.com](https://vercel.com) and click **Add New Project**.
   - Import your `vyfster-focus` GitHub repository.
3. **Add Environment Variables in Vercel:**
   - In the **Environment Variables** section:
     - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
4. **Deploy:**
   - Click **Deploy**. In under 2 minutes, your corridor site will be live at a public HTTPS URL (e.g. `vyfster-focus.vercel.app`) accessible from any laptop or mobile phone.

---

## 🌟 Core Features Included

1. **Live Stopwatch & Pomodoro Timer:**
   - Real-time stopwatch with module tags (`STK120`, `INF214`, `INF271`, `STK110`, etc.) and task descriptions.
   - 25/5 Pomodoro focus mode with procedural Web Audio beeps.
2. **GPS Geolocation & Mandatory Sessions:**
   - Geofence calculation with the Haversine formula (accurate within ±100m).
   - Real-time distance and verification badges (`[Location Verified]` vs `[Remote]`).
3. **Automated Fines Ledger:**
   - Automated late fine generation when clocking in past the admin grace period.
   - Total floor fines meter, individual balance, and admin mark-as-paid controls.
4. **Weekly Corridor Leaderboard:**
   - Top-ranked residents with custom medals (`👑`, `🥈`, `🥉`).
   - Total floor hours milestone progress bar (goal: 100 hours/week).
   - Streak tracking and achievement badge unlocks.
5. **Interactive Personal Analytics:**
   - Recharts visual graphs breakdown of time spent per module and daily study hours.
