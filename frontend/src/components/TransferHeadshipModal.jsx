import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, UserCheck, ArrowRight, KeyRound,
  FileCheck2, Calendar, AlertTriangle, X, CheckCircle2,
  Building2, Lock
} from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-toastify';

export default function TransferHeadshipModal({
  isOpen,
  onClose,
  teachers = [],
  currentDeptCode = 'ETE',
  currentAdminName = 'Head of Department',
  onSuccess
}) {
  const [successorTeacherId, setSuccessorTeacherId] = useState('');
  const [memoNumber, setMemoNumber] = useState('RUET/REG/EST/2026/0418');
  const [handoverDate, setHandoverDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('Official departmental leadership handover as per RUET Syndicate resolution.');
  const [password, setPassword] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const selectedTeacher = teachers.find(t => t.teacherId === successorTeacherId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!successorTeacherId) {
      return toast.warning('Please select a successor teacher from the department faculty.');
    }
    if (!password) {
      return toast.warning('Current administrator password is required for security verification.');
    }

    setLoading(true);
    try {
      const res = await api.post('/admin/transfer-headship', {
        successorTeacherId,
        memoNumber,
        handoverDate,
        remarks,
        password
      });

      toast.success(res.data.message || 'Department Head authority transferred successfully!');
      if (onSuccess) {
        onSuccess(res.data);
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to transfer department headship');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="bg-white dark:bg-slate-900 border border-amber-500/30 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 relative my-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <ShieldAlert size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[11px] font-bold">
                  {currentDeptCode} Head Succession
                </span>
                <span className="text-[11px] text-slate-400">Institutional Governance</span>
              </div>
              <h2 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white">
                Transfer Department Head Authority
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning / Explanation Banner */}
        <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs space-y-2 text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
            <AlertTriangle size={16} />
            Important: Shift of Academic & Course Assignment Authority
          </div>
          <p className="leading-relaxed">
            In accordance with RUET academic regulations, transferring the Department Headship shifts:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
            <li><strong>Course Assignment Powers:</strong> Exclusive right to allocate teachers to courses shifts immediately to the incoming Head.</li>
            <li><strong>Official Sign-off:</strong> The successor's name and signature will automatically appear on all official RUET grade sheets, course allocations, and PDF/Excel reports.</li>
            <li><strong>Historical Continuity:</strong> All past course offerings, grade books, and student results remain securely preserved with complete audit trails.</li>
            <li><strong>Outgoing Head Transition:</strong> You will transition back to Senior Professor/Faculty status with full teaching access.</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Select Successor Teacher */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
              1. Select Successor Teacher (Incoming Department Head) *
            </label>
            <select
              value={successorTeacherId}
              onChange={(e) => setSuccessorTeacherId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-xs"
            >
              <option value="">-- Choose faculty member from Dept. of {currentDeptCode} --</option>
              {teachers.map((t) => (
                <option key={t._id || t.teacherId} value={t.teacherId}>
                  {t.name} ({t.teacherId}) &mdash; {t.designation || 'Faculty Member'}
                </option>
              ))}
            </select>
          </div>

          {/* Successor Preview Card */}
          {selectedTeacher && (
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 flex items-center justify-between">
              <div>
                <div className="font-bold text-purple-900 dark:text-purple-200 text-xs">
                  {selectedTeacher.name}
                </div>
                <div className="text-[11px] text-purple-600 dark:text-purple-400 font-mono">
                  ID: {selectedTeacher.teacherId} &bull; {selectedTeacher.designation || 'Associate Professor'}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                Designated Head
              </span>
            </div>
          )}

          {/* RUET Office Order / Memo Number & Handover Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                2. RUET Office Order / Memo No. *
              </label>
              <input
                type="text"
                value={memoNumber}
                onChange={(e) => setMemoNumber(e.target.value)}
                placeholder="e.g. RUET/REG/EST/2026/0418"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                3. Effective Handover Date *
              </label>
              <input
                type="date"
                value={handoverDate}
                onChange={(e) => setHandoverDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>

          {/* Handover Directives / Remarks */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
              4. Handover Directives / Outgoing Head Remarks
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Handed over all departmental academic documents and teacher allocations."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          {/* Security Password Confirmation */}
          <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-1.5">
            <label className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
              <Lock size={13} />
              5. Enter Current Department Head Password to Authorize *
            </label>
            <p className="text-[11px] text-rose-600/80 dark:text-rose-400">
              This high-level administrative handover requires your active password.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your Department Head password"
              required
              className="w-full px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !successorTeacherId || !password}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <>
                  <UserCheck size={16} />
                  Authorize Official Head Handover
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
