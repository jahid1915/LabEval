import { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  Calendar, Users, ArrowLeft, Search, RefreshCw,
  Filter, CheckCircle2, XCircle, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function HeadSessionDetailPage() {
  const { sessionId } = useParams();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [students, setStudents] = useState([]);
  const [seriesFilter, setSeriesFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  const deptCode = user?.departmentCode || user?.department || 'ETE';

  const fetchSessionStudents = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum,
        limit: 50,
        ...(seriesFilter && { series: seriesFilter }),
        ...(semesterFilter && { semester: semesterFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(search.trim() && { search: search.trim() })
      });

      const res = await api.get(`/head/academic-sessions/${encodeURIComponent(sessionId)}/students?${params}`);
      if (res.data?.success) {
        setData(res.data);
        setStudents(res.data.students || []);
        setPagination(res.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load session students');
    } finally {
      setLoading(false);
    }
  }, [sessionId, seriesFilter, semesterFilter, statusFilter, search]);

  useEffect(() => {
    fetchSessionStudents(1);
  }, [fetchSessionStudents]);

  const seriesStats = data?.seriesStats || [];
  const sessionName = data?.sessionName || sessionId;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Top Bar ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/head/academic-sessions"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Sessions</span>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Academic Session: {sessionName}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Dept. {deptCode}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real student records belonging to {deptCode} department enrolled in session {sessionName}.
          </p>
        </div>

        <button
          onClick={() => fetchSessionStudents(page)}
          disabled={loading}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── KPI Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400">TOTAL STUDENTS</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {pagination.total}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400">DEPARTMENT</p>
          <p className="text-xl font-bold text-indigo-600 mt-1">{deptCode}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400">SERIES BREAKDOWN</p>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2">
            {seriesStats.map(s => `Series ${s._id}: ${s.count}`).join(', ') || 'N/A'}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400">SESSION STATUS</p>
          <p className="text-xs font-bold text-emerald-600 mt-2">Active in DB</p>
        </div>
      </div>

      {/* ── Filter & Search Bar ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student by name, roll, reg..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Series Filter */}
          <select
            value={seriesFilter}
            onChange={(e) => setSeriesFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold"
          >
            <option value="">All Series</option>
            {seriesStats.map(s => (
              <option key={s._id} value={s._id}>Series {s._id}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="graduated">Graduated</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* ── Table Roster ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Student ID (Roll)</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Registration</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Series</th>
                <th className="px-4 py-3">Semester</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center text-slate-400 font-sans">
                    Loading roster...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center text-slate-400 font-sans">
                    No students match the current filters.
                  </td>
                </tr>
              ) : (
                students.map((student, idx) => (
                  <tr key={student._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-sans font-medium">
                      {(pagination.page - 1) * pagination.limit + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">
                      {student.rollNumber}
                    </td>
                    <td className="px-4 py-3 font-sans font-bold text-slate-800 dark:text-slate-100">
                      {student.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {student.registrationNumber || '—'}
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-700 dark:text-slate-300">
                      {student.department}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-bold">
                      {student.series}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-sans">
                      {student.semester || '1st Semester'}
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        student.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {student.status === 'active' && <CheckCircle2 className="w-3 h-3" />}
                        <span className="uppercase">{student.status || 'ACTIVE'}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {students.length} of {pagination.total} students
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchSessionStudents(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <span>Page {pagination.page} of {pagination.totalPages}</span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchSessionStudents(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
