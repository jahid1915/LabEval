import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarOff, CheckCircle, XCircle, Clock, Search, Loader2, 
  User, Calendar, MessageSquare, Filter
} from 'lucide-react';
import api from '../../api/axios';

export default function LeaveManagementPage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [processing, setProcessing] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/leaves');
      setLeaves(res.data.leaves || res.data || []);
    } catch { toast.error('Failed to load leave requests'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = leaves.filter(l => {
    const matchSearch = !search ||
      l.teacher?.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.reason?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleApprove = async (id) => {
    setProcessing(id);
    try {
      await api.put(`/leaves/${id}/approve`);
      toast.success('Leave approved');
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to approve'); }
    finally { setProcessing(null); }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setProcessing(rejectId);
    try {
      await api.put(`/leaves/${rejectId}/reject`, { adminRemarks: rejectReason });
      toast.success('Leave rejected');
      setRejectId(null);
      setRejectReason('');
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to reject'); }
    finally { setProcessing(null); }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  const statusConfig = {
    pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
    approved: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
    rejected: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' },
  };

  const pendingCount = leaves.filter(l => l.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <CalendarOff size={20} className="text-white" />
            </div>
            Leave Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review & manage teacher leave requests
            {pendingCount > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold">{pendingCount} pending</span>}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teacher or reason..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-orange-500 outline-none">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><CalendarOff size={48} className="mx-auto mb-3 opacity-40" /><p className="font-semibold">No leave requests</p></div>
      ) : (
        <div className="space-y-4">
          {filtered.map((l, i) => {
            const sc = statusConfig[l.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            return (
              <motion.div key={l._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 transition-all ${l.status === 'pending' ? 'border-amber-200 dark:border-amber-800 shadow-md shadow-amber-50 dark:shadow-amber-900/10' : 'border-slate-100 dark:border-slate-800'}`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {l.teacher?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">{l.teacher?.name || 'Unknown Teacher'}</p>
                        <p className="text-xs text-slate-400">{l.teacher?.teacherId || ''} • {l.teacher?.department || ''}</p>
                      </div>
                      <span className={`ml-auto px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${sc.bg}`}>
                        <StatusIcon size={12} /> {l.status?.charAt(0).toUpperCase() + l.status?.slice(1)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5"><Calendar size={13} /> {fmt(l.startDate)} — {fmt(l.endDate)}</div>
                      <div className="flex items-center gap-1.5"><Filter size={13} /> {l.leaveType || 'General'}</div>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">{l.reason || 'No reason provided'}</p>
                    {l.adminRemarks && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic flex items-center gap-1.5">
                        <MessageSquare size={12} /> Department Head: {l.adminRemarks}
                      </p>
                    )}
                  </div>
                  {l.status === 'pending' && (
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <button onClick={() => handleApprove(l._id)} disabled={processing === l._id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50">
                        {processing === l._id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Approve
                      </button>
                      <button onClick={() => { setRejectId(l._id); setRejectReason(''); }} disabled={processing === l._id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50">
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Reject Dialog */}
      <AnimatePresence>
        {rejectId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-3">Reject Leave Request</h3>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Reason for rejection (optional)..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none resize-none mb-4" />
              <div className="flex justify-end gap-3">
                <button onClick={() => setRejectId(null)} className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <button onClick={handleReject}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all">Reject</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
