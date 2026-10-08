import { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  Users, GraduationCap, BookOpen, Calendar,
  TrendingUp, Upload, Sparkles, ChevronRight,
  RefreshCw, CheckCircle2, Shield, Layers, Award,
  Clock, ArrowRight, Building2, UserCheck, Search,
  Briefcase, Activity
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { StatCardSkeleton } from '../../components/common/Skeleton';

export default function HeadDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [myAcademic, setMyAcademic] = useState(null);

  const deptCode = (user?.departmentCode || user?.department || 'ETE').toUpperCase();
  const deptName = user?.departmentName || (deptCode === 'ETE' ? 'Electronics & Telecommunication Engineering' : `${deptCode} Department`);
  const facultyName = user?.facultyName || user?.faculty || 'Faculty of Electrical & Computer Engineering';

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, myAcadRes] = await Promise.all([
        api.get('/head/stats'),
        api.get('/head/my-academic')
      ]);

      if (statsRes.data?.success) setData(statsRes.data);
      if (myAcadRes.data?.success) setMyAcademic(myAcadRes.data);
    } catch (err) {
      console.error('Failed to load department dashboard:', err);
      toast.error(err.response?.data?.message || 'Failed to load department metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const stats = data?.stats || {
    totalStudents: 0,
    activeStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    totalSeries: 0,
    academicSessionsCount: 0
  };

  const academicSessions = data?.academicSessions || [];

  return (
    <div className="space-y-7 pb-12 font-sans">
      {/* ── Page Header (Section 9 & 18) ────────────────────────── */}
      <PageHeader
        badge={`Department Head Workspace • Dept. of ${deptCode}`}
        badgeIcon={Shield}
        title={`Department of ${deptName}`}
        subtitle={`${facultyName} • Rajshahi University of Engineering & Technology`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="btn-secondary-academic"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              to="/head/import"
              className="btn-primary-academic"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Students</span>
            </Link>
          </div>
        }
      />

      {/* ── KPI Stat Cards (Section 10 & 18) ────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Department Students"
              value={stats.totalStudents}
              subtitle={`${stats.activeStudents} active learners`}
              icon={Users}
              accent="emerald"
              onClick={() => navigate('/head/students')}
            />
            <StatCard
              title="Faculty Teachers"
              value={stats.totalTeachers}
              subtitle="Full-time academic instructors"
              icon={GraduationCap}
              accent="blue"
              onClick={() => navigate('/head/teachers')}
            />
            <StatCard
              title="Catalog Courses"
              value={stats.totalCourses}
              subtitle="Theory & Sessional master courses"
              icon={BookOpen}
              accent="amber"
              onClick={() => navigate('/head/courses')}
            />
            <StatCard
              title="Academic Sessions"
              value={stats.academicSessionsCount || academicSessions.length}
              subtitle="Active cohort batches"
              icon={Calendar}
              accent="indigo"
              onClick={() => navigate('/head/academic-sessions')}
            />
          </>
        )}
      </div>

      {/* ── Academic Sessions & Cohorts (Section 18) ────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-text-primary dark:text-text-primary flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Academic Sessions & Cohort Rosters</span>
            </h2>
            <p className="text-xs text-text-muted dark:text-text-muted">
              Database student rosters categorized by Academic Session and Series.
            </p>
          </div>
          <Link
            to="/head/academic-sessions"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>View All Sessions</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {academicSessions.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No academic sessions populated"
            description="Import student rosters to automatically categorize sessions and cohorts for your department."
            action={
              <Link to="/head/import" className="btn-primary-academic">
                <Upload size={14} />
                <span>Import Student Roster</span>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {academicSessions.slice(0, 6).map((session, idx) => {
              const primarySeries = session.series && session.series.length > 0 ? session.series[0].series : 'N/A';

              return (
                <div
                  key={session.sessionName || idx}
                  className="bg-surface dark:bg-surface border border-border dark:border-border rounded-xl p-5 hover:border-border-strong dark:hover:border-border-strong transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-text-primary dark:text-text-primary">
                        {session.sessionName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-primary-soft dark:bg-primary-soft text-primary dark:text-primary border border-blue-200/50 dark:border-blue-900/50">
                        Series {primarySeries}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-secondary dark:bg-surface-secondary border border-border dark:border-border grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] font-semibold text-text-muted dark:text-text-muted uppercase">Total</p>
                        <p className="text-base font-extrabold text-text-primary dark:text-text-primary mt-0.5 font-mono">
                          {session.totalStudents}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Active</p>
                        <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                          {session.activeStudents}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-text-muted dark:text-text-muted uppercase">Inactive</p>
                        <p className="text-base font-extrabold text-text-muted dark:text-text-muted mt-0.5 font-mono">
                          {session.inactiveStudents}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/head/academic-sessions/${encodeURIComponent(session.sessionName)}`}
                    className="mt-4 w-full py-2 px-3 rounded-lg text-xs font-semibold bg-surface hover:bg-surface-secondary dark:bg-surface-secondary dark:hover:bg-surface text-text-primary dark:text-text-primary border border-border dark:border-border flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>View Student Roster</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── My Personal Teaching & Supervision (Section 18 Dual-Mode) ── */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-text-primary dark:text-text-primary flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-500" />
              <span>My Teaching & Student Supervision</span>
            </h2>
            <p className="text-xs text-text-muted dark:text-text-muted">
              Your personal academic courses and project groups in Teacher capability.
            </p>
          </div>
          <Link
            to="/head/teaching-assignments"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>Manage Allocations</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-surface dark:bg-surface border border-border dark:border-border rounded-xl p-4">
            <p className="text-[11px] font-semibold text-text-muted dark:text-text-muted uppercase">Courses I Teach</p>
            <p className="text-2xl font-black text-primary dark:text-primary mt-1 font-mono">
              {myAcademic?.stats?.assignedCoursesCount || 0}
            </p>
          </div>
          <div className="bg-surface dark:bg-surface border border-border dark:border-border rounded-xl p-4">
            <p className="text-[11px] font-semibold text-text-muted dark:text-text-muted uppercase">Project Students</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {myAcademic?.stats?.projectStudentsCount || 0}
            </p>
          </div>
          <div className="bg-surface dark:bg-surface border border-border dark:border-border rounded-xl p-4">
            <p className="text-[11px] font-semibold text-text-muted dark:text-text-muted uppercase">Seminar Students</p>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">
              {myAcademic?.stats?.seminarStudentsCount || 0}
            </p>
          </div>
          <div className="bg-surface dark:bg-surface border border-border dark:border-border rounded-xl p-4">
            <p className="text-[11px] font-semibold text-text-muted dark:text-text-muted uppercase">Thesis Students</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
              {myAcademic?.stats?.thesisStudentsCount || 0}
            </p>
          </div>
        </div>

        {myAcademic?.courses && myAcademic.courses.length > 0 && (
          <div className="bg-surface dark:bg-surface border border-border dark:border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-surface-secondary dark:bg-surface-secondary border-b border-border dark:border-border font-bold text-xs text-text-primary dark:text-text-primary">
              Active Courses Assigned to Me
            </div>
            <div className="divide-y divide-border dark:divide-border text-xs">
              {myAcademic.courses.map((c) => (
                <div key={c._id} className="p-3.5 flex items-center justify-between hover:bg-surface-hover dark:hover:bg-surface-hover transition-colors">
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-primary dark:text-primary mr-2">{c.courseCode}</span>
                    <span className="font-medium text-text-primary dark:text-text-primary">{c.courseName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] bg-surface-secondary dark:bg-surface-secondary text-text-secondary dark:text-text-secondary border border-border dark:border-border">
                      {c.academicSession} • {c.semester}
                    </span>
                    <StatusBadge status="ACTIVE" label={c.role || 'Primary'} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Department Operations Grid ─────────────────────────── */}
      <div className="space-y-4 pt-2">
        <h2 className="text-base sm:text-lg font-bold text-text-primary dark:text-text-primary">
          Academic Management & Operations
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            to="/head/students"
            className="p-4 rounded-xl bg-surface dark:bg-surface border border-border dark:border-border hover:border-primary dark:hover:border-primary transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5">
              <Users size={16} />
            </div>
            <h3 className="text-xs font-bold text-text-primary dark:text-text-primary group-hover:text-primary transition-colors">
              Students Roster
            </h3>
            <p className="text-[11px] text-text-muted dark:text-text-muted mt-0.5">Filter by Series</p>
          </Link>

          <Link
            to="/head/teachers"
            className="p-4 rounded-xl bg-surface dark:bg-surface border border-border dark:border-border hover:border-primary dark:hover:border-primary transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5">
              <GraduationCap size={16} />
            </div>
            <h3 className="text-xs font-bold text-text-primary dark:text-text-primary group-hover:text-primary transition-colors">
              Faculty Workload
            </h3>
            <p className="text-[11px] text-text-muted dark:text-text-muted mt-0.5">Teacher Allocation</p>
          </Link>

          <Link
            to="/head/courses"
            className="p-4 rounded-xl bg-surface dark:bg-surface border border-border dark:border-border hover:border-primary dark:hover:border-primary transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5">
              <BookOpen size={16} />
            </div>
            <h3 className="text-xs font-bold text-text-primary dark:text-text-primary group-hover:text-primary transition-colors">
              Course Offerings
            </h3>
            <p className="text-[11px] text-text-muted dark:text-text-muted mt-0.5">Cohort Assignment</p>
          </Link>

          <Link
            to="/head/supervision"
            className="p-4 rounded-xl bg-surface dark:bg-surface border border-border dark:border-border hover:border-primary dark:hover:border-primary transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2.5">
              <Layers size={16} />
            </div>
            <h3 className="text-xs font-bold text-text-primary dark:text-text-primary group-hover:text-primary transition-colors">
              Project Teams
            </h3>
            <p className="text-[11px] text-text-muted dark:text-text-muted mt-0.5">Thesis Supervision</p>
          </Link>

          <Link
            to="/head/electives"
            className="p-4 rounded-xl bg-surface dark:bg-surface border border-border dark:border-border hover:border-primary dark:hover:border-primary transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2.5">
              <Sparkles size={16} />
            </div>
            <h3 className="text-xs font-bold text-text-primary dark:text-text-primary group-hover:text-primary transition-colors">
              Elective Voting
            </h3>
            <p className="text-[11px] text-text-muted dark:text-text-muted mt-0.5">Ballot Confirmation</p>
          </Link>

          <Link
            to="/head/headship-transfer"
            className="p-4 rounded-xl bg-surface dark:bg-surface border border-border dark:border-border hover:border-primary dark:hover:border-primary transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-2.5">
              <Award size={16} />
            </div>
            <h3 className="text-xs font-bold text-text-primary dark:text-text-primary group-hover:text-primary transition-colors">
              Headship Transfer
            </h3>
            <p className="text-[11px] text-text-muted dark:text-text-muted mt-0.5">Handover Protocol</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
