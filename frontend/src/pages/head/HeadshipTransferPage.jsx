import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  ArrowRightLeft, Users, Shield, Clock, CheckCircle2, XCircle,
  AlertCircle, Send, RefreshCw, FileText
} from 'lucide-react';

export default function HeadshipTransferPage() {
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [requests, setRequests] = useState([]);

  const [form, setForm] = useState({
    proposedHeadTeacherId: '',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const deptCode = user?.departmentCode || user?.department || 'ETE';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [teachRes, reqRes] = await Promise.all([
        api.get('/head/teachers'),
        api.get('/head/headship-transfer/status')
      ]);

      if (teachRes.data?.success) setTeachers(teachRes.data.teachers || []);
      if (reqRes.data?.success) setRequests(reqRes.data.requests || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load transfer requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.proposedHeadTeacherId || !form.reason.trim()) {
      toast.warning('Please select a successor and provide a reason');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/head/headship-transfer/request', form);
      if (res.data?.success) {
        toast.success('Headship transfer request submitted to Administrator for review!');
        setForm({ proposedHeadTeacherId: '', reason: '' });
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-purple-950/30 to-indigo-950/40 border border-purple-500/20 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
            {deptCode} Department
          </span>
          <span className="px-2.5 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full flex items-center gap-1">
            <Shield className="w-3 h-3" /> Admin Approval Required
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <ArrowRightLeft className="w-6 h-6 text-purple-400" />
          Department Headship Transfer Request
        </h1>
        <p className="text-sm text-slate-300 mt-1">
          Initiate a formal administrative handover of Department Head responsibilities to another eligible faculty member.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Request Form */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            Submit Handover Request
          </h3>
          <p className="text-xs text-slate-400">
            Per University rules, Headship transfer is subject to verification and approval by the System Administrator and Vice Chancellor's office.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Current Department Head
              </label>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-semibold flex items-center justify-between">
                <span>{user?.name || 'Current Head'}</span>
                <span className="text-xs text-purple-400 font-mono font-normal">Active</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Nominate Successor (Department Faculty)
              </label>
              <select
                value={form.proposedHeadTeacherId}
                onChange={(e) => setForm({ ...form, proposedHeadTeacherId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                required
              >
                <option value="">-- Choose Proposed Faculty Member --</option>
                {teachers.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.teacherId}) — {t.designation || 'Professor'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Reason / Administrative Justification
              </label>
              <textarea
                rows={4}
                placeholder="State the reason for handover (e.g. tenure completion, research leave, sabbatical)..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-900/30 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Handover Request'}
            </button>
          </form>
        </div>

        {/* Requests & History */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              Request Status & History
            </h3>
            <button
              onClick={fetchData}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="py-12 text-center text-slate-500 border border-slate-800/80 rounded-xl bg-slate-950/40">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                No handover requests submitted.
              </div>
            ) : (
              requests.map((r) => (
                <div key={r._id} className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                      r.status === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : r.status === 'rejected'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {r.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                      {r.status === 'rejected' && <XCircle className="w-3 h-3" />}
                      {r.status === 'pending' && <Clock className="w-3 h-3" />}
                      {r.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-white">
                    Proposed Successor: {r.proposedHeadName}
                  </p>
                  <p className="text-xs text-slate-400 italic">"{r.reason}"</p>
                  {r.adminNotes && (
                    <div className="mt-2 p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300">
                      <span className="font-semibold text-amber-400">Admin Response:</span> {r.adminNotes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
