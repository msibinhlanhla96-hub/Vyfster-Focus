import { MandatorySession } from './supabase';

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatCurrency(amount: number): string {
  return `R${amount.toFixed(2)}`;
}

export function isMandatorySessionActive(session: MandatorySession): boolean {
  const now = new Date();
  return now >= new Date(session.start_time) && now <= new Date(session.end_time);
}

export function getMandatorySessionStatus(
  session: MandatorySession,
  clockedInAt: string | null
): 'upcoming' | 'active' | 'ended' {
  const now = new Date();
  if (now < new Date(session.start_time)) return 'upcoming';
  if (now > new Date(session.end_time)) return 'ended';
  return 'active';
}

export function calculateFine(
  session: MandatorySession,
  clockedInAt: string | null
): { reason: 'late' | 'absent'; amount: number } | null {
  if (!clockedInAt) {
    return { reason: 'absent', amount: session.absent_fine_amount };
  }
  const clockIn = new Date(clockedInAt);
  const sessionStart = new Date(session.start_time);
  const graceCutoff = new Date(sessionStart.getTime() + session.grace_period_mins * 60 * 1000);

  if (clockIn > graceCutoff) {
    return { reason: 'late', amount: session.late_fine_amount };
  }
  return null;
}

export const MODULES = [
  'STK120', 'STK110', 'INF214', 'INF271', 'INF263', 'INF284',
  'WTW114', 'WTW124', 'WTW134', 'WTW162',
  'EKN113', 'EKN114',
  'FRK111', 'FRK121',
  'Other',
];

export const BADGE_DEFINITIONS = [
  { id: 'first_session', label: 'First Session', icon: '🎯', description: 'Logged your first study session', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  { id: 'streak_3', label: '3-Day Streak', icon: '🔥', description: '3 consecutive days of studying', color: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
  { id: 'streak_7', label: '7-Day Streak', icon: '⚡', description: '7-Day Streak — Legend move', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  { id: 'night_owl', label: 'Night Owl', icon: '🦉', description: 'Studied past midnight', color: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
  { id: 'module_heavy', label: 'Module Heavyweight', icon: '💪', description: '10+ hours in a single module', color: 'bg-red-500/15 text-red-400 border-red-500/20' },
  { id: 'top_3', label: 'Top 3', icon: '🏆', description: 'Placed in top 3 on the leaderboard', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  { id: 'clean_slate', label: 'Clean Slate', icon: '✅', description: 'Zero fines this week', color: 'bg-green-500/15 text-green-400 border-green-500/20' },
];
