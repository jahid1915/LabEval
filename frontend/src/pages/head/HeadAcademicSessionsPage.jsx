import { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  Calendar, Users, ArrowRight, RefreshCw, Search,
  Upload, Layers, CheckCircle2, Clock
} from 'lucide-react';

export default function HeadAcademicSessionsPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState('');

  const deptCode = user?.departmentCode || user?.department || 'ETE';

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/head/academic-sessions');
      if (res.data?.success) {
        setSessions(res.data.sessions || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load academic sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const filteredSessions = sessions.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.seriesList && s.seriesList.some(sr => String(sr.series).includes(search)))
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Academic Sessions • Dept. {deptCode}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Academic Sessions & Series Batches
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor student enrollment distribution across academic sessions for {deptCode}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSessions}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/head/import"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Import Students</span>
          </Link>
        </div>
      </div>

      {/* ── Search Bar ────────────────────────────────────────────────── */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter by academic session (e.g. 2022-23) or series..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* ── Sessions Cards Grid ───────────────────────────────────────── */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          Loading academic sessions...
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No academic sessions found</p>
          <p className="text-xs text-slate-400">Import student data to see academic sessions populated.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSessions.map((session) => (
            <div
              key={session.name}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-5 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {session.name}
                    </h3>
                    <p className="text-[11px] text-slate-400">Department: {deptCode}</p>
                  </div>
                  {session.isCurrent && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Current Session
                    </span>
                  )}
                </div>

                {/* Series Breakdown */}
                {session.seriesList && session.seriesList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {session.seriesList.map((sr) => (
                      <span
                        key={sr.series}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        Series {sr.series}: <b>{sr.count}</b>
                      </span>
                    ))}
                  </div>
                )}

                {/* Stat Box */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">STUDENTS</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                      {session.totalStudents}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-emerald-600 uppercase">ACTIVE</p>
                    <p className="text-xl font-black text-emerald-600 mt-0.5">
                      {session.activeStudents}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">INACTIVE</p>
                    <p className="text-xl font-black text-slate-400 mt-0.5">
                      {session.inactiveStudents}
                    </p>
                  </div>
                </div>
              </div>

              <Link
                to={`/head/academic-sessions/${encodeURIComponent(session.name)}`}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>View Students Roster</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
