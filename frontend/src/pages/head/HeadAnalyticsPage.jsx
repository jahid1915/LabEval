import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { TrendingUp, Users, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';

export default function HeadAnalyticsPage() {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const deptCode = user?.departmentCode || user?.department || 'ETE';

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/head/analytics');
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const seriesDist = data?.studentsBySeries || [];
  const statusDist = data?.studentsByStatus || [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Academic Analytics • {deptCode}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Department Academic Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Data insights, enrollment distribution, and academic demographics for {deptCode}.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Series Distribution Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Student Distribution by Series</span>
          </div>

          <div className="space-y-3">
            {seriesDist.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No series data available.</p>
            ) : (
              seriesDist.map((s) => (
                <div key={s._id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Series {s._id || 'Unknown'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {s.count} Students
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status Distribution Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Student Distribution by Status</span>
          </div>

          <div className="space-y-3">
            {statusDist.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No status data available.</p>
            ) : (
              statusDist.map((st) => (
                <div key={st._id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                    {st._id || 'Active'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {st.count} Records
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
