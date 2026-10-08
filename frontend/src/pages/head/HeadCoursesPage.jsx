import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Search, RefreshCw, Layers, Calendar, UserCheck, Users,
  CheckCircle2, AlertCircle, Clock, ChevronRight, X, ArrowRight,
  ShieldCheck, Sparkles, Filter, ExternalLink, Award
} from 'lucide-react';

const SEMESTER_TABS = [
  { id: 'ALL', label: 'All Semesters' },
  { id: '1st Semester', label: '1st Sem' },
  { id: '2nd Semester', label: '2nd Sem' },
  { id: '3rd Semester', label: '3rd Sem' },
  { id: '4th Semester', label: '4th Sem' },
  { id: '5th Semester', label: '5th Sem' },
  { id: '6th Semester', label: '6th Sem' },
  { id: '7th Semester', label: '7th Sem' },
  { id: '8th Semester', label: '8th Sem' },
];

export default function HeadCoursesPage() {
  const { user } = useContext(AuthContext);
  const deptCode = (user?.departmentCode || user?.department || 'ETE').toUpperCase();

  // Primary state
  const [activeTab, setActiveTab] = useState('ALL');
  const [viewMode, setViewMode] = useState('catalog'); // 'catalog' | 'history'
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [historyOfferings, setHistoryOfferings] = useState([]);
  const [search, setSearch] = useState('');

  // Course Offering Drawer / Modal State
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [offeringSession, setOfferingSession] = useState('2022-2023');
  const [offeringSeries, setOfferingSeries] = useState('22');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [teacherSearchResults, setTeacherSearchResults] = useState([]);
  const [searchingTeachers, setSearchingTeachers] = useState(false);
  const [activating, setActivating] = useState(false);

  // Eligible Student Preview State
  const [previewStudents, setPreviewStudents] = useState([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Available metadata for dropdowns
  const [availableSessions, setAvailableSessions] = useState(['2024-2025', '2023-2024', '2022-2023', '2021-2022']);
  const [availableSeries, setAvailableSeries] = useState(['24', '23', '22', '21', '20']);

  // Fetch Course Catalog
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const semQuery = activeTab === 'ALL' ? '' : `semester=${encodeURIComponent(activeTab)}`;
      const res = await api.get(`/head/courses?${semQuery}`);
      if (res.data?.success) {
        setCourses(res.data.courses || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load department courses');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Fetch Offerings History
  const fetchOfferingsHistory = useCallback(async () => {
    try {
      const res = await api.get('/head/course-offerings');
      if (res.data?.success) {
        setHistoryOfferings(res.data.offerings || []);
      }
    } catch {
      // silent
    }
  }, []);

  // Fetch sessions & series
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [sessRes, serRes] = await Promise.allSettled([
          api.get('/head/academic-sessions'),
          api.get('/series')
        ]);
        if (sessRes.status === 'fulfilled' && sessRes.value?.data?.sessions) {
          setAvailableSessions(sessRes.value.data.sessions.map(s => s.name || s.academicSession));
        }
        if (serRes.status === 'fulfilled' && serRes.value?.data?.series) {
          setAvailableSeries(serRes.value.data.series.map(s => String(s.name || s.series)));
        }
      } catch {
        // keep defaults
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchCourses();
    fetchOfferingsHistory();
  }, [fetchCourses, fetchOfferingsHistory]);

  // Teacher Autocomplete Search (Section 20 & 43)
  useEffect(() => {
    if (!teacherSearchQuery || teacherSearchQuery.trim().length < 2) {
      setTeacherSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingTeachers(true);
      try {
        const res = await api.get(`/head/teachers/search?q=${encodeURIComponent(teacherSearchQuery.trim())}`);
        if (res.data?.success) {
          setTeacherSearchResults(res.data.teachers || []);
        }
      } catch {
        // silent
      } finally {
        setSearchingTeachers(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [teacherSearchQuery]);

  // Open Course Offering Drawer
  const handleOpenOffering = (course) => {
    setSelectedCourse(course);
    // Auto-detect series and session if course has active offering
    if (course.activeOffering) {
      setOfferingSeries(course.activeOffering.series || '22');
      setOfferingSession(course.activeOffering.session || '2022-2023');
    } else {
      setOfferingSeries('22');
      setOfferingSession('2022-2023');
    }
    if (course.assignedTeacher) {
      setSelectedTeacher(course.assignedTeacher);
    } else {
      setSelectedTeacher(null);
    }
    setTeacherSearchQuery('');
    setTeacherSearchResults([]);
  };

  // Preview eligible students before activation (Section 40)
  const handlePreviewEligibleStudents = async () => {
    if (!selectedCourse) return;
    setPreviewLoading(true);
    setShowPreviewModal(true);
    try {
      // Find offering or query preview
      let offId = selectedCourse.activeOffering?._id;
      if (offId) {
        const res = await api.get(`/head/course-offerings/${offId}/eligible-students`);
        if (res.data?.success) {
          setPreviewStudents(res.data.students || []);
          setPreviewTotal(res.data.total || 0);
        }
      } else {
        // Query candidate students for selected cohort
        const res = await api.get(`/head/students?series=${offeringSeries}&limit=100`);
        if (res.data?.success) {
          setPreviewStudents(res.data.students || []);
          setPreviewTotal(res.data.total || res.data.students?.length || 0);
        }
      }
    } catch (err) {
      toast.error('Failed to preview eligible students: ' + (err.response?.data?.message || err.message));
    } finally {
      setPreviewLoading(false);
    }
  };

  // Activate / Create Course Offering
  const handleAssignAndActivate = async () => {
    if (!selectedCourse) return;
    if (!selectedTeacher) {
      toast.warning('Please select an instructor to assign to this course');
      return;
    }

    setActivating(true);
    try {
      const payload = {
        courseId: selectedCourse._id,
        academicSession: offeringSession,
        series: offeringSeries,
        semester: selectedCourse.semesterLevel ? `${selectedCourse.semesterLevel} Semester` : (activeTab !== 'ALL' ? activeTab : '1st Semester'),
        teacherId: selectedTeacher.teacherId,
        activate: true
      };

      const res = await api.post('/head/course-offerings', payload);
      if (res.data?.success) {
        toast.success(`Success! ${selectedCourse.courseCode} offered and ${res.data.syncResult?.finalEnrollmentCount || 0} students enrolled automatically.`);
        setSelectedCourse(null);
        fetchCourses();
        fetchOfferingsHistory();
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to activate course offering');
    } finally {
      setActivating(false);
    }
  };

  // Cancel Offering
  const handleCancelOffering = async (offeringId) => {
    if (!window.confirm('Are you sure you want to cancel this course offering? Historical enrollments will be preserved as CANCELLED.')) {
      return;
    }
    try {
      const res = await api.post(`/head/course-offerings/${offeringId}/cancel`, {
        reason: 'CANCELLED_BY_DEPARTMENT_HEAD'
      });
      if (res.data?.success) {
        toast.success('Course offering cancelled. Historical records preserved.');
        setSelectedCourse(null);
        fetchCourses();
        fetchOfferingsHistory();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel offering');
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = courses.length;
    const active = courses.filter(c => c.offeringStatus === 'ACTIVE').length;
    const pending = courses.filter(c => c.offeringStatus === 'PENDING_TEACHER').length;
    const unoffered = courses.filter(c => c.offeringStatus === 'UNOFFERED').length;
    const totalEnrolled = courses.reduce((sum, c) => sum + (c.activeOffering?.studentCount || 0), 0);
    return { total, active, pending, unoffered, totalEnrolled };
  }, [courses]);

  // Filtered courses
  const filteredCourses = courses.filter(c =>
    c.courseCode?.toLowerCase().includes(search.toLowerCase()) ||
    c.courseTitle?.toLowerCase().includes(search.toLowerCase()) ||
    c.semesterLevel?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Academic Allocation • Dept. of {deptCode}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Course Offerings & Teacher Assignment
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Offer permanent course masters to specific cohorts (Series, Session, Semester) and assign instructors with automatic student enrollment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'catalog'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Course Master Catalog
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'history'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Offering History ({historyOfferings.length})
            </button>
          </div>

          <button
            onClick={() => { fetchCourses(); fetchOfferingsHistory(); }}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 shadow-sm"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── KPI SUMMARY CARDS (Section 63) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Catalog Courses</span>
            <BookOpen className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono">
            {stats.total}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Official master courses</div>
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <span>Active Offerings</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-2 font-mono">
            {stats.active}
          </div>
          <div className="text-[11px] text-emerald-600/80 dark:text-emerald-500 mt-1">Assigned & active</div>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-semibold">
            <span>Pending Teacher</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 mt-2 font-mono">
            {stats.pending}
          </div>
          <div className="text-[11px] text-amber-600/80 dark:text-amber-500 mt-1">Needs teacher assignment</div>
        </div>

        <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 text-xs font-semibold">
            <span>Total Enrolled Students</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-blue-700 dark:text-blue-400 mt-2 font-mono">
            {stats.totalEnrolled}
          </div>
          <div className="text-[11px] text-blue-600/80 dark:text-blue-500 mt-1">Automatic enrollments</div>
        </div>
      </div>

      {viewMode === 'catalog' ? (
        <>
          {/* ── SEMESTER SELECTOR TABS (Section 14 & 15) ── */}
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
            <div className="flex items-center gap-1.5 shrink-0">
              {SEMESTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search course code or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* ── COURSE MASTER CARDS GRID (Section 15 & 16) ── */}
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-500" />
              <p className="text-xs">Loading department course catalog...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-white">No Courses Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No course master definitions match the selected semester ({activeTab}). Check your search filter or add courses in the Master Catalog.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCourses.map((course) => {
                const isAssigned = course.offeringStatus === 'ACTIVE';
                const isPending = course.offeringStatus === 'PENDING_TEACHER';

                return (
                  <motion.div
                    key={course._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                      isAssigned ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`} />

                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-mono font-extrabold text-base text-amber-700 dark:text-amber-400">
                          {course.courseCode}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            course.isSessional
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {course.isSessional ? 'Sessional' : 'Theory'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isAssigned
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : isPending
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {isAssigned ? 'Active Offering' : isPending ? 'Pending Teacher' : 'Unoffered'}
                          </span>
                        </div>
                      </div>

                      {/* Course Title */}
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 mb-2">
                        {course.courseTitle}
                      </h3>

                      {/* Academic Specs */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
                        <span>Credits: <strong>{course.credit}</strong></span>
                        <span>•</span>
                        <span>Sem: <strong>{course.semesterLevel}</strong></span>
                        <span>•</span>
                        <span>Dept: <strong>{deptCode}</strong></span>
                      </div>

                      {/* Offering Context / Current Assignment Details */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5 mb-4">
                        {course.activeOffering ? (
                          <>
                            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                              <span className="text-slate-400">Cohort:</span>
                              <span className="font-semibold">Series {course.activeOffering.series} • {course.activeOffering.session}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                              <span className="text-slate-400">Instructor:</span>
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[160px]">
                                {course.assignedTeacher ? course.assignedTeacher.name : 'Unassigned'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                              <span className="text-slate-400">Enrolled Roster:</span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {course.activeOffering.studentCount} students
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-slate-400 py-1 text-center italic">
                            No active cohort offering. Click below to offer course.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => handleOpenOffering(course)}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 ${
                        isAssigned
                          ? 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white'
                          : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                      }`}
                    >
                      <span>{isAssigned ? 'Manage / Reassign Offering' : 'Open & Offer Course'}</span>
                      <ArrowRight size={14} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ── OFFERING HISTORY TABLE (Section 41 & 42) ── */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Permanent Course Offering Archive ({deptCode})
            </h3>
            <span className="text-xs text-slate-400">All historical, active, and completed offerings</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Academic Session</th>
                  <th className="px-4 py-3">Series</th>
                  <th className="px-4 py-3">Semester</th>
                  <th className="px-4 py-3">Assigned Teacher</th>
                  <th className="px-4 py-3">Enrolled</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {historyOfferings.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center text-slate-400">
                      No offering history recorded yet.
                    </td>
                  </tr>
                ) : (
                  historyOfferings.map((off) => (
                    <tr key={off._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-amber-700 dark:text-amber-400">{off.courseCode}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{off.courseName}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{off.sessionName}</td>
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">Series {off.seriesName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{off.semesterName}</td>
                      <td className="px-4 py-3">
                        {off.teacherAssignment ? (
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{off.teacherAssignment.teacherName || off.teacherAssignment.teacher?.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{off.teacherAssignment.teacherId}</div>
                          </div>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {off.enrollmentCount || 0} students
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          off.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : off.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {off.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {off.status === 'active' && (
                          <button
                            onClick={() => handleCancelOffering(off._id)}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800"
                          >
                            Cancel Offering
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── COURSE OFFERING DRAWER / MODAL (Sections 17-23, 38-39) ── */}
      <AnimatePresence>
        {selectedCourse && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-800/40">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 mb-1">
                    <BookOpen size={13} />
                    <span>Course Offering & Allocation</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedCourse.courseCode} — {selectedCourse.courseTitle}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Department: {deptCode} • Credits: {selectedCourse.credit} • Level: {selectedCourse.semesterLevel}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs">
                {/* Academic Session Selection (Section 19) */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Academic Session:
                  </label>
                  <select
                    value={offeringSession}
                    onChange={(e) => setOfferingSession(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    {availableSessions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Select official database session (e.g. 2022-2023).
                  </p>
                </div>

                {/* Series Selection (Section 18) */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Target Series:
                  </label>
                  <select
                    value={offeringSeries}
                    onChange={(e) => setOfferingSeries(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    {availableSeries.map((ser) => (
                      <option key={ser} value={ser}>Series {ser}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Only students belonging to Series {offeringSeries} of Dept. {deptCode} will receive this offering.
                  </p>
                </div>

                {/* Teacher Autocomplete (Section 20 & 21) */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Assigned Instructor (Teacher Autocomplete):
                  </label>
                  {selectedTeacher ? (
                    <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-indigo-900 dark:text-indigo-200 text-sm">
                          {selectedTeacher.name}
                        </div>
                        <div className="text-[11px] text-indigo-700 dark:text-indigo-300">
                          {selectedTeacher.designation || 'Faculty'} • Teacher ID: {selectedTeacher.teacherId}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedTeacher(null)}
                        className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:text-rose-600"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Type teacher name or ID (e.g. Kamal, ETE-151)..."
                          value={teacherSearchQuery}
                          onChange={(e) => setTeacherSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                        />
                        {searchingTeachers && (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        )}
                      </div>

                      {teacherSearchResults.length > 0 && (
                        <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700 shadow-lg">
                          {teacherSearchResults.map((t) => (
                            <button
                              key={t.teacherId}
                              type="button"
                              onClick={() => {
                                setSelectedTeacher(t);
                                setTeacherSearchResults([]);
                                setTeacherSearchQuery('');
                              }}
                              className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between transition-colors"
                            >
                              <div>
                                <span className="font-bold text-slate-800 dark:text-white">{t.name}</span>
                                <span className="text-[10px] text-slate-400 ml-2">{t.designation}</span>
                              </div>
                              <span className="font-mono text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                {t.teacherId}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Cohort Eligibility Summary & Preview (Section 39 & 40) */}
                <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                      Automatic Enrollment Eligibility:
                    </span>
                    <button
                      type="button"
                      onClick={handlePreviewEligibleStudents}
                      className="text-[11px] font-bold text-amber-700 dark:text-amber-300 underline hover:text-amber-900"
                    >
                      Preview Eligible Students
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Upon activation, all active students of <strong>Dept. {deptCode}</strong> in <strong>Series {offeringSeries}</strong> for <strong>{offeringSession}</strong> will automatically receive this course on their dashboard with zero manual action required.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedCourse(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleAssignAndActivate}
                  disabled={activating || !selectedTeacher}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold shadow-md shadow-amber-600/20 flex items-center gap-2"
                >
                  {activating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synchronizing Enrollments...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Assign & Activate Offering</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ELIGIBLE STUDENT PREVIEW MODAL (Section 40) ── */}
      <AnimatePresence>
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Eligible Student Cohort Preview
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Series {offeringSeries} • {offeringSession} • Total Eligible: {previewTotal} Students
                  </p>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                {previewLoading ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Fetching eligible student records...
                  </div>
                ) : previewStudents.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No active students found matching Series {offeringSeries} of Dept. {deptCode}.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="grid grid-cols-4 font-bold text-[11px] text-slate-400 uppercase py-2 px-3">
                      <span>Roll Number</span>
                      <span>Student Name</span>
                      <span>Series</span>
                      <span>Status</span>
                    </div>
                    {previewStudents.map((s) => (
                      <div key={s._id || s.rollNumber} className="grid grid-cols-4 text-xs py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {s.rollNumber || s.roll}
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {s.name}
                        </span>
                        <span className="text-slate-500">
                          Series {s.series}
                        </span>
                        <span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {s.status || 'ACTIVE'}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-right">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
