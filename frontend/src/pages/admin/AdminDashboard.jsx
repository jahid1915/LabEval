import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  Users, GraduationCap, Building2, Calendar, Database,
  Shield, UserPlus, Upload, History, ArrowRight, Activity,
  CheckCircle2, Clock, AlertCircle, RefreshCw, FileText,
  Layers, BookOpen, ExternalLink, Sparkles
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Skeleton from '../../components/common/Skeleton';

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: {
      totalUsers: 0,
      totalStudents: 0,
      totalTeachers: 0,
      totalDepartments: 0,
      totalFaculties: 0,
      totalSessions: 0,
      totalCourses: 0,
      totalEnrollments: 0,
      databaseHealth: 'Healthy'
    },
    recentLogs: [],
    recentImports: []
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/dashboard/summary');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load admin summary:', err);
      toast.error('Could not load system summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const summary = data.summary;

  return (
    <div className="space-y-6 pb-16">
      
      {/* ── HEADER & HEALTH ── */}
      <PageHeader
        title="System Control Center"
        subtitle="Universal university management, centralized database administration, and account governance."
        badge="System Administrator"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-[#243244] bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#172033] transition"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/admin/database')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition"
            >
              <Database size={13} />
              Database Portal
            </button>
          </div>
        }
      />

      {/* ── SYSTEM KPI OVERVIEW ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard
          label="Total Users"
          value={summary.totalUsers}
          icon={Shield}
          loading={loading}
          variant="primary"
          trend="Central Auth"
        />
        <StatCard
          label="Students"
          value={summary.totalStudents}
          icon={Users}
          loading={loading}
          trend="Enrolled"
        />
        <StatCard
          label="Teachers"
          value={summary.totalTeachers}
          icon={GraduationCap}
          loading={loading}
          trend="Faculty"
        />
        <StatCard
          label="Departments"
          value={summary.totalDepartments}
          icon={Building2}
          loading={loading}
          trend="All Faculties"
        />
        <StatCard
          label="Academic Sessions"
          value={summary.totalSessions}
          icon={Calendar}
          loading={loading}
          trend="Active"
        />
        <StatCard
          label="Course Master"
          value={summary.totalCourses}
          icon={BookOpen}
          loading={loading}
          trend="Catalog"
        />
      </div>

      {/* ── QUICK ACTIONS PANEL (Section 22) ── */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles size={16} className="text-blue-600 dark:text-blue-400" />
              Administrative Quick Actions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Direct access to system management and data operations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <button
            onClick={() => navigate('/admin/students')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-100 dark:border-[#243244] bg-slate-50/60 dark:bg-[#172033]/50 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-200 dark:hover:border-blue-800 transition text-center group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Users size={16} />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Manage Students</span>
            <span className="text-[10px] text-slate-400">Add & Edit</span>
          </button>

          <button
            onClick={() => navigate('/admin/teachers')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-100 dark:border-[#243244] bg-slate-50/60 dark:bg-[#172033]/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-200 dark:hover:border-emerald-800 transition text-center group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <GraduationCap size={16} />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Manage Teachers</span>
            <span className="text-[10px] text-slate-400">Appointments</span>
          </button>

          <button
            onClick={() => navigate('/admin/heads')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-100 dark:border-[#243244] bg-slate-50/60 dark:bg-[#172033]/50 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-200 dark:hover:border-amber-800 transition text-center group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Shield size={16} />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Dept Heads</span>
            <span className="text-[10px] text-slate-400">Headship Control</span>
          </button>

          <button
            onClick={() => navigate('/admin/import')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-100 dark:border-[#243244] bg-slate-50/60 dark:bg-[#172033]/50 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:border-purple-200 dark:hover:border-purple-800 transition text-center group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Upload size={16} />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Import Data</span>
            <span className="text-[10px] text-slate-400">XLSX / JSON</span>
          </button>

          <button
            onClick={() => navigate('/admin/database')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-100 dark:border-[#243244] bg-slate-50/60 dark:bg-[#172033]/50 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-200 dark:hover:border-blue-800 transition text-center group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Database size={16} />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Database Portal</span>
            <span className="text-[10px] text-slate-400">Manage Entities</span>
          </button>

          <button
            onClick={() => navigate('/admin/audit-logs')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-100 dark:border-[#243244] bg-slate-50/60 dark:bg-[#172033]/50 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 transition text-center group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <FileText size={16} />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">System Logs</span>
            <span className="text-[10px] text-slate-400">Audit Trail</span>
          </button>
        </div>
      </div>

      {/* ── TWO COLUMN MAIN PANEL: ACTIVITY & IMPORTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Activity (Audit Trail) */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Activity size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent System Activity</h3>
                  <p className="text-[11px] text-slate-500">Live audit log stream from MongoDB</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/admin/audit-logs')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View All <ArrowRight size={12} />
              </button>
            </div>

            <div className="space-y-2.5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-2.5 rounded-xl border border-slate-100 dark:border-[#243244] flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))
              ) : data.recentLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No recent audit events logged.
                </div>
              ) : (
                data.recentLogs.map((log) => (
                  <div
                    key={log._id}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-[#1e293b] bg-slate-50/50 dark:bg-[#172033]/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {log.userName || 'System'}
                        </span>
                        <StatusBadge
                          variant={log.action.includes('DELETE') ? 'danger' : log.action.includes('CREATE') ? 'success' : 'info'}
                          label={log.action}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {log.details || `Modified ${log.entity}`}
                      </p>
                    </div>

                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Imports History */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <History size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Data Imports</h3>
                  <p className="text-[11px] text-slate-500">XLSX and JSON dataset execution history</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/admin/import-history')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View History <ArrowRight size={12} />
              </button>
            </div>

            <div className="space-y-2.5">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-2.5 rounded-xl border border-slate-100 dark:border-[#243244] flex items-center justify-between">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))
              ) : data.recentImports.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No data import jobs recorded yet.
                </div>
              ) : (
                data.recentImports.map((job) => (
                  <div
                    key={job._id}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-[#1e293b] bg-slate-50/50 dark:bg-[#172033]/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {job.fileName || 'Data Upload'}
                        </span>
                        <StatusBadge
                          variant={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'danger' : 'neutral'}
                          label={job.status}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Target: <span className="font-mono">{job.targetEntity || 'Students'}</span> &bull; By: {job.performedByName || 'Admin'}
                      </p>
                    </div>

                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : '—'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
