'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Bell, Star, Shield } from 'lucide-react';
import { supabase, AppUser } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface HeaderProps {
  user: AppUser;
  unpaidFines: number;
}

export default function Header({ user, unpaidFines }: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out');
    router.replace('/auth');
  };

  const initials = user.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <VyfsterLogoMark />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">Vyfster Focus</h1>
            <p className="text-[10px] text-zinc-500 font-mono leading-none mt-0.5">CORRIDOR STUDY TRACKER</p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Fine alert */}
          {unpaidFines > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20"
            >
              <Bell size={12} className="text-red-400" />
              <span className="text-red-400 text-xs font-semibold">R{unpaidFines.toFixed(0)} owed</span>
            </motion.div>
          )}

          {/* Room badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-zinc-400 text-xs">Room</span>
            <span className="text-white text-xs font-bold font-mono">{user.room_number}</span>
          </div>

          {/* Admin badge */}
          {user.role === 'admin' && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 border border-white/20">
              <Shield size={10} className="text-white" />
              <span className="text-white text-[10px] font-bold">ADMIN</span>
            </div>
          )}

          {/* Avatar menu */}
          <div className="relative">
            <button
              id="user-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-sm font-bold text-white hover:bg-white/15 transition-colors"
            >
              {initials}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute right-0 top-12 z-20 w-52 glass p-2 shadow-xl"
                >
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
                    <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function VyfsterLogoMark() {
  return (
    <svg viewBox="0 0 40 40" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon
        points="20,3 23.5,14 35,14 25.5,21 29,32 20,25 11,32 14.5,21 5,14 16.5,14"
        fill="white"
        style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.5))' }}
      />
      <polygon points="6,6 7,10 11,10 8,12 9,16 6,13.5 3,16 4,12 1,10 5,10" fill="rgba(255,255,255,0.4)" />
      <polygon points="34,6 35,10 39,10 36,12 37,16 34,13.5 31,16 32,12 29,10 33,10" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}
