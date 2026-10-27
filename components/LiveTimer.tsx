'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Clock, Timer, Tag, FileText, MapPin, Plus } from 'lucide-react';
import { supabase, AppUser } from '@/lib/supabase';
import { MODULES } from '@/lib/utils';
import toast from 'react-hot-toast';

interface LiveTimerProps {
  user: AppUser;
  onLogSaved: () => void;
}

type TimerMode = 'stopwatch' | 'pomodoro';
type PomodoroPhase = 'focus' | 'break';

export default function LiveTimer({ user, onLogSaved }: LiveTimerProps) {
  const [mode, setMode] = useState<TimerMode>('stopwatch');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [module, setModule] = useState(MODULES[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Pomodoro
  const [pomPhase, setPomPhase] = useState<PomodoroPhase>('focus');
  const [pomCycles, setPomCycles] = useState(0);
  const FOCUS_SECS = 25 * 60;
  const BREAK_SECS = 5 * 60;
  const pomTotal = pomPhase === 'focus' ? FOCUS_SECS : BREAK_SECS;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback((freq = 880, duration = 0.3) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          // Pomodoro phase switch
          if (mode === 'pomodoro' && next >= pomTotal) {
            if (pomPhase === 'focus') {
              setPomPhase('break');
              setPomCycles(c => c + 1);
              playBeep(660, 0.5);
              toast('🎉 Focus phase done! Take a break.', { icon: '⏰' });
            } else {
              setPomPhase('focus');
              playBeep(880, 0.5);
              toast('🔥 Break over! Back to work.', { icon: '⚡' });
            }
            return 0;
          }
          return next;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode, pomPhase, pomTotal, playBeep]);

  const handleStart = () => {
    if (!running) {
      setStartTime(prev => prev ?? new Date());
      setRunning(true);
    } else {
      setRunning(false);
    }
  };

  const handleStop = async () => {
    if (!startTime && elapsed === 0) return;
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const endTime = new Date();
    const actualStart = startTime ?? new Date(endTime.getTime() - elapsed * 1000);

    setSaving(true);
    const { error } = await supabase.from('study_logs').insert({
      user_id: user.id,
      module_code: module,
      description: description || null,
      start_time: actualStart.toISOString(),
      end_time: endTime.toISOString(),
      is_verified_location: false,
      is_manual: false,
    });

    if (error) {
      toast.error('Failed to save session: ' + error.message);
    } else {
      playBeep(440, 0.2);
      setTimeout(() => playBeep(660, 0.3), 200);
      toast.success(`Session saved! ${formatTime(elapsed)} of ${module}`);
      onLogSaved();
    }

    setElapsed(0);
    setStartTime(null);
    setPomPhase('focus');
    setPomCycles(0);
    setDescription('');
    setSaving(false);
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const pomProgress = mode === 'pomodoro' ? (elapsed / pomTotal) * 100 : 0;
  const displayTime = mode === 'pomodoro' ? pomTotal - elapsed : elapsed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-zinc-400" />
          <h2 className="font-semibold text-white">Study Timer</h2>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl">
          {(['stopwatch', 'pomodoro'] as const).map(m => (
            <button
              key={m}
              onClick={() => { if (!running) { setMode(m); setElapsed(0); setPomPhase('focus'); } }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200 ${
                mode === m ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {m === 'stopwatch' ? <Clock size={11} /> : <Timer size={11} />}
              {m === 'pomodoro' ? 'Pomodoro' : 'Stopwatch'}
            </button>
          ))}
        </div>
      </div>

      {/* Pomodoro phase badge */}
      {mode === 'pomodoro' && (
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className={`badge ${pomPhase === 'focus' ? 'badge-white' : 'badge-green'}`}>
            {pomPhase === 'focus' ? '🔥 Focus Phase' : '☕ Break Time'}
          </span>
          {pomCycles > 0 && (
            <span className="text-xs text-zinc-500">Cycle {pomCycles}</span>
          )}
        </div>
      )}

      {/* Timer display */}
      <div className="flex flex-col items-center py-6">
        {mode === 'pomodoro' && (
          <div className="relative w-48 h-48 mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
              <circle
                cx="50" cy="50" r="44"
                fill="none"
                stroke={pomPhase === 'focus' ? 'white' : '#22C55E'}
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - pomProgress / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`timer-display text-4xl font-bold text-white ${running ? '' : 'text-zinc-400'}`}>
                {formatTime(displayTime)}
              </span>
            </div>
          </div>
        )}

        {mode === 'stopwatch' && (
          <div className={`timer-display text-6xl font-bold mb-2 transition-colors ${running ? 'text-white' : 'text-zinc-500'}`}>
            {formatTime(elapsed)}
          </div>
        )}

        {running && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Recording…
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <button
          id="timer-start-pause-btn"
          onClick={handleStart}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95 ${
            running
              ? 'bg-white/10 text-white border border-white/20 hover:bg-white/15'
              : 'bg-white text-black hover:bg-zinc-200'
          }`}
        >
          {running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> {elapsed > 0 ? 'Resume' : 'Start'}</>}
        </button>

        {(running || elapsed > 0) && (
          <button
            id="timer-stop-btn"
            onClick={handleStop}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all duration-200 active:scale-95 disabled:opacity-50"
          >
            <Square size={16} fill="currentColor" />
            {saving ? 'Saving…' : 'Stop & Save'}
          </button>
        )}
      </div>

      {/* Module & Description */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/8">
        <div>
          <label className="text-xs text-zinc-500 flex items-center gap-1 mb-1.5">
            <Tag size={10} /> Module
          </label>
          <select
            value={module}
            onChange={e => setModule(e.target.value)}
            className="select text-sm"
          >
            {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 flex items-center gap-1 mb-1.5">
            <FileText size={10} /> Description (optional)
          </label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Chapter 4 revision…"
            className="input text-sm"
          />
        </div>
      </div>
    </motion.div>
  );
}
