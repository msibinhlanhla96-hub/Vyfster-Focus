'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, MapPin, Clock, CheckCircle, Play } from 'lucide-react';
import { MandatorySession, AppUser, StudyLog } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

interface MandatorySessionBannerProps {
  session: MandatorySession;
  user: AppUser;
  studyLogs?: StudyLog[];
  isTimerRunning?: boolean;
}

export default function MandatorySessionBanner({ session, user, studyLogs = [], isTimerRunning }: MandatorySessionBannerProps) {
  // Check if student has already recorded attendance for this session
  const alreadyCompleted = studyLogs.some(l => l.mandatory_session_id === session.id);

  const handleTriggerClockIn = () => {
    // Dispatch unified start event to the Live Study Timer
    window.dispatchEvent(new CustomEvent('vyfster:start-timer'));
    const timerEl = document.getElementById('live-study-timer');
    if (timerEl) {
      timerEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 rounded-2xl border border-red-500/30 bg-red-500/8 glow-red"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle size={16} className="text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-red-400 text-xs font-bold uppercase tracking-widest">MANDATORY SESSION ACTIVE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 ticker-blink" />
            </div>
            <h3 className="text-white font-semibold text-base">{session.title}</h3>
            <div className="flex flex-wrap items-center gap-4 mt-1">
              <span className="text-zinc-400 text-xs flex items-center gap-1">
                <Clock size={10} />
                {format(new Date(session.start_time), 'HH:mm')} – {format(new Date(session.end_time), 'HH:mm')}
              </span>
              <span className="text-zinc-500 text-xs flex items-center gap-1">
                <MapPin size={10} />
                ±{session.radius_meters}m corridor radius
              </span>
              <span className="text-zinc-500 text-xs">
                Grace: <span className="text-zinc-300 font-semibold">{session.grace_period_mins} min</span>
              </span>
              <span className="text-zinc-500 text-xs">
                Late fine: <span className="text-red-400">{formatCurrency(session.late_fine_amount)}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {alreadyCompleted ? (
            <span className="badge badge-green text-xs px-3 py-1.5">
              <CheckCircle size={12} /> Attendance Logged
            </span>
          ) : isTimerRunning ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Clocked In via Study Timer
            </div>
          ) : (
            <button
              onClick={handleTriggerClockIn}
              className="btn-danger flex items-center gap-1.5 text-xs px-4 py-2"
            >
              <Play size={13} fill="currentColor" /> Clock In (Start Timer)
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
