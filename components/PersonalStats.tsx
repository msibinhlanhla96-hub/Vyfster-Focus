'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart2, BookOpen, Flame, Award } from 'lucide-react';
import { StudyLog, AppUser } from '@/lib/supabase';
import { formatMinutes, BADGE_DEFINITIONS } from '@/lib/utils';
import { format, startOfWeek, eachDayOfInterval, endOfWeek } from 'date-fns';

interface PersonalStatsProps {
  studyLogs: StudyLog[];
  user: AppUser;
}

const CHART_COLORS = [
  '#ffffff', '#a1a1aa', '#71717a', '#52525b', '#3f3f46',
  '#d4d4d8', '#e4e4e7', '#f4f4f5',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-sm px-3 py-2 text-xs">
      <p className="text-zinc-400 mb-0.5">{label}</p>
      <p className="text-white font-semibold">{payload[0].value}m</p>
    </div>
  );
};

export default function PersonalStats({ studyLogs, user }: PersonalStatsProps) {
  const completedLogs = studyLogs.filter(l => l.end_time && l.duration_minutes);

  const totalMinutes = useMemo(() =>
    completedLogs.reduce((acc, l) => acc + (l.duration_minutes || 0), 0), [completedLogs]);

  const moduleData = useMemo(() => {
    const map: Record<string, number> = {};
    completedLogs.forEach(l => {
      map[l.module_code] = (map[l.module_code] || 0) + (l.duration_minutes || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [completedLogs]);

  const weeklyData = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(new Date(), { weekStartsOn: 1 }) });
    return days.map(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const mins = completedLogs
        .filter(l => l.start_time.startsWith(dayKey))
        .reduce((acc, l) => acc + (l.duration_minutes || 0), 0);
      return { day: format(day, 'EEE'), minutes: mins };
    });
  }, [completedLogs]);

  // Streak calculation
  const streak = useMemo(() => {
    const days = new Set(completedLogs.map(l => l.start_time.slice(0, 10)));
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (days.has(format(d, 'yyyy-MM-dd'))) count++;
      else break;
    }
    return count;
  }, [completedLogs]);

  // Badge unlocks
  const unlockedBadges = useMemo(() => {
    const unlocked = new Set<string>();
    if (completedLogs.length >= 1) unlocked.add('first_session');
    if (streak >= 3) unlocked.add('streak_3');
    if (streak >= 7) unlocked.add('streak_7');
    if (completedLogs.some(l => new Date(l.start_time).getHours() >= 23)) unlocked.add('night_owl');
    const moduleHours: Record<string, number> = {};
    completedLogs.forEach(l => {
      moduleHours[l.module_code] = (moduleHours[l.module_code] || 0) + (l.duration_minutes || 0);
    });
    if (Object.values(moduleHours).some(m => m >= 600)) unlocked.add('module_heavy');
    return unlocked;
  }, [completedLogs, streak]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="flex flex-col gap-6"
    >
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <BookOpen size={14} />, label: 'Total Time', value: formatMinutes(totalMinutes) },
          { icon: <Flame size={14} className="text-orange-400" />, label: 'Day Streak', value: `${streak} days` },
          { icon: <BarChart2 size={14} />, label: 'Sessions', value: completedLogs.length },
        ].map((stat, i) => (
          <div key={i} className="glass-sm p-4 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-zinc-500">
              {stat.icon}
              <span className="text-xs">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-white font-mono">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Weekly bar chart */}
      <div className="glass p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart2 size={14} className="text-zinc-400" />
          This Week
        </h3>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={weeklyData} barCategoryGap="30%">
            <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
              {weeklyData.map((_, i) => (
                <Cell key={i} fill={weeklyData[i].minutes > 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.08)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Module breakdown */}
      {moduleData.length > 0 && (
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Module Breakdown</h3>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-shrink-0">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={moduleData}
                    dataKey="value"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {moduleData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 flex-1 w-full">
              {moduleData.map((m, i) => (
                <div key={m.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-xs text-zinc-300 flex-1">{m.name}</span>
                  <span className="text-xs font-mono text-zinc-400">{formatMinutes(m.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="glass p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Award size={14} className="text-zinc-400" />
          Badges
        </h3>
        <div className="flex flex-wrap gap-2">
          {BADGE_DEFINITIONS.map(badge => {
            const unlocked = unlockedBadges.has(badge.id);
            return (
              <div
                key={badge.id}
                title={badge.description}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  unlocked
                    ? badge.color
                    : 'bg-zinc-900 text-zinc-700 border-zinc-800 opacity-50'
                }`}
              >
                <span>{badge.icon}</span>
                {badge.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      {completedLogs.length > 0 && (
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Recent Sessions</h3>
          <div className="flex flex-col gap-2">
            {completedLogs.slice(0, 5).map(log => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="badge badge-white text-[10px]">{log.module_code}</span>
                  <span className="text-sm text-zinc-300 truncate max-w-32 sm:max-w-48">
                    {log.description || 'Study session'}
                  </span>
                  {log.is_verified_location && (
                    <span className="text-green-500/70 text-[10px]">✓ GPS</span>
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-xs font-mono text-zinc-300">{formatMinutes(log.duration_minutes || 0)}</p>
                  <p className="text-[10px] text-zinc-600">{format(new Date(log.start_time), 'dd MMM')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
