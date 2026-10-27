'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { Fine, AppUser, supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface FinesLedgerProps {
  fines: Fine[];
  user: AppUser;
  onRefresh: () => void;
}

export default function FinesLedger({ fines, user, onRefresh }: FinesLedgerProps) {
  const [marking, setMarking] = useState<string | null>(null);

  const unpaid = fines.filter(f => f.status === 'unpaid');
  const paid = fines.filter(f => f.status === 'paid');
  const totalUnpaid = unpaid.reduce((acc, f) => acc + f.amount, 0);
  const totalPaid = paid.reduce((acc, f) => acc + f.amount, 0);

  const handleMarkPaid = async (fineId: string) => {
    if (user.role !== 'admin') return;
    setMarking(fineId);
    const { error } = await supabase
      .from('fines_ledger')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', fineId);
    if (error) {
      toast.error('Failed to mark paid: ' + error.message);
    } else {
      toast.success('Fine marked as paid');
      onRefresh();
    }
    setMarking(null);
  };

  const REASON_MAP = {
    late: { label: 'Late Fine', style: 'badge-yellow', icon: <Clock size={10} /> },
    absent: { label: 'Absence Fine', style: 'badge-red', icon: <AlertCircle size={10} /> },
    manual: { label: 'Manual Fine', style: 'badge-white', icon: <DollarSign size={10} /> },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="glass p-4">
          <p className="text-xs text-zinc-500 mb-1">Outstanding Balance</p>
          <p className={`text-2xl font-bold font-mono ${totalUnpaid > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
            {formatCurrency(totalUnpaid)}
          </p>
          {totalUnpaid > 0 && <p className="text-xs text-zinc-600 mt-1">{unpaid.length} unpaid fine{unpaid.length !== 1 ? 's' : ''}</p>}
        </div>
        <div className="glass p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Paid</p>
          <p className="text-2xl font-bold font-mono text-green-400">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-zinc-600 mt-1">{paid.length} cleared</p>
        </div>
        <div className="glass p-4 sm:block hidden">
          <p className="text-xs text-zinc-500 mb-1">All Time</p>
          <p className="text-2xl font-bold font-mono text-zinc-300">{formatCurrency(totalUnpaid + totalPaid)}</p>
          <p className="text-xs text-zinc-600 mt-1">{fines.length} total fines</p>
        </div>
      </div>

      {/* Unpaid fines */}
      {unpaid.length > 0 && (
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-red-400 mb-4 flex items-center gap-2">
            <AlertCircle size={14} />
            Unpaid Fines
          </h3>
          <div className="flex flex-col gap-2">
            {unpaid.map(fine => {
              const r = REASON_MAP[fine.reason];
              return (
                <div key={fine.id} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                  <div className="flex items-start gap-3">
                    <span className={`badge ${r.style} mt-0.5`}>
                      {r.icon} {r.label}
                    </span>
                    <div>
                      <p className="text-sm text-zinc-200">
                        {(fine as any).mandatory_sessions?.title || fine.notes || 'Fine'}
                      </p>
                      <p className="text-xs text-zinc-600 mt-0.5">{format(new Date(fine.created_at), 'dd MMM yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className="text-red-400 font-bold font-mono">{formatCurrency(fine.amount)}</span>
                    {user.role === 'admin' && (
                      <button
                        onClick={() => handleMarkPaid(fine.id)}
                        disabled={marking === fine.id}
                        className="btn-ghost text-xs px-3 py-1.5"
                      >
                        {marking === fine.id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <><CheckCircle size={12} /> Mark Paid</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Paid fines */}
      {paid.length > 0 && (
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-zinc-500 mb-4 flex items-center gap-2">
            <CheckCircle size={14} />
            Payment History
          </h3>
          <div className="flex flex-col gap-2">
            {paid.map(fine => {
              const r = REASON_MAP[fine.reason];
              return (
                <div key={fine.id} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/6 opacity-60">
                  <div className="flex items-center gap-3">
                    <span className={`badge ${r.style}`}>{r.icon} {r.label}</span>
                    <p className="text-sm text-zinc-400">
                      {(fine as any).mandatory_sessions?.title || fine.notes || 'Fine'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className="text-zinc-500 font-mono text-sm line-through">{formatCurrency(fine.amount)}</span>
                    <span className="badge badge-green text-[10px]"><CheckCircle size={8} /> Paid</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {fines.length === 0 && (
        <div className="glass p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <CheckCircle size={24} className="text-green-400" />
          </div>
          <p className="text-white font-semibold">Clean Slate</p>
          <p className="text-zinc-500 text-sm max-w-sm">No fines on record. Keep attending your mandatory sessions on time.</p>
        </div>
      )}
    </motion.div>
  );
}
