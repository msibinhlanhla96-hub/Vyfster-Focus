'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase, AppUser, StudyLog, MandatorySession, Fine, LeaderboardEntry } from '@/lib/supabase';
import Header from '@/components/Header';
import LiveTimer from '@/components/LiveTimer';
import MandatorySessionBanner from '@/components/MandatorySessionBanner';
import Leaderboard from '@/components/Leaderboard';
import PersonalStats from '@/components/PersonalStats';
import FinesLedger from '@/components/FinesLedger';
import ScheduleTab from '@/components/ScheduleTab';
import AdminPanel from '@/components/AdminPanel';
import toast from 'react-hot-toast';

type Tab = 'dashboard' | 'schedule' | 'fines' | 'admin';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([]);
  const [sessions, setSessions] = useState<MandatorySession[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [corridorMinutes, setCorridorMinutes] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (userId: string) => {
    const [logsRes, sessionsRes, finesRes, lbRes, statsRes] = await Promise.all([
      supabase
        .from('study_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('mandatory_sessions')
        .select('*')
        .order('start_time', { ascending: true }),
      supabase
        .from('fines_ledger')
        .select('*, mandatory_sessions(title)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase.from('weekly_leaderboard').select('*'),
      supabase.from('corridor_stats').select('*').single(),
    ]);

    if (logsRes.data) setStudyLogs(logsRes.data);
    if (sessionsRes.data) setSessions(sessionsRes.data);
    if (finesRes.data) setFines(finesRes.data as Fine[]);
    if (lbRes.data) setLeaderboard(lbRes.data as LeaderboardEntry[]);
    if (statsRes.data) setCorridorMinutes(statsRes.data.total_minutes_this_week || 0);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/auth'); return; }

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !profile) {
        toast.error('Could not load profile');
        router.replace('/auth');
        return;
      }

      setUser(profile as AppUser);
      await loadData(session.user.id);
      setLoading(false);
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/auth');
    });

    return () => authListener.subscription.unsubscribe();
  }, [router, loadData]);

  const handleLogSaved = () => {
    if (user) loadData(user.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm font-mono">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const unpaidFines = fines.filter(f => f.status === 'unpaid').reduce((acc, f) => acc + f.amount, 0);
  const activeSessions = sessions.filter(s => {
    const now = new Date();
    return now >= new Date(s.start_time) && now <= new Date(s.end_time);
  });
  const upcomingSessions = sessions.filter(s => new Date(s.start_time) > new Date());

  const tabs: { id: Tab; label: string; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'fines', label: `Fines${unpaidFines > 0 ? ` (R${unpaidFines.toFixed(0)})` : ''}` },
    { id: 'admin', label: 'Admin', adminOnly: true },
  ];

  return (
    <div className="min-h-screen relative z-10">
      <Header user={user} unpaidFines={unpaidFines} />

      <main className="max-w-7xl mx-auto px-4 pb-16 pt-6">
        {/* Active session banner */}
        {activeSessions.length > 0 && (
          <MandatorySessionBanner
            session={activeSessions[0]}
            user={user}
            onClockIn={handleLogSaved}
          />
        )}

        {/* Tabs */}
        <div className="flex gap-6 border-b border-white/10 mb-8">
          {tabs
            .filter(t => !t.adminOnly || user.role === 'admin')
            .map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={activeTab === tab.id ? 'tab-active text-sm' : 'tab-inactive text-sm'}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="xl:col-span-2 flex flex-col gap-6">
              <LiveTimer user={user} onLogSaved={handleLogSaved} />
              <PersonalStats studyLogs={studyLogs} user={user} />
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-6">
              <Leaderboard
                entries={leaderboard}
                currentUserId={user.id}
                corridorMinutes={corridorMinutes}
              />
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <ScheduleTab
            sessions={sessions}
            user={user}
            onClockIn={handleLogSaved}
          />
        )}

        {/* Fines Tab */}
        {activeTab === 'fines' && (
          <FinesLedger fines={fines} user={user} onRefresh={() => loadData(user.id)} />
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && user.role === 'admin' && (
          <AdminPanel onRefresh={() => loadData(user.id)} />
        )}
      </main>
    </div>
  );
}
