'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Plus, Trash2, Users, DollarSign, Calendar, Loader2, RefreshCw, Clock, Edit2, Search, AlertCircle, CheckCircle, Tag, X } from 'lucide-react';
import { supabase, MandatorySession, AppUser, StudyLog } from '@/lib/supabase';
import { formatCurrency, MODULES } from '@/lib/utils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface AdminPanelProps {
  onRefresh: () => void;
  currentAdminId?: string;
}

// Generate next 60 days for date dropdown
const generateDateOptions = () => {
  const options = [];
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = format(d, 'yyyy-MM-dd');
    let label = format(d, 'EEE, dd MMM yyyy');
    if (i === 0) label = `Today (${format(d, 'EEE, dd MMM')})`;
    else if (i === 1) label = `Tomorrow (${format(d, 'EEE, dd MMM')})`;
    options.push({ value: dateStr, label });
  }
  return options;
};

// Generate 24-hour time options in 15-minute intervals (00:00 to 23:45)
const TIME_OPTIONS_24H: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hh = h.toString().padStart(2, '0');
    const mm = m.toString().padStart(2, '0');
    TIME_OPTIONS_24H.push(`${hh}:${mm}`);
  }
}

export default function AdminPanel({ onRefresh, currentAdminId }: AdminPanelProps) {
  const [sessions, setSessions] = useState<MandatorySession[]>([]);
  const [allFines, setAllFines] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [allLogs, setAllLogs] = useState<StudyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  // Time editing modal states
  const [editingLog, setEditingLog] = useState<StudyLog | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('18:00');
  const [editEndDate, setEditEndDate] = useState('');
  const [editEndTime, setEditEndTime] = useState('20:00');
  const [editModule, setEditModule] = useState(MODULES[0]);
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [searchLogQuery, setSearchLogQuery] = useState('');
  const [filterRunaways, setFilterRunaways] = useState(false);

  const dateOptions = useMemo(() => generateDateOptions(), []);

  // Dropdown states for Date & 24h Times
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');

  const [form, setForm] = useState({
    title: '',
    description: '',
    grace_period_mins: 5,
    lat: -25.7545,
    lng: 28.2314,
    radius_meters: 100,
    late_fine_amount: 5,
    absent_fine_amount: 20,
  });

  const loadAll = async () => {
    setLoading(true);
    const [sessRes, finesRes, usersRes, logsRes] = await Promise.all([
      supabase.from('mandatory_sessions').select('*').order('start_time', { ascending: false }),
      supabase.from('fines_ledger').select('*, users(full_name, room_number), mandatory_sessions(title)').order('created_at', { ascending: false }),
      supabase.from('users').select('*').order('full_name'),
      supabase.from('study_logs').select('*, users(full_name, room_number)').order('created_at', { ascending: false }).limit(80),
    ]);
    if (sessRes.data) setSessions(sessRes.data);
    if (finesRes.data) setAllFines(finesRes.data);
    if (usersRes.data) setAllUsers(usersRes.data);
    if (logsRes.data) setAllLogs(logsRes.data as StudyLog[]);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Please enter a session title');
      return;
    }

    setCreating(true);

    try {
      const [sYear, sMonth, sDay] = selectedDate.split('-').map(Number);
      const [sHour, sMinute] = startTime.split(':').map(Number);
      const startDate = new Date(sYear, sMonth - 1, sDay, sHour, sMinute, 0, 0);

      const [eHour, eMinute] = endTime.split(':').map(Number);
      let endDate = new Date(sYear, sMonth - 1, sDay, eHour, eMinute, 0, 0);

      if (endDate <= startDate) {
        endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        grace_period_mins: Number(form.grace_period_mins),
        lat: Number(form.lat),
        lng: Number(form.lng),
        radius_meters: Number(form.radius_meters),
        late_fine_amount: Number(form.late_fine_amount),
        absent_fine_amount: Number(form.absent_fine_amount),
      };

      const { error } = await supabase.from('mandatory_sessions').insert(payload);
      if (error) {
        toast.error('Failed to create session: ' + error.message);
      } else {
        toast.success('Mandatory session created!');

        // Dispatch automated email notification
        try {
          const notifyRes = await fetch('/api/notify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const notifyData = await notifyRes.json();
          if (notifyData.notConfigured) {
            toast('Session scheduled! (Add email credentials in Vercel to activate automated emails)', { icon: '📧' });
          } else if (notifyData.success) {
            toast.success(`📧 Email alerts sent to ${notifyData.recipientCount} corridor member(s)!`);
          } else if (notifyData.error) {
            toast.error('Email alert notice: ' + notifyData.error);
          }
        } catch (err: any) {
          console.error('Failed to trigger email notification:', err);
        }

        setShowCreateForm(false);
        setForm({
          title: '',
          description: '',
          grace_period_mins: 5,
          lat: -25.7545,
          lng: 28.2314,
          radius_meters: 100,
          late_fine_amount: 5,
          absent_fine_amount: 20,
        });
        setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
        setStartTime('18:00');
        setEndTime('20:00');
        loadAll();
        onRefresh();
      }
    } catch (err: any) {
      toast.error('Error creating session: ' + (err.message || 'Check inputs'));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Delete this session? Related fines will be unlinked.')) return;
    await supabase.from('mandatory_sessions').delete().eq('id', id);
    toast.success('Session deleted');
    loadAll();
    onRefresh();
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

  // Open Edit Modal for a student's study log
  const openEditModal = (log: StudyLog) => {
    setEditingLog(log);
    const start = new Date(log.start_time);
    const end = log.end_time ? new Date(log.end_time) : new Date(start.getTime() + 60 * 60 * 1000);

    setEditStartDate(format(start, 'yyyy-MM-dd'));
    setEditStartTime(format(start, 'HH:mm'));
    setEditEndDate(format(end, 'yyyy-MM-dd'));
    setEditEndTime(format(end, 'HH:mm'));
    setEditModule(log.module_code || MODULES[0]);
    setEditDescription(log.description || '');
  };

  // Quick 1-click duration cap buttons (e.g. Cap to 1h, 2h, 3h, 4h)
  const handleCapDuration = (hours: number) => {
    try {
      const [sYear, sMonth, sDay] = editStartDate.split('-').map(Number);
      const [sHour, sMinute] = editStartTime.split(':').map(Number);
      const start = new Date(sYear, sMonth - 1, sDay, sHour, sMinute, 0, 0);
      const end = new Date(start.getTime() + hours * 3600 * 1000);

      setEditEndDate(format(end, 'yyyy-MM-dd'));
      setEditEndTime(format(end, 'HH:mm'));
      toast.success(`Capped to exactly ${hours} hour${hours > 1 ? 's' : ''}`);
    } catch {}
  };

  // Save changes to student's study log
  const handleSaveEditLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    setSavingEdit(true);

    try {
      const [sYear, sMonth, sDay] = editStartDate.split('-').map(Number);
      const [sHour, sMinute] = editStartTime.split(':').map(Number);
      const startDate = new Date(sYear, sMonth - 1, sDay, sHour, sMinute, 0, 0);

      const [eYear, eMonth, eDay] = editEndDate.split('-').map(Number);
      const [eHour, eMinute] = editEndTime.split(':').map(Number);
      const endDate = new Date(eYear, eMonth - 1, eDay, eHour, eMinute, 0, 0);

      if (endDate <= startDate) {
        toast.error('End time must be after start time.');
        setSavingEdit(false);
        return;
      }

      const res = await fetch('/api/admin/study-logs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId: editingLog.id,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          module_code: editModule,
          description: editDescription,
          adminUserId: currentAdminId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update study log');
      }

      toast.success('Study session time updated successfully!');
      setEditingLog(null);
      loadAll();
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error updating log');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete a study log
  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this study session record?')) return;
    try {
      const res = await fetch('/api/admin/study-logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, adminUserId: currentAdminId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      toast.success('Study session deleted');
      loadAll();
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting log');
    }
  };

  // Filtered resident study logs
  const filteredLogs = allLogs.filter(log => {
    const studentName = log.users?.full_name?.toLowerCase() || '';
    const room = log.users?.room_number?.toLowerCase() || '';
    const module = log.module_code?.toLowerCase() || '';
    const desc = log.description?.toLowerCase() || '';
    const q = searchLogQuery.toLowerCase();

    const matchesQuery = !q || studentName.includes(q) || room.includes(q) || module.includes(q) || desc.includes(q);
    const duration = log.duration_minutes || 0;
    const isRunaway = duration >= 360; // 6+ hours

    if (filterRunaways) {
      return matchesQuery && isRunaway;
    }
    return matchesQuery;
  });

  const unpaidFines = allFines.filter(f => f.status === 'unpaid');
  const totalCollected = allFines.filter(f => f.status === 'paid').reduce((a, f) => a + f.amount, 0);
  const totalOutstanding = unpaidFines.reduce((a, f) => a + f.amount, 0);
  const runawayCount = allLogs.filter(l => (l.duration_minutes || 0) >= 360).length;

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

      {/* SECTION 1: Resident Study Sessions & Time Editor */}
      <div className="glass p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock size={15} className="text-zinc-400" /> Resident Study Sessions (Time Editor)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Edit start/end times for residents who forgot to clock out, or cap runaway 24h timers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {runawayCount > 0 && (
              <button
                onClick={() => setFilterRunaways(!filterRunaways)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
                  filterRunaways
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-zinc-900 text-amber-400 border-amber-500/20 hover:bg-amber-500/10'
                }`}
              >
                <AlertCircle size={12} /> {runawayCount} Runaway (&gt;6h)
              </button>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={searchLogQuery}
            onChange={e => setSearchLogQuery(e.target.value)}
            placeholder="Search by student name, room number, or module..."
            className="input text-xs pl-9 py-2"
          />
        </div>

        {/* Logs List */}
        <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
          {filteredLogs.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-6">No study sessions found matching criteria.</p>
          ) : (
            filteredLogs.map(log => {
              const durationMins = log.duration_minutes || 0;
              const hours = Math.floor(durationMins / 60);
              const mins = durationMins % 60;
              const isRunaway = durationMins >= 360;

              return (
                <div
                  key={log.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    isRunaway
                      ? 'bg-amber-500/8 border-amber-500/25'
                      : 'bg-white/3 border-white/6 hover:bg-white/5'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white truncate">
                        {log.users?.full_name || 'Corridor Member'}
                      </span>
                      {log.users?.room_number && (
                        <span className="text-[10px] text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 font-mono">
                          Room {log.users.room_number}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-300 font-bold bg-zinc-800 px-1.5 py-0.5 rounded">
                        {log.module_code}
                      </span>
                      {isRunaway && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-400/15 border border-amber-400/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <AlertCircle size={9} /> Runaway (&gt;6h)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                      <span>{format(new Date(log.start_time), 'dd MMM yyyy, HH:mm')} → {log.end_time ? format(new Date(log.end_time), 'HH:mm') : 'Active'}</span>
                      <span className="font-mono font-bold text-white">
                        {hours > 0 ? `${hours}h ` : ''}{mins}m
                      </span>
                      {log.description && (
                        <span className="text-zinc-500 truncate max-w-[200px]">“{log.description}”</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(log)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Edit2 size={12} /> Edit Time
                    </button>
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="btn-icon text-red-400/70 hover:text-red-400 hover:bg-red-500/15"
                      title="Delete log"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SECTION 2: Create Mandatory Session */}
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
                <input
                  required
                  className="input text-sm"
                  placeholder="Monday Study Block"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Description</label>
                <input
                  className="input text-sm"
                  placeholder="Optional description"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>

            {/* Date & 24h Time Dropdown Pickers */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-3">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Clock size={13} className="text-zinc-400" /> Date & Schedule (24-Hour Format)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Date Dropdown */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Session Date *</label>
                  <select
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="select text-sm w-full"
                  >
                    {dateOptions.map(d => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Time (24h) */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Start Time (24h) *</label>
                  <select
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="select text-sm w-full font-mono"
                  >
                    {TIME_OPTIONS_24H.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* End Time (24h) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-zinc-400 block">End Time (24h) *</label>
                    {endTime <= startTime && (
                      <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded font-mono">
                        +1 day (overnight)
                      </span>
                    )}
                  </div>
                  <select
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="select text-sm w-full font-mono"
                  >
                    {TIME_OPTIONS_24H.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Session Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Grace Period (mins)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  className="input text-sm"
                  value={form.grace_period_mins}
                  onChange={e => setForm(p => ({ ...p, grace_period_mins: +e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Geofence Radius (m)</label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  className="input text-sm"
                  value={form.radius_meters}
                  onChange={e => setForm(p => ({ ...p, radius_meters: +e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Target Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="input text-sm"
                  value={form.lat}
                  onChange={e => setForm(p => ({ ...p, lat: +e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Target Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="input text-sm"
                  value={form.lng}
                  onChange={e => setForm(p => ({ ...p, lng: +e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Late Fine (R)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="input text-sm"
                  value={form.late_fine_amount}
                  onChange={e => setForm(p => ({ ...p, late_fine_amount: +e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Absence Fine (R)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="input text-sm"
                  value={form.absent_fine_amount}
                  onChange={e => setForm(p => ({ ...p, absent_fine_amount: +e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
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
                <p className="text-xs text-zinc-500">{format(new Date(s.start_time), 'EEE, dd MMM yyyy, HH:mm')} – {format(new Date(s.end_time), 'HH:mm')}</p>
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

      {/* SECTION 3: All Corridor Fines */}
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

      {/* SECTION 4: User Management */}
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

      {/* MODAL: Edit Resident Study Time */}
      <AnimatePresence>
        {editingLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass p-6 w-full max-w-lg border border-white/20 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Edit2 size={16} className="text-zinc-400" /> Edit Resident Study Time
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {editingLog.users?.full_name} (Room {editingLog.users?.room_number})
                  </p>
                </div>
                <button
                  onClick={() => setEditingLog(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Quick 1-Click Cap Presets */}
              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-xs font-semibold text-zinc-300 block mb-2">
                  ⚡ 1-Click Runaway Cap Presets (Fix Forgetful Clock-Outs):
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleCapDuration(h)}
                      className="py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-white/10 hover:border-white/30 transition-all text-center"
                    >
                      Cap {h}h
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSaveEditLog} className="flex flex-col gap-4">
                {/* Start Time Section */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block font-semibold">Start Time (24h)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={editStartDate}
                      onChange={e => setEditStartDate(e.target.value)}
                      className="select text-xs"
                    >
                      {dateOptions.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                    <select
                      value={editStartTime}
                      onChange={e => setEditStartTime(e.target.value)}
                      className="select text-xs font-mono"
                    >
                      {TIME_OPTIONS_24H.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* End Time Section */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block font-semibold">End Time (24h)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={editEndDate}
                      onChange={e => setEditEndDate(e.target.value)}
                      className="select text-xs"
                    >
                      {dateOptions.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                    <select
                      value={editEndTime}
                      onChange={e => setEditEndTime(e.target.value)}
                      className="select text-xs font-mono"
                    >
                      {TIME_OPTIONS_24H.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Module & Description */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Module</label>
                    <select
                      value={editModule}
                      onChange={e => setEditModule(e.target.value)}
                      className="select text-xs"
                    >
                      {MODULES.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Description</label>
                    <input
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      placeholder="Notes…"
                      className="input text-xs"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditingLog(null)}
                    className="btn-ghost text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="btn-primary text-xs px-4 py-2"
                  >
                    {savingEdit ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
