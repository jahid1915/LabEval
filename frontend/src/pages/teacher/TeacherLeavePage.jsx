import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarOff, Plus, X, Loader2, CheckCircle, XCircle, Clock, Calendar
} from 'lucide-react';
import api from '../../api/axios';

const emptyForm = { startDate: '', endDate: '', leaveType: 'casual', reason: '' };

export default function TeacherLeavePage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/leaves/my');
      setLeaves(res.data.leaves || res.data || []);
    } catch { toast.error('Failed to load leaves'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/leaves', form);
      toast.success('Leave request submitted');
      setShowModal(false);
      setForm(emptyForm);
      fetchLeaves();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to submit'); }
    finally { setSaving(false); }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  const statusConfig = {
    pending: { icon: Clock, bg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
    approved: { icon: CheckCircle, bg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
    rejected: { icon: XCircle, bg: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <CalendarOff size={20} className="text-white" />
            </div>
            My Leave Requests
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Submit and track your leave applications</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <Plus size={18} /> New Request
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
      ) : leaves.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><CalendarOff size={48} className="mx-auto mb-3 opacity-40" /><p className="font-semibold">No leave requests yet</p></div>
      ) : (
        <div className="space-y-3">
          {leaves.map((l, i) => {
            const sc = statusConfig[l.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            return (
              <motion.div key={l._id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-slate-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">{fmt(l.startDate)} — {fmt(l.endDate)}</p>
                      <p className="text-xs text-slate-400 capitalize">{l.leaveType || 'General'} Leave</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shrink-0 ${sc.bg}`}>
                    <StatusIcon size={12} /> {l.status?.charAt(0).toUpperCase() + l.status?.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 pl-7">{l.reason}</p>
                {l.adminRemarks && <p className="text-xs text-slate-400 italic pl-7 mt-2">Department Head: {l.adminRemarks}</p>}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="font-heading font-bold text-lg text-slate-800 dark:text-white">New Leave Request</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Start Date *</label>
                    <input type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">End Date *</label>
                    <input type="date" required value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Leave Type</label>
                  <select value={form.leaveType} onChange={e => setForm({ ...form, leaveType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none">
                    <option value="casual">Casual</option>
                    <option value="sick">Sick</option>
                    <option value="earned">Earned</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Reason *</label>
                  <textarea required value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none resize-none" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white text-sm font-semibold shadow-lg shadow-orange-500/25 disabled:opacity-50 transition-all flex items-center gap-2">
                    {saving && <Loader2 size={16} className="animate-spin" />} Submit
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
