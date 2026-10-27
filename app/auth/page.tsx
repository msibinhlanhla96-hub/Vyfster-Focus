'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Star, Loader2 } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    room_number: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
      router.push('/dashboard');
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          room_number: form.room_number,
          role: 'student',
        },
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! Redirecting…');
      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      {/* Background star glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.02] blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <VyfsterStar />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Vyfster Focus</h1>
          <p className="text-zinc-500 text-sm mt-1.5">Corridor Study Tracker</p>
        </div>

        {/* Card */}
        <div className="glass p-8">
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl mb-6">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all duration-200 ${
                  mode === m ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={mode === 'login' ? handleLogin : handleSignup}
              className="flex flex-col gap-4"
            >
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Full Name</label>
                    <input
                      name="full_name"
                      type="text"
                      required
                      value={form.full_name}
                      onChange={handleChange}
                      placeholder="Thabo Nkosi"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Room Number</label>
                    <input
                      name="room_number"
                      type="text"
                      required
                      value={form.room_number}
                      onChange={handleChange}
                      placeholder="A214"
                      className="input"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@up.ac.za"
                  className="input"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPass ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="input pr-10"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-2"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing…</>
                ) : mode === 'login' ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </button>
            </motion.form>
          </AnimatePresence>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          Vyfster Focus — Built for the Vyfster Corridor ★
        </p>
      </motion.div>
    </div>
  );
}

function VyfsterStar() {
  return (
    <svg viewBox="0 0 80 80" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Central large star */}
      <polygon
        points="40,8 46,30 68,30 51,44 57,66 40,52 23,66 29,44 12,30 34,30"
        fill="white"
        className="vyfster-star"
      />
      {/* Small surrounding stars */}
      <polygon points="14,14 16,20 22,20 17,24 19,30 14,26 9,30 11,24 6,20 12,20" fill="rgba(255,255,255,0.5)" />
      <polygon points="66,14 68,20 74,20 69,24 71,30 66,26 61,30 63,24 58,20 64,20" fill="rgba(255,255,255,0.5)" />
      <polygon points="14,58 16,64 22,64 17,68 19,74 14,70 9,74 11,68 6,64 12,64" fill="rgba(255,255,255,0.5)" />
      <polygon points="66,58 68,64 74,64 69,68 71,74 66,70 61,74 63,68 58,64 64,64" fill="rgba(255,255,255,0.5)" />
    </svg>
  );
}
