import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  ScrollText, Search, Loader2, Filter, Calendar, User,
  Shield, Eye, Pencil, Trash2, Plus, ArrowUpDown
} from 'lucide-react';
import API from '../../utils/api';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (filterAction) params.set('action', filterAction);
      if (search) params.set('search', search);
      const res = await API.get(`/audit?${params}`);
      setLogs(res.data.logs || res.data || []);
      setTotalPages(res.data.totalPages || 1);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  }, [page, filterAction, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const fmt = (d) => d ? new Date(d).toLocaleString('en-US', { 
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }) : '—';

  const actionIcons = {
    CREATE: { icon: Plus, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    UPDATE: { icon: Pencil, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    DELETE: { icon: Trash2, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30' },
    LOGIN: { icon: Shield, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    VIEW: { icon: Eye, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg shadow-slate-500/25">
            <ScrollText size={20} className="text-white" />
          </div>
          Audit Logs
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">System-wide activity trail & change history</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search user or resource..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-slate-500 outline-none transition-all" />
        </div>
        <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-slate-500 outline-none">
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="LOGIN">Login</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-500" size={32} /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><ScrollText size={48} className="mx-auto mb-3 opacity-40" /><p className="font-semibold">No audit logs found</p></div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400 w-12">Type</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Action</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">User</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Resource</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Details</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.map((log, i) => {
                    const ai = actionIcons[log.action] || actionIcons.VIEW;
                    const ActionIcon = ai.icon;
                    return (
                      <motion.tr key={log._id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3">
                          <div className={`w-8 h-8 rounded-lg ${ai.bg} flex items-center justify-center`}>
                            <ActionIcon size={14} className={ai.color} />
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-semibold text-slate-800 dark:text-white">{log.action}</span>
                        </td>
                        <td className="px-5 py-3">
                          <div>
                            <p className="text-slate-700 dark:text-slate-300 font-medium">{log.performedBy?.name || log.userId || '—'}</p>
                            <p className="text-xs text-slate-400">{log.performedBy?.role || log.userRole || ''}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{log.resourceType || log.resource || '—'}</td>
                        <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">{log.description || log.details || '—'}</td>
                        <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmt(log.createdAt || log.timestamp)}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">Previous</button>
              <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
