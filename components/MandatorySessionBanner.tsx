'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, MapPin, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { MandatorySession, AppUser, supabase } from '@/lib/supabase';
import { getCurrentPosition, isWithinGeofence } from '@/lib/haversine';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface MandatorySessionBannerProps {
  session: MandatorySession;
  user: AppUser;
  onClockIn: () => void;
}

export default function MandatorySessionBanner({ session, user, onClockIn }: MandatorySessionBannerProps) {
  const [checking, setChecking] = useState(false);
  const [clockedIn, setClockedIn] = useState(false);
  const [geoResult, setGeoResult] = useState<'verified' | 'unverified' | null>(null);

  const handleClockIn = async () => {
    setChecking(true);
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      const within = isWithinGeofence(latitude, longitude, session.lat, session.lng, session.radius_meters);
      setGeoResult(within ? 'verified' : 'unverified');

      const now = new Date();
      const sessionStart = new Date(session.start_time);
      const graceCutoff = new Date(sessionStart.getTime() + session.grace_period_mins * 60 * 1000);
      const isLate = now > graceCutoff;

      const { error } = await supabase.from('study_logs').insert({
        user_id: user.id,
        module_code: 'MANDATORY',
        description: session.title,
        start_time: now.toISOString(),
        end_time: new Date(session.end_time).toISOString(),
        is_verified_location: within,
        is_manual: false,
        mandatory_session_id: session.id,
      });

      if (error) throw error;

      // Auto-generate late fine
      if (isLate) {
        await supabase.from('fines_ledger').insert({
          user_id: user.id,
          session_id: session.id,
          amount: session.late_fine_amount,
          reason: 'late',
          status: 'unpaid',
          notes: `Clocked in ${Math.round((now.getTime() - graceCutoff.getTime()) / 60000)} min late`,
        });
        toast.error(`Clocked in late — ${formatCurrency(session.late_fine_amount)} fine applied`);
      } else if (within) {
        toast.success('✅ Location verified — clocked in!');
      } else {
        toast('⚠️ Clocked in (location unverified)', { icon: '📍' });
      }

      setClockedIn(true);
      onClockIn();
    } catch (err: any) {
      if (err.code === 1) {
        toast.error('Location permission denied. Allow GPS to clock in.');
      } else {
        toast.error('Clock-in failed: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setChecking(false);
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
            <div className="flex items-center gap-4 mt-1">
              <span className="text-zinc-400 text-xs flex items-center gap-1">
                <Clock size={10} />
                {format(new Date(session.start_time), 'HH:mm')} – {format(new Date(session.end_time), 'HH:mm')}
              </span>
              <span className="text-zinc-500 text-xs flex items-center gap-1">
                <MapPin size={10} />
                ±{session.radius_meters}m radius
              </span>
              <span className="text-zinc-500 text-xs">
                Absent fine: <span className="text-red-400">{formatCurrency(session.absent_fine_amount)}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {geoResult && (
            <span className={`badge ${geoResult === 'verified' ? 'badge-green' : 'badge-yellow'}`}>
              {geoResult === 'verified' ? <><CheckCircle size={10} /> Location Verified</> : <><XCircle size={10} /> Unverified</>}
            </span>
          )}

          {!clockedIn ? (
            <button
              id="mandatory-clock-in-btn"
              onClick={handleClockIn}
              disabled={checking}
              className="btn-danger flex-shrink-0"
            >
              {checking ? (
                <><Loader2 size={14} className="animate-spin" /> Verifying GPS…</>
              ) : (
                <><MapPin size={14} /> Clock In Now</>
              )}
            </button>
          ) : (
            <span className="badge badge-green">
              <CheckCircle size={10} /> Clocked In
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
