import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  History, CheckCircle2, AlertCircle, Clock, Loader2,
  FileSpreadsheet, ChevronLeft, ChevronRight, Eye, RefreshCw,
  Upload, Users, Pencil, SkipForward
} from 'lucide-react';
import api from '../../api/axios';

const STATUS_CONFIG = {
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' },
  processing: { label: 'Processing', icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  pending: { label: 'Pending', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  failed: { label: 'Failed', icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800' },
  cancelled: { label: 'Cancelled', icon: AlertCircle, color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' }
};

const MODE_LABELS = {
  upsert: 'Upsert',
  add_new: 'Add New Only',
  update_existing: 'Update Existing',
  dry_run: 'Dry Run'
};

function ImportJobRow({ job, onView }) {
  const status = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const date = new Date(job.createdAt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-slate-400 shrink-0" />
          <div>
            <p className="font-semibold text-slate-800 dark:text-white text-sm truncate max-w-[180px]">{job.fileName}</p>
            <p className="text-xs text-slate-400 font-mono">{job.jobId}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">{job.adminName || '—'}</td>
      <td className="px-5 py-4">
        <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-full">
          {MODE_LABELS[job.importMode] || job.importMode}
        </span>
      </td>
      <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{date}</td>
      <td className="px-5 py-4">
        <div className="text-sm text-slate-600 dark:text-slate-400 space-y-0.5">
          {job.stats ? (
            <>
              <div className="flex gap-3 text-xs">
                <span className="text-emerald-600">+{job.stats.inserted} ins</span>
                <span className="text-blue-600">~{job.stats.updated} upd</span>
                <span className="text-slate-400">/{job.stats.skipped} skip</span>
                {job.stats.failed > 0 && <span className="text-rose-500">✗{job.stats.failed} fail</span>}
              </div>
              <p className="text-xs text-slate-400">{job.stats.totalRows} rows total</p>
            </>
          ) : '—'}
        </div>
      </td>
      <td className="px-5 py-4">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${status.bg} ${status.color}`}>
          <StatusIcon size={12} className={job.status === 'processing' ? 'animate-spin' : ''} />
          {status.label}
        </span>
      </td>
      <td className="px-5 py-4 text-right">
        <button onClick={() => onView(job.jobId)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100">
          <Eye size={16} />
        </button>
      </td>
    </motion.tr>
  );
}

function JobDetailModal({ jobId, onClose }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    api.get(`/import/history/${jobId}`)
      .then(res => setJob(res.data.data))
      .catch(() => toast.error('Failed to load job details'))
      .finally(() => setLoading(false));
  }, [jobId]);

  if (!jobId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
          <h2 className="font-bold text-slate-800 dark:text-white">Import Job Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            ✕
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
          ) : job ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Job ID</p>
                  <p className="font-mono text-sm text-slate-700 dark:text-slate-300">{job.jobId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">File</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{job.fileName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Admin</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{job.adminName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Mode</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{MODE_LABELS[job.importMode] || job.importMode}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Status</p>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${(STATUS_CONFIG[job.status] || STATUS_CONFIG.pending).bg} ${(STATUS_CONFIG[job.status] || STATUS_CONFIG.pending).color}`}>
                    {(STATUS_CONFIG[job.status] || STATUS_CONFIG.pending).label}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Date</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{new Date(job.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {job.stats && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Import Statistics</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Total Rows', value: job.stats.totalRows, color: 'text-slate-600' },
                      { label: 'Valid', value: job.stats.validRows, color: 'text-emerald-600' },
                      { label: 'Invalid', value: job.stats.invalidRows, color: 'text-rose-500' },
                      { label: 'Duplicates', value: job.stats.duplicateRows, color: 'text-amber-500' },
                      { label: 'Inserted', value: job.stats.inserted, color: 'text-emerald-600' },
                      { label: 'Updated', value: job.stats.updated, color: 'text-blue-600' },
                      { label: 'Skipped', value: job.stats.skipped, color: 'text-slate-400' },
                      { label: 'Failed', value: job.stats.failed, color: 'text-rose-500' }
                    ].map(s => (
                      <div key={s.label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {job.errors?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-rose-600 mb-2">Row Errors ({job.errors.length})</p>
                  <div className="max-h-48 overflow-y-auto bg-slate-50 dark:bg-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-700">
                    {job.errors.map((err, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                        <span className="text-xs font-mono bg-white dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded shrink-0 mt-0.5">Row {err.row}</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400">{err.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {job.errorMessage && (
                <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl p-4">
                  <p className="text-sm text-rose-600 dark:text-rose-400">{job.errorMessage}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">Job not found</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function ImportHistoryPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [viewJobId, setViewJobId] = useState(null);

  const fetchHistory = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/import/history?page=${page}&limit=20`);
      setJobs(res.data.data || []);
      setPagination(res.data.pagination || {});
    } catch {
      toast.error('Failed to load import history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(1); }, [fetchHistory]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <History size={20} className="text-white" />
            </div>
            Import History
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track all student XLSX import jobs</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchHistory(pagination.page)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <RefreshCw size={15} /> Refresh
          </button>
          <button onClick={() => navigate('/admin/import')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-lg hover:-translate-y-0.5 transition-all">
            <Upload size={16} /> New Import
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20">
          <History size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-400 font-semibold">No import jobs yet</p>
          <button onClick={() => navigate('/admin/import')}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-lg hover:-translate-y-0.5 transition-all">
            <Upload size={16} /> Start First Import
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">File</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Admin</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Mode</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Date</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Result</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {jobs.map(job => (
                    <ImportJobRow key={job._id} job={job} onView={setViewJobId} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} imports
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchHistory(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 px-3">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchHistory(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Job Detail Modal */}
      {viewJobId && <JobDetailModal jobId={viewJobId} onClose={() => setViewJobId(null)} />}
    </div>
  );
}
