'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Plus, Trash2, Edit3, Users, DollarSign, MapPin, Calendar, Loader2, RefreshCw } from 'lucide-react';
import { supabase, MandatorySession, Fine, AppUser } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface AdminPanelProps {
  onRefresh: () => void;
}

export default function AdminPanel({ onRefresh }: AdminPanelProps) {
  const [sessions, setSessions] = useState<MandatorySession[]>([]);
  const [allFines, setAllFines] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    grace_period_mins: 5,
    lat: -25.7545,
    lng: 28.2314,
    radius_meters: 100,
    late_fine_amount: 5,
    absent_fine_amount: 20,
  });

  const loadAll = async () => {
    setLoading(true);
    const [sessRes, finesRes, usersRes] = await Promise.all([
      supabase.from('mandatory_sessions').select('*').order('start_time', { ascending: false }),
      supabase.from('fines_ledger').select('*, users(full_name, room_number), mandatory_sessions(title)').order('created_at', { ascending: false }),
      supabase.from('users').select('*').order('full_name'),
    ]);
    if (sessRes.data) setSessions(sessRes.data);
    if (finesRes.data) setAllFines(finesRes.data);
    if (usersRes.data) setAllUsers(usersRes.data);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const { error } = await supabase.from('mandatory_sessions').insert(form);
    if (error) {
      toast.error('Failed to create session: ' + error.message);
    } else {
      toast.success('Mandatory session created!');
      setShowCreateForm(false);
      setForm({ title: '', description: '', start_time: '', end_time: '', grace_period_mins: 5, lat: -25.7545, lng: 28.2314, radius_meters: 100, late_fine_amount: 5, absent_fine_amount: 20 });
      loadAll();
      onRefresh();
    }
    setCreating(false);
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Delete this session? Related fines will be unlinked.')) return;
    await supabase.from('mandatory_sessions').delete().eq('id', id);
    toast.success('Session deleted');
    loadAll();
  };

  const handleMarkPaid = async (fineId: string) => {
    setMarkingPaid(fineId);
    await supabase.from('fines_ledger').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', fineId);
    toast.success('Fine marked paid');
    loadAll();
    onRefresh();
    setMarkingPaid(null);
  };

  const handlePromoteUser = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'student' : 'admin';
    if (!confirm(`Change this user's role to ${newRole}?`)) return;
    await supabase.from('users').update({ role: newRole }).eq('id', userId);
    toast.success(`Role updated to ${newRole}`);
    loadAll();
  };

  const unpaidFines = allFines.filter(f => f.status === 'unpaid');
  const totalCollected = allFines.filter(f => f.status === 'paid').reduce((a, f) => a + f.amount, 0);
  const totalOutstanding = unpaidFines.reduce((a, f) => a + f.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
      {/* Admin header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-white" />
          <h2 className="font-bold text-white">Admin Control Panel</h2>
        </div>
        <button onClick={loadAll} className="btn-ghost text-xs">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Students', value: allUsers.filter(u => u.role === 'student').length, icon: <Users size={14} /> },
          { label: 'Sessions Created', value: sessions.length, icon: <Calendar size={14} /> },
          { label: 'Outstanding Fines', value: formatCurrency(totalOutstanding), icon: <DollarSign size={14} className="text-red-400" />, red: true },
          { label: 'Total Collected', value: formatCurrency(totalCollected), icon: <DollarSign size={14} className="text-green-400" /> },
        ].map((s, i) => (
          <div key={i} className="glass-sm p-4">
            <div className="flex items-center gap-1.5 text-zinc-500 mb-1">{s.icon}<span className="text-xs">{s.label}</span></div>
            <p className={`text-xl font-bold font-mono ${s.red ? 'text-red-400' : 'text-white'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Create Session */}
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Calendar size={14} className="text-zinc-400" /> Mandatory Sessions
          </h3>
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary text-xs px-3 py-2">
            <Plus size={12} /> New Session
          </button>
        </div>

        {showCreateForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            onSubmit={handleCreate}
            className="mb-6 p-5 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-4"
          >
            <h4 className="text-sm font-semibold text-white">Create Mandatory Session</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Title *</label>
                <input required className="input text-sm" placeholder="Monday Study Block" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Description</label>
                <input className="input text-sm" placeholder="Optional description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Start Time *</label>
                <input required type="datetime-local" className="input text-sm" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">End Time *</label>
                <input required type="datetime-local" className="input text-sm" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Grace Period (mins)</label>
                <input type="number" min="0" max="60" className="input text-sm" value={form.grace_period_mins} onChange={e => setForm(p => ({ ...p, grace_period_mins: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Geofence Radius (m)</label>
                <input type="number" min="10" max="1000" className="input text-sm" value={form.radius_meters} onChange={e => setForm(p => ({ ...p, radius_meters: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Target Latitude</label>
                <input type="number" step="0.0001" className="input text-sm" value={form.lat} onChange={e => setForm(p => ({ ...p, lat: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Target Longitude</label>
                <input type="number" step="0.0001" className="input text-sm" value={form.lng} onChange={e => setForm(p => ({ ...p, lng: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Late Fine (R)</label>
                <input type="number" min="0" step="0.5" className="input text-sm" value={form.late_fine_amount} onChange={e => setForm(p => ({ ...p, late_fine_amount: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Absence Fine (R)</label>
                <input type="number" min="0" step="0.5" className="input text-sm" value={form.absent_fine_amount} onChange={e => setForm(p => ({ ...p, absent_fine_amount: +e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={creating} className="btn-primary text-sm">
                {creating ? <><Loader2 size={13} className="animate-spin" /> Creating…</> : <><Plus size={13} /> Create Session</>}
              </button>
              <button type="button" onClick={() => setShowCreateForm(false)} className="btn-ghost text-sm">Cancel</button>
            </div>
          </motion.form>
        )}

        <div className="flex flex-col gap-2">
          {sessions.length === 0 && <p className="text-zinc-600 text-sm text-center py-6">No sessions yet.</p>}
          {sessions.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/6">
              <div>
                <p className="text-sm font-medium text-white">{s.title}</p>
                <p className="text-xs text-zinc-500">{format(new Date(s.start_time), 'dd MMM yyyy, HH:mm')} – {format(new Date(s.end_time), 'HH:mm')}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] text-zinc-600">Late: {formatCurrency(s.late_fine_amount)}</span>
                  <span className="text-[10px] text-zinc-600">Absent: {formatCurrency(s.absent_fine_amount)}</span>
                  <span className="text-[10px] text-zinc-600">±{s.radius_meters}m</span>
                </div>
              </div>
              <button onClick={() => handleDeleteSession(s.id)} className="btn-icon text-red-500/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 flex-shrink-0 ml-3">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* All Fines */}
      <div className="glass p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign size={14} className="text-zinc-400" /> All Corridor Fines
        </h3>
        {unpaidFines.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-4">No unpaid fines. Corridor is compliant 🎉</p>
        ) : (
          <div className="flex flex-col gap-2">
            {unpaidFines.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-white">{f.users?.full_name}</span>
                    <span className="text-xs text-zinc-500">Room {f.users?.room_number}</span>
                  </div>
                  <p className="text-xs text-zinc-500">{f.mandatory_sessions?.title || f.notes} • {f.reason}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <span className="text-red-400 font-bold font-mono text-sm">{formatCurrency(f.amount)}</span>
                  <button onClick={() => handleMarkPaid(f.id)} disabled={markingPaid === f.id} className="btn-ghost text-xs px-3 py-1.5">
                    {markingPaid === f.id ? <Loader2 size={12} className="animate-spin" /> : 'Mark Paid'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Management */}
      <div className="glass p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Users size={14} className="text-zinc-400" /> Corridor Members
        </h3>
        <div className="flex flex-col gap-2">
          {allUsers.map(u => (
            <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-xs font-bold text-white">
                  {u.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{u.full_name}</p>
                  <p className="text-xs text-zinc-500">Room {u.room_number} · {u.email}</p>
                </div>
              </div>
              <button
                onClick={() => handlePromoteUser(u.id, u.role)}
                className={`badge cursor-pointer hover:opacity-80 transition-opacity ${u.role === 'admin' ? 'badge-white' : 'text-zinc-600 bg-zinc-900 border border-zinc-800'}`}
              >
                {u.role}
              </button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
