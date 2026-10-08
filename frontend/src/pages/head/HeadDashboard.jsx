import { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  Users, GraduationCap, BookOpen, Calendar,
  TrendingUp, Upload, Sparkles, ChevronRight,
  RefreshCw, CheckCircle2, Shield, Layers, Award,
  Clock, ArrowRight, Building2, UserCheck, Search
} from 'lucide-react';

export default function HeadDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [myAcademic, setMyAcademic] = useState(null);

  const deptCode = user?.departmentCode || user?.department || 'ETE';
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* ── Top Header Banner ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/20 text-blue-100">
              <Shield className="w-3.5 h-3.5 text-blue-300" />
              <span>Department Head Workspace</span>
              <span className="opacity-60">•</span>
              <span className="font-bold text-white">{deptCode}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Department of {deptName}
            </h1>
            <p className="text-xs md:text-sm text-blue-100/90 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-300" />
              <span>{facultyName}</span>
              <span className="opacity-60">•</span>
              <span>Rajshahi University of Engineering & Technology</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              to="/head/import"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold bg-white text-blue-900 hover:bg-blue-50 shadow-md transition-all transform hover:-translate-y-0.5"
            >
              <Upload className="w-4 h-4 text-blue-700" />
              <span>Import Students</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Key Academic Overview Metrics ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Academic Sessions Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Academic Sessions</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {stats.academicSessionsCount || academicSessions.length}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Enrolled batches</p>
        </div>

        {/* Total Students Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Department Students</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.totalStudents}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {stats.activeStudents} active learners
          </p>
        </div>

        {/* Teachers Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Faculty Teachers</span>
            <GraduationCap className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {stats.totalTeachers}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Department instructors</p>
        </div>

        {/* Courses Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Courses</span>
            <BookOpen className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {stats.totalCourses}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Theory & Sessional</p>
        </div>
      </div>

      {/* ── Academic Sessions Breakdown (Section 8 of Prompt) ─────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <span>Academic Sessions & Student Rosters</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Actual student counts aggregated directly from the MongoDB database for Department {deptCode}
            </p>
          </div>
          <Link
            to="/head/academic-sessions"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
          >
            <span>All Sessions</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {academicSessions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No students enrolled in academic sessions yet
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Upload your student roster Excel file to populate {deptCode} academic sessions.
              </p>
            </div>
            <Link
              to="/head/import"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Students via Excel</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {academicSessions.map((session, idx) => {
              const primarySeries = session.series && session.series.length > 0 ? session.series[0].series : 'N/A';

              return (
                <div
                  key={session.sessionName || idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                        {session.sessionName}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                        Series {primarySeries}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">TOTAL</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                          {session.totalStudents}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-600 uppercase">ACTIVE</p>
                        <p className="text-lg font-black text-emerald-600 mt-0.5">
                          {session.activeStudents}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">INACTIVE</p>
                        <p className="text-lg font-black text-slate-400 mt-0.5">
                          {session.inactiveStudents}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/head/academic-sessions/${encodeURIComponent(session.sessionName)}`}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>View Students</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── My Personal Academic Work (Sections 15 & 16) ─────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-500" />
              My Teaching & Supervision
            </h2>
            <p className="text-xs text-slate-400">Personal academic courses and student projects assigned to you</p>
          </div>
          <Link
            to="/head/teaching-assignments"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            Manage Teaching <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase">Courses I Teach</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {myAcademic?.stats?.assignedCoursesCount || 0}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase">Project Students</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {myAcademic?.stats?.projectStudentsCount || 0}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase">Seminar Students</p>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {myAcademic?.stats?.seminarStudentsCount || 0}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase">Thesis Students</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {myAcademic?.stats?.thesisStudentsCount || 0}
            </p>
          </div>
        </div>

        {/* Assigned courses table preview */}
        {myAcademic?.courses && myAcademic.courses.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300">
              Active Courses Assigned to Me
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {myAcademic.courses.map((c) => (
                <div key={c._id} className="p-3.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mr-2">{c.courseCode}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{c.courseName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {c.academicSession} • {c.semester}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold">
                      {c.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Department Quick Operations Grid ──────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Department Operations & Workflows
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            to="/head/students"
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all shadow-sm group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-2">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600">
              Department Students
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Directory & Filters</p>
          </Link>

          <Link
            to="/head/teachers"
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all shadow-sm group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mb-2">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600">
              Teachers & Workload
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Workload Overview</p>
          </Link>

          <Link
            to="/head/teaching-assignments"
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all shadow-sm group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mb-2">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600">
              Teaching Assignments
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Course Allocation</p>
          </Link>

          <Link
            to="/head/supervision"
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 transition-all shadow-sm group"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center mb-2">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600">
              Projects & Supervision
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Project/Thesis Allocation</p>
          </Link>

          <Link
            to="/head/electives"
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 transition-all shadow-sm group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center mb-2">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600">
              Elective Courses
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Series Voting</p>
          </Link>

          <Link
            to="/head/headship-transfer"
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-all shadow-sm group"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mb-2">
              <Award className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600">
              Headship Transfer
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Handover Request</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
