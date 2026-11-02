'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Clock, Timer, Tag, FileText, Bell } from 'lucide-react';
import { supabase, AppUser } from '@/lib/supabase';
import { MODULES } from '@/lib/utils';
import toast from 'react-hot-toast';

interface LiveTimerProps {
  user: AppUser;
  onLogSaved: () => void;
}

type TimerMode = 'stopwatch' | 'pomodoro';
type PomodoroPhase = 'focus' | 'break';

const STORAGE_KEY = 'vyfster_active_timer_v1';
const FOCUS_SECS = 25 * 60;
const BREAK_SECS = 5 * 60;

interface SavedTimerState {
  running: boolean;
  startTime: number | null; // epoch ms when last resumed
  accumulatedElapsed: number; // seconds accumulated before current run
  mode: TimerMode;
  module: string;
  description: string;
  sessionStartedAt: string; // ISO string of initial session start
  pomPhase: PomodoroPhase;
  pomPhaseStart: number | null; // epoch ms when current phase resumed
  pomPhaseAccumulated: number;
  pomCycles: number;
}

export default function LiveTimer({ user, onLogSaved }: LiveTimerProps) {
  const [mode, setMode] = useState<TimerMode>('stopwatch');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // Total seconds for current session
  const [module, setModule] = useState(MODULES[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Wall-clock refs & state
  const startTimeRef = useRef<number | null>(null);
  const accumulatedRef = useRef<number>(0);
  const sessionStartedAtRef = useRef<Date | null>(null);

  // Pomodoro
  const [pomPhase, setPomPhase] = useState<PomodoroPhase>('focus');
  const [pomCycles, setPomCycles] = useState(0);
  const pomPhaseStartRef = useRef<number | null>(null);
  const pomPhaseAccumulatedRef = useRef<number>(0);
  const pomTotal = pomPhase === 'focus' ? FOCUS_SECS : BREAK_SECS;

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback((freq = 880, duration = 0.3) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
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

  const saveToStorage = useCallback((partial?: Partial<SavedTimerState>) => {
    try {
      const state: SavedTimerState = {
        running,
        startTime: startTimeRef.current,
        accumulatedElapsed: accumulatedRef.current,
        mode,
        module,
        description,
        sessionStartedAt: sessionStartedAtRef.current ? sessionStartedAtRef.current.toISOString() : new Date().toISOString(),
        pomPhase,
        pomPhaseStart: pomPhaseStartRef.current,
        pomPhaseAccumulated: pomPhaseAccumulatedRef.current,
        pomCycles,
        ...partial,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [running, mode, module, description, pomPhase, pomCycles]);

  const clearStorage = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  // Recompute true elapsed time from real timestamps
  const syncElapsed = useCallback(() => {
    const now = Date.now();

    // 1. Stopwatch sync
    let totalSecs = accumulatedRef.current;
    if (startTimeRef.current) {
      totalSecs += Math.floor((now - startTimeRef.current) / 1000);
    }
    setElapsed(Math.max(0, totalSecs));

    // 2. Pomodoro sync
    if (mode === 'pomodoro' && pomPhaseStartRef.current) {
      const currentPhaseSecs = pomPhaseAccumulatedRef.current + Math.floor((now - pomPhaseStartRef.current) / 1000);
      const limit = pomPhase === 'focus' ? FOCUS_SECS : BREAK_SECS;

      if (currentPhaseSecs >= limit) {
        // Switch phase
        if (pomPhase === 'focus') {
          setPomPhase('break');
          setPomCycles(c => c + 1);
          pomPhaseAccumulatedRef.current = 0;
          pomPhaseStartRef.current = now;
          playBeep(660, 0.5);
          toast('🎉 Focus phase complete! Take a break.', { icon: '☕' });
        } else {
          setPomPhase('focus');
          pomPhaseAccumulatedRef.current = 0;
          pomPhaseStartRef.current = now;
          playBeep(880, 0.5);
          toast('⚡ Break over! Back to focus.', { icon: '🔥' });
        }
      }
    }
  }, [mode, pomPhase, playBeep]);

  // Load persisted session on initial mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved: SavedTimerState = JSON.parse(raw);
      if (!saved) return;

      setMode(saved.mode || 'stopwatch');
      setModule(saved.module || MODULES[0]);
      setDescription(saved.description || '');
      setPomPhase(saved.pomPhase || 'focus');
      setPomCycles(saved.pomCycles || 0);

      accumulatedRef.current = saved.accumulatedElapsed || 0;
      pomPhaseAccumulatedRef.current = saved.pomPhaseAccumulated || 0;

      if (saved.sessionStartedAt) {
        sessionStartedAtRef.current = new Date(saved.sessionStartedAt);
      }

      if (saved.running && saved.startTime) {
        startTimeRef.current = saved.startTime;
        pomPhaseStartRef.current = saved.pomPhaseStart || saved.startTime;
        setRunning(true);
        // Calculate true elapsed right now
        const now = Date.now();
        const currentElapsed = saved.accumulatedElapsed + Math.floor((now - saved.startTime) / 1000);
        setElapsed(Math.max(0, currentElapsed));
      } else {
        startTimeRef.current = null;
        pomPhaseStartRef.current = null;
        setRunning(false);
        setElapsed(saved.accumulatedElapsed || 0);
      }
    } catch {}
  }, []);

  // Sync on visibility change (when switching back to tab or unlocking phone)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && running) {
        syncElapsed();
      }
    };
    const handleFocus = () => {
      if (running) syncElapsed();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handleFocus);
    };
  }, [running, syncElapsed]);

  // Regular tick while tab is open
  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      syncElapsed();
    }, 1000);

    return () => clearInterval(interval);
  }, [running, syncElapsed]);

  // Update browser tab title with active timer
  useEffect(() => {
    if (running) {
      const displaySecs = mode === 'pomodoro' ? Math.max(0, pomTotal - elapsed) : elapsed;
      const h = Math.floor(displaySecs / 3600);
      const m = Math.floor((displaySecs % 3600) / 60);
      const s = displaySecs % 60;
      const timeStr = h > 0
        ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      document.title = `(${timeStr}) Vyfster Focus`;
    } else {
      document.title = 'Vyfster Focus — Corridor Study Tracker';
    }

    return () => {
      document.title = 'Vyfster Focus — Corridor Study Tracker';
    };
  }, [running, elapsed, mode, pomTotal]);

  const handleStart = () => {
    const now = Date.now();
    if (!running) {
      // Starting or Resuming
      startTimeRef.current = now;
      pomPhaseStartRef.current = now;
      if (!sessionStartedAtRef.current) {
        sessionStartedAtRef.current = new Date(now - accumulatedRef.current * 1000);
      }
      setRunning(true);
      saveToStorage({
        running: true,
        startTime: now,
        pomPhaseStart: now,
      });

      // Request browser notification permission for background alerts if supported
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } else {
      // Pausing
      if (startTimeRef.current) {
        const added = Math.floor((now - startTimeRef.current) / 1000);
        accumulatedRef.current += added;
      }
      if (pomPhaseStartRef.current) {
        const addedPhase = Math.floor((now - pomPhaseStartRef.current) / 1000);
        pomPhaseAccumulatedRef.current += addedPhase;
      }
      startTimeRef.current = null;
      pomPhaseStartRef.current = null;
      setRunning(false);
      setElapsed(accumulatedRef.current);
      saveToStorage({
        running: false,
        startTime: null,
        pomPhaseStart: null,
        accumulatedElapsed: accumulatedRef.current,
        pomPhaseAccumulated: pomPhaseAccumulatedRef.current,
      });
    }
  };

  const handleStop = async () => {
    const now = Date.now();
    let finalSecs = accumulatedRef.current;
    if (startTimeRef.current) {
      finalSecs += Math.floor((now - startTimeRef.current) / 1000);
    }

    if (finalSecs <= 0 && !sessionStartedAtRef.current) return;

    setRunning(false);
    startTimeRef.current = null;
    pomPhaseStartRef.current = null;
    clearStorage();

    const endTime = new Date();
    const actualStart = sessionStartedAtRef.current ?? new Date(endTime.getTime() - finalSecs * 1000);

    setSaving(true);
    const { error } = await supabase.from('study_logs').insert({
      user_id: user.id,
      module_code: module,
      description: description.trim() || null,
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
      toast.success(`Session saved! ${formatTime(finalSecs)} of ${module}`);
      onLogSaved();
    }

    // Reset everything
    accumulatedRef.current = 0;
    sessionStartedAtRef.current = null;
    pomPhaseAccumulatedRef.current = 0;
    setElapsed(0);
    setPomPhase('focus');
    setPomCycles(0);
    setDescription('');
    setSaving(false);
  };

  const formatTime = (secs: number) => {
    const safeSecs = Math.max(0, secs);
    const h = Math.floor(safeSecs / 3600);
    const m = Math.floor((safeSecs % 3600) / 60);
    const s = safeSecs % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const pomProgress = mode === 'pomodoro' ? Math.min(100, (elapsed / pomTotal) * 100) : 0;
  const displayTime = mode === 'pomodoro' ? Math.max(0, pomTotal - elapsed) : elapsed;

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
              onClick={() => {
                if (!running) {
                  setMode(m);
                  setElapsed(0);
                  accumulatedRef.current = 0;
                  pomPhaseAccumulatedRef.current = 0;
                  setPomPhase('focus');
                  clearStorage();
                } else {
                  toast('Stop the active timer to change mode', { icon: 'ℹ️' });
                }
              }}
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
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Tracking active in background</span>
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
            onChange={e => {
              setModule(e.target.value);
              saveToStorage({ module: e.target.value });
            }}
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
            onChange={e => {
              setDescription(e.target.value);
              saveToStorage({ description: e.target.value });
            }}
            placeholder="Chapter 4 revision…"
            className="input text-sm"
          />
        </div>
      </div>
    </motion.div>
  );
}
