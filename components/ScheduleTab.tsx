'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import { MandatorySession, AppUser } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { format, isPast, isFuture, isWithinInterval } from 'date-fns';
import MandatorySessionBanner from './MandatorySessionBanner';

interface ScheduleTabProps {
  sessions: MandatorySession[];
  user: AppUser;
  onClockIn: () => void;
}

export default function ScheduleTab({ sessions, user, onClockIn }: ScheduleTabProps) {
  const now = new Date();

  const active = sessions.filter(s =>
    isWithinInterval(now, { start: new Date(s.start_time), end: new Date(s.end_time) })
  );
  const upcoming = sessions.filter(s => isFuture(new Date(s.start_time)));
  const past = sessions.filter(s => isPast(new Date(s.end_time)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      {/* Active sessions */}
      {active.map(s => (
        <MandatorySessionBanner key={s.id} session={s} user={user} onClockIn={onClockIn} />
      ))}

      {/* Upcoming */}
      <div className="glass p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar size={14} className="text-zinc-400" />
          Upcoming Sessions
        </h3>
        {upcoming.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-6">No upcoming mandatory sessions scheduled.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map(s => (
              <SessionCard key={s.id} session={s} variant="upcoming" />
            ))}
          </div>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div className="glass p-6">
          <h3 className="text-sm font-semibold text-zinc-500 mb-4 flex items-center gap-2">
            <Clock size={14} />
            Past Sessions
          </h3>
          <div className="flex flex-col gap-3">
            {past.slice(0, 10).map(s => (
              <SessionCard key={s.id} session={s} variant="past" />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function SessionCard({ session, variant }: { session: MandatorySession; variant: 'upcoming' | 'past' }) {
  return (
    <div className={`flex items-start justify-between p-4 rounded-xl border transition-colors ${
      variant === 'upcoming'
        ? 'bg-white/4 border-white/10 hover:bg-white/6'
        : 'bg-white/2 border-white/5 opacity-60'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          variant === 'upcoming' ? 'bg-white/10 border border-white/15' : 'bg-zinc-800 border border-zinc-700'
        }`}>
          <Calendar size={16} className={variant === 'upcoming' ? 'text-white' : 'text-zinc-600'} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white mb-1">{session.title}</h4>
          {session.description && (
            <p className="text-xs text-zinc-500 mb-2">{session.description}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Clock size={10} />
              {format(new Date(session.start_time), 'EEE dd MMM, HH:mm')} – {format(new Date(session.end_time), 'HH:mm')}
            </span>
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <MapPin size={10} />
              ±{session.radius_meters}m • {session.grace_period_mins}min grace
            </span>
          </div>
          <div className="flex gap-2 mt-2">
            <span className="badge badge-yellow text-[10px]">
              <AlertTriangle size={8} /> Late: {formatCurrency(session.late_fine_amount)}
            </span>
            <span className="badge badge-red text-[10px]">
              Absent: {formatCurrency(session.absent_fine_amount)}
            </span>
          </div>
        </div>
      </div>
      {variant === 'past' && (
        <span className="badge badge-white text-[10px] flex-shrink-0 ml-3">Ended</span>
      )}
    </div>
  );
}
