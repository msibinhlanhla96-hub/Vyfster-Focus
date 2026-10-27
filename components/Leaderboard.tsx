'use client';

import { motion } from 'framer-motion';
import { Trophy, Clock, Zap, Star } from 'lucide-react';
import { LeaderboardEntry } from '@/lib/supabase';
import { formatMinutes } from '@/lib/utils';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
  corridorMinutes: number;
}

const RANK_STYLES = [
  { bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-yellow-400', label: '👑' },
  { bg: 'bg-zinc-400/10', border: 'border-zinc-400/20', text: 'text-zinc-300', label: '🥈' },
  { bg: 'bg-orange-700/15', border: 'border-orange-700/30', text: 'text-orange-400', label: '🥉' },
];

export default function Leaderboard({ entries, currentUserId, corridorMinutes }: LeaderboardProps) {
  const corridorHours = Math.floor(corridorMinutes / 60);
  const corridorMins = corridorMinutes % 60;
  const topEntry = entries[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass p-6 flex flex-col gap-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-yellow-400" />
          <h2 className="font-semibold text-white">Weekly Leaderboard</h2>
        </div>
        <span className="badge badge-white text-[10px]">Resets Sunday</span>
      </div>

      {/* Corridor meter */}
      <div className="p-4 rounded-xl bg-white/4 border border-white/8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-400 flex items-center gap-1">
            <Zap size={11} className="text-yellow-400" />
            Total Floor Hours
          </span>
          <span className="font-mono font-bold text-white text-sm">
            {corridorHours}h {corridorMins}m
          </span>
        </div>
        <div className="progress-bar">
          <motion.div
            className="progress-fill bg-gradient-to-r from-white/60 to-white"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((corridorHours / 100) * 100, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
        <p className="text-[10px] text-zinc-600 mt-1.5">Goal: 100 hours this week</p>
      </div>

      {/* Leaderboard entries */}
      <div className="flex flex-col gap-2">
        {entries.length === 0 && (
          <div className="text-center py-8 text-zinc-600 text-sm">
            No sessions logged this week yet.<br />Be the first on the board!
          </div>
        )}

        {entries.map((entry, i) => {
          const isCurrentUser = entry.id === currentUserId;
          const rank = i + 1;
          const style = RANK_STYLES[i] ?? null;
          const hours = Math.floor(entry.total_minutes / 60);
          const mins = entry.total_minutes % 60;
          const maxMins = entries[0]?.total_minutes || 1;

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                isCurrentUser
                  ? 'bg-white/8 border-white/20'
                  : 'bg-white/3 border-white/6 hover:bg-white/5'
              }`}
            >
              {/* Rank */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                style ? `${style.bg} border ${style.border} ${style.text}` : 'bg-zinc-800 text-zinc-500'
              }`}>
                {rank <= 3 ? style?.label : rank}
              </div>

              {/* Name + progress */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-white' : 'text-zinc-200'}`}>
                    {entry.full_name}
                    {isCurrentUser && <span className="text-zinc-500 text-xs ml-1.5">(you)</span>}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 flex-shrink-0 ml-2">
                    {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
                  </span>
                </div>
                <div className="progress-bar h-1">
                  <motion.div
                    className={`h-full rounded-full ${isCurrentUser ? 'bg-white' : 'bg-zinc-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(entry.total_minutes / maxMins) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 + i * 0.05 }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-zinc-600">Room {entry.room_number}</span>
                  {entry.verified_minutes > 0 && (
                    <span className="text-[10px] text-green-500/70">
                      {Math.floor(entry.verified_minutes / 60)}h verified
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Sessions count footer */}
      {entries.length > 0 && (
        <p className="text-[11px] text-zinc-600 text-center">
          {entries.reduce((a, e) => a + e.session_count, 0)} sessions logged across {entries.length} students this week
        </p>
      )}
    </motion.div>
  );
}
