import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, GraduationCap, BookOpen, ClipboardList,
  Plus, Trash2, Edit, Search, Shield, RefreshCw,
  Sliders, UserPlus, FileSpreadsheet, Check, X,
  Building2, Hash, Phone, Mail, Award, AlertTriangle,
  FileText, CheckCircle2, Clock, CheckCircle, ExternalLink,
  Layers, ArrowRight
} from 'lucide-react';
import {
  generateRUETDepartmentCourseReportPDF,
  generateRUETDepartmentCourseReportXLSX
} from '../../utils/ruetReportGenerator';
import TransferHeadshipModal from '../../components/TransferHeadshipModal';

const DEPARTMENTS = [
  'CSE', 'EEE', 'ME', 'CIVIL', 'ETE', 'ECE',
  'IPE', 'MSE', 'CME', 'MTE', 'BECM', 'ARCHI'
];

function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('courses');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTransferHeadModal, setShowTransferHeadModal] = useState(false);

  const deptCode = user?.departmentCode || user?.department || 'ETE';
  const deptName = user?.departmentName || (deptCode === 'ETE' ? 'Electronics & Telecommunication Engineering' : `${deptCode} Department`);
  const facultyName = user?.facultyName || 'Faculty of Electrical & Computer Engineering';

  // Track loaded tabs
  const loadedTabs = useRef(new Set());

  // Teachers State
  const [teachers, setTeachers] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherDept, setTeacherDept] = useState('');
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [editTeacher, setEditTeacher] = useState(null);
  const [teacherProfileModal, setTeacherProfileModal] = useState(null);
  const [teacherAssignmentsList, setTeacherAssignmentsList] = useState([]);
  const [teacherForm, setTeacherForm] = useState({
    name: '', teacherId: '', department: deptCode, contactNo: '', password: ''
  });

  // Students State
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDept, setStudentDept] = useState('');
  const [studentSeries, setStudentSeries] = useState('');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({
    name: '', series: '22', rollNumber: '', department: deptCode, contactNo: '', password: ''
  });

  // Courses State
  const [courses, setCourses] = useState([]);
  const [courseSearch, setCourseSearch] = useState('');
  const [courseSemesterFilter, setCourseSemesterFilter] = useState('');
  const [courseStatusFilter, setCourseStatusFilter] = useState('all');

  // Course Assignment Modal State
  const [assignModalCourse, setAssignModalCourse] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('3-2');
  const [selectedSession, setSelectedSession] = useState('2024-2025');
  const [selectedSeries, setSelectedSeries] = useState('22');
  const [assigningLoading, setAssigningLoading] = useState(false);

  // View Syllabus Modal
  const [viewSyllabusCourse, setViewSyllabusCourse] = useState(null);

  // Debounced search
  const debouncedTeacherSearch = useDebounce(teacherSearch);
  const debouncedStudentSearch = useDebounce(studentSearch);
  const debouncedCourseSearch = useDebounce(courseSearch);

  // ── Fetchers ──────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch {
      toast.error('Failed to load system statistics');
    }
  }, []);

  const fetchTeachers = useCallback(async (search, dept) => {
    try {
      const params = new URLSearchParams();
      if (dept) params.append('department', dept);
      if (search) params.append('search', search);
      const { data } = await api.get(`/admin/teachers?${params}`);
      setTeachers(data.teachers || (Array.isArray(data) ? data : []));
    } catch {
      toast.error('Failed to load teachers roster');
    }
  }, []);

  const fetchStudents = useCallback(async (search, dept, series) => {
    try {
      const params = new URLSearchParams();
      if (dept) params.append('department', dept);
      if (series) params.append('series', series);
      if (search) params.append('search', search);
      const { data } = await api.get(`/admin/students?${params}`);
      setStudents(data.students || (Array.isArray(data) ? data : []));
    } catch {
      toast.error('Failed to load students roster');
    }
  }, []);

  const fetchCourses = useCallback(async (search, semester, status) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (semester) params.append('semester', semester);
      if (status && status !== 'all') params.append('status', status);
      const { data } = await api.get(`/admin/courses?${params}`);
      setCourses(data.courses || (Array.isArray(data) ? data : []));
    } catch {
      toast.error('Failed to load department courses');
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchCourses('', '', 'all');
    fetchTeachers('', '');
  }, [fetchStats, fetchCourses, fetchTeachers]);

  // Tab change lazy loading
  useEffect(() => {
    if (activeTab === 'students' && !loadedTabs.current.has('students')) {
      loadedTabs.current.add('students');
      fetchStudents(debouncedStudentSearch, studentDept, studentSeries);
    }
  }, [activeTab, debouncedStudentSearch, studentDept, studentSeries, fetchStudents]);

  // Search/Filter triggers
  useEffect(() => {
    if (activeTab === 'teachers') {
      fetchTeachers(debouncedTeacherSearch, teacherDept);
    }
  }, [activeTab, debouncedTeacherSearch, teacherDept, fetchTeachers]);

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents(debouncedStudentSearch, studentDept, studentSeries);
    }
  }, [activeTab, debouncedStudentSearch, studentDept, studentSeries, fetchStudents]);

  useEffect(() => {
    fetchCourses(debouncedCourseSearch, courseSemesterFilter, courseStatusFilter);
  }, [debouncedCourseSearch, courseSemesterFilter, courseStatusFilter, fetchCourses]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchCourses(debouncedCourseSearch, courseSemesterFilter, courseStatusFilter),
        fetchTeachers(debouncedTeacherSearch, teacherDept),
        activeTab === 'students' ? fetchStudents(debouncedStudentSearch, studentDept, studentSeries) : Promise.resolve()
      ]);
      toast.success('Department data refreshed');
    } finally {
      setLoading(false);
    }
  };

  // ── COURSE ASSIGNMENT HANDLERS (Sections 9, 10, 11) ───────────────
  const handleOpenAssignModal = (course) => {
    setAssignModalCourse(course);
    setSelectedTeacherId(course.assignedTeacher?.teacherId || (teachers[0]?.teacherId || ''));
    setSelectedSemester(course.semesterLevel || course.semester || '3-2');
    setSelectedSession('2024-2025');
    setSelectedSeries('22');
  };

  const handleAssignCourse = async (e) => {
    e.preventDefault();
    if (!assignModalCourse || !selectedTeacherId) {
      return toast.warning('Please select a course teacher');
    }
    setAssigningLoading(true);
    try {
      const res = await api.post('/admin/assign-course', {
        courseId: assignModalCourse._id,
        courseCode: assignModalCourse.courseCode,
        teacherId: selectedTeacherId,
        semester: selectedSemester,
        academicSession: selectedSession,
        series: selectedSeries
      });
      toast.success(res.data.message || `Course assigned successfully!`);
      setAssignModalCourse(null);
      fetchCourses(debouncedCourseSearch, courseSemesterFilter, courseStatusFilter);
      fetchTeachers(debouncedTeacherSearch, teacherDept);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign course');
    } finally {
      setAssigningLoading(false);
    }
  };

  const handleRevokeAssignment = async (course) => {
    if (!course.assignment?._id) return;
    if (!window.confirm(`Revoke teacher assignment for ${course.courseCode}?`)) return;
    try {
      await api.delete(`/admin/revoke-assignment/${course.assignment._id}`);
      toast.success(`Assignment revoked for ${course.courseCode}`);
      fetchCourses(debouncedCourseSearch, courseSemesterFilter, courseStatusFilter);
      fetchTeachers(debouncedTeacherSearch, teacherDept);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke assignment');
    }
  };

  const handleViewTeacherProfile = async (teacher) => {
    setTeacherProfileModal(teacher);
    setTeacherAssignmentsList([]);
    try {
      const { data } = await api.get(`/admin/teacher-assignments/${teacher.teacherId}`);
      setTeacherAssignmentsList(data);
    } catch {
      toast.error('Failed to load teacher assignments');
    }
  };

  // ── REPORTS (Sections 17, 18, 19, 20) ─────────────────────────────
  const handleExportPDF = () => {
    generateRUETDepartmentCourseReportPDF({
      departmentCode: deptCode,
      departmentName: deptName,
      facultyName: facultyName,
      academicSession: '2024-2025',
      courses: courses
    });
    toast.success('RUET Department Course Allocation PDF generated!');
  };

  const handleExportXLSX = () => {
    generateRUETDepartmentCourseReportXLSX({
      departmentCode: deptCode,
      departmentName: deptName,
      facultyName: facultyName,
      academicSession: '2024-2025',
      courses: courses
    });
    toast.success('RUET Department Course Allocation XLSX generated!');
  };

  // ── TEACHER & STUDENT CRUD HANDLERS ──────────────────────────────
  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/teachers', { ...teacherForm, department: deptCode });
      toast.success('Faculty member added successfully!');
      setShowAddTeacherModal(false);
      setTeacherForm({ name: '', teacherId: '', department: deptCode, contactNo: '', password: '' });
      fetchTeachers(debouncedTeacherSearch, teacherDept);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add faculty member');
    }
  };

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/teachers/${editTeacher._id}`, editTeacher);
      toast.success('Teacher record updated');
      setEditTeacher(null);
      fetchTeachers(debouncedTeacherSearch, teacherDept);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update teacher');
    }
  };

  const handleDeleteTeacher = async (id) => {
    if (!window.confirm('Delete this faculty member?')) return;
    try {
      await api.delete(`/admin/teachers/${id}`);
      toast.success('Teacher removed');
      fetchTeachers(debouncedTeacherSearch, teacherDept);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete teacher');
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/students', { ...studentForm, department: deptCode });
      toast.success('Student enrolled successfully!');
      setShowAddStudentModal(false);
      setStudentForm({ name: '', series: '22', rollNumber: '', department: deptCode, contactNo: '', password: '' });
      fetchStudents(debouncedStudentSearch, studentDept, studentSeries);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to enroll student');
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/students/${editStudent._id}`, editStudent);
      toast.success('Student profile updated');
      setEditStudent(null);
      fetchStudents(debouncedStudentSearch, studentDept, studentSeries);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update student');
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Delete this student record?')) return;
    try {
      await api.delete(`/admin/students/${id}`);
      toast.success('Student removed');
      fetchStudents(debouncedStudentSearch, studentDept, studentSeries);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete student');
    }
  };

  const assignedCoursesCount = courses.filter(c => c.isAssigned).length;
  const unassignedCoursesCount = courses.filter(c => !c.isAssigned).length;

  const inputClass = "w-full px-3 py-2 rounded-md border border-[#d1d5db] dark:border-[#3d6b4f] bg-white dark:bg-[#111f17] text-[#111827] dark:text-[#e9f0ec] placeholder-[#9ca3af] focus:outline-none focus:border-[#1a5f3f] focus:ring-2 focus:ring-[#1a5f3f]/10 text-sm";
  const labelClass = "text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#6b8f77] mb-1 block";

  return (
    <div className="space-y-6 pb-16">
      
      {/* ── DEPARTMENT HEAD HEADER ── */}
      <div className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-sm">
              <Shield size={22} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                  Department Head
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 text-[10px] font-semibold">
                  <CheckCircle2 size={10} />
                  Dept. Isolation: {deptCode}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{deptName}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {facultyName} &bull; Rajshahi University of Engineering & Technology
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleExportPDF}
              className="px-3.5 py-2 rounded-lg bg-white dark:bg-[#15203b] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 hover:border-blue-500 hover:text-blue-600 transition-colors shadow-sm"
              title="Download RUET Official Course Allocation Report">
              <FileText size={13} className="text-blue-500" /> Export PDF
            </button>
            <button onClick={handleExportXLSX}
              className="px-3.5 py-2 rounded-lg bg-white dark:bg-[#15203b] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 hover:border-emerald-500 hover:text-emerald-600 transition-colors shadow-sm"
              title="Download RUET Official Course Allocation Excel">
              <FileSpreadsheet size={13} className="text-emerald-500" /> Export XLSX
            </button>
            <button onClick={() => setShowTransferHeadModal(true)}
              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
              title="Transfer Department Head powers">
              <Shield size={13} /> Transfer Headship
            </button>
            <button onClick={handleRefresh} disabled={loading}
              className="px-3 py-2 rounded-lg bg-white dark:bg-[#15203b] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 hover:border-blue-500 transition-colors">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── OVERVIEW METRICS CARDS (Multi-Color Hierarchy) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { title: 'Total Courses', value: courses.length, icon: <BookOpen size={16} />, color: 'text-blue-600 dark:text-blue-400', border: 'border-l-4 border-l-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' },
          { title: 'Faculty Members', value: teachers.length, icon: <Users size={16} />, color: 'text-violet-600 dark:text-violet-400', border: 'border-l-4 border-l-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400' },
          { title: 'Assigned', value: assignedCoursesCount, icon: <CheckCircle size={16} />, color: 'text-emerald-600 dark:text-emerald-400', border: 'border-l-4 border-l-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' },
          { title: 'Unassigned', value: unassignedCoursesCount, icon: <Clock size={16} />, color: 'text-amber-600 dark:text-amber-400', border: 'border-l-4 border-l-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' },
          { title: 'Students', value: stats?.totalStudents ?? '—', icon: <GraduationCap size={16} />, color: 'text-cyan-600 dark:text-cyan-400', border: 'border-l-4 border-l-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400' },
          { title: 'Mark Requests', value: stats?.totalRequests ?? '—', icon: <ClipboardList size={16} />, color: 'text-rose-600 dark:text-rose-400', border: 'border-l-4 border-l-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' },
        ].map((card, idx) => (
          <div key={idx}
            className={`bg-white dark:bg-[#111c38] rounded-xl p-4 border border-slate-200 dark:border-[#1e293b] ${card.border} shadow-sm transition-all hover:-translate-y-0.5`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{card.title}</span>
              <span className={`p-1.5 rounded-lg ${card.bg}`}>{card.icon}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── ADMIN TABS ── */}
      <div className="flex items-center gap-0 border-b border-slate-200 dark:border-[#1e293b] overflow-x-auto">
        {[
          { key: 'courses', label: `Courses (${courses.length})`, icon: <BookOpen size={14} /> },
          { key: 'teachers', label: `Faculty (${teachers.length})`, icon: <Users size={14} /> },
          { key: 'students', label: `Students (${students.length || stats?.totalStudents || 0})`, icon: <GraduationCap size={14} /> },
          { key: 'overview', label: 'Analytics', icon: <Sliders size={14} /> },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}>
            {tab.icon}<span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ────────────────── TAB 1: COURSES & ASSIGNMENT (Section 9 & 11) ────────────────── */}
      {activeTab === 'courses' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by code or title..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <select
                value={courseSemesterFilter}
                onChange={(e) => setCourseSemesterFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="">All Semesters</option>
                <option value="1-1">1-1 Semester</option>
                <option value="1-2">1-2 Semester</option>
                <option value="2-1">2-1 Semester</option>
                <option value="2-2">2-2 Semester</option>
                <option value="3-1">3-1 Semester</option>
                <option value="3-2">3-2 Semester</option>
                <option value="4-1">4-1 Semester</option>
                <option value="4-2">4-2 Semester</option>
              </select>

              <select
                value={courseStatusFilter}
                onChange={(e) => setCourseStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="all">All Statuses</option>
                <option value="assigned">Assigned Courses</option>
                <option value="unassigned">Unassigned Courses</option>
              </select>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {courses.length} Sessional Courses
              </span>
              <span>&bull;</span>
              <span className="text-emerald-600 font-bold">{assignedCoursesCount} Assigned</span>
            </div>
          </div>

          {/* Course Cards Grid (Section 9 Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {courses.length > 0 ? (
              courses.map((c) => {
                const isAssigned = c.isAssigned;
                const teacher = c.assignedTeacher;
                return (
                  <div key={c._id}
                    className="bg-white dark:bg-[#1a2a1e] rounded-md border border-[#e5e7eb] dark:border-[#2d4033] p-4 flex flex-col justify-between relative overflow-hidden hover:border-[#b8d9c7] dark:hover:border-[#3d6b4f] transition-colors">
                    <div className={`absolute top-0 left-0 right-0 h-0.5 ${isAssigned ? 'bg-[#1a5f3f]' : 'bg-[#d1d5db]'}`} />

                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="font-mono font-bold text-sm text-[#111827] dark:text-[#f0f4f2]">{c.courseCode}</span>
                          <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]">Lab</span>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isAssigned
                            ? 'bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]'
                            : 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                        }`}>{isAssigned ? '✓ Assigned' : 'Unassigned'}</span>
                      </div>

                      <h3 className="text-[13px] font-semibold text-[#1f2937] dark:text-[#e9f0ec] line-clamp-2 mb-2">{c.courseName || c.title}</h3>

                      <div className="flex items-center gap-2 text-[11px] text-[#6b7280] dark:text-[#6b8f77] mb-3 pb-2.5 border-b border-[#f3f4f6] dark:border-[#1f3326]">
                        <span>Sem {c.semesterLevel || c.semester || '3-2'}</span>
                        <span>&bull;</span>
                        <span>Credit: {c.credits ? Number(c.credits).toFixed(2) : '3.00'}</span>
                      </div>

                      <div className="mb-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9ca3af] block mb-1.5">Assigned Teacher</span>
                        {isAssigned && teacher ? (
                          <div className="p-2 rounded bg-[#f9fafb] dark:bg-[#111f17] border border-[#e5e7eb] dark:border-[#2d4033] flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#e8f4ee] text-[#1a5f3f] font-bold flex items-center justify-center text-xs shrink-0">
                              {teacher.name?.charAt(0) || 'T'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold text-[#111827] dark:text-[#e9f0ec] truncate">{teacher.name}</p>
                              <p className="text-[10px] text-[#6b7280] dark:text-[#6b8f77] truncate">{teacher.teacherId}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 rounded bg-[#fafafa] dark:bg-[#111f17] border border-dashed border-[#d1d5db] dark:border-[#3d6b4f] text-[11px] text-[#9ca3af] flex items-center gap-1.5">
                            <Clock size={12} className="shrink-0" />
                            <span>No teacher assigned</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#f3f4f6] dark:border-[#1f3326]">
                      <button onClick={() => setViewSyllabusCourse(c)}
                        className="px-2.5 py-1.5 rounded text-[#6b7280] dark:text-[#6b8f77] hover:text-[#1a5f3f] hover:bg-[#e8f4ee] text-[11px] font-medium flex items-center gap-1 transition-colors">
                        <FileText size={12} /> Syllabus
                      </button>
                      <div className="flex items-center gap-1">
                        {isAssigned && (
                          <button onClick={() => handleRevokeAssignment(c)}
                            className="p-1.5 rounded text-[#6b7280] hover:text-[#dc2626] hover:bg-[#fef2f2] transition-colors" title="Revoke">
                            <Trash2 size={13} />
                          </button>
                        )}
                        <button onClick={() => handleOpenAssignModal(c)}
                          className="px-3 py-1.5 rounded bg-[#1a5f3f] hover:bg-[#134a30] text-white text-[11px] font-medium flex items-center gap-1 transition-colors">
                          <Award size={12} />
                          {isAssigned ? 'Reassign' : 'Assign'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center bg-white dark:bg-[#1a2a1e] rounded-md border border-[#e5e7eb] dark:border-[#2d4033]">
                <BookOpen size={28} className="mx-auto mb-2 text-[#d1d5db] dark:text-[#2d4033]" />
                <p className="text-sm font-medium text-[#6b7280]">No sessional courses match the selected filter.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────── TAB 2: FACULTY / TEACHERS (Section 10) ────────────────── */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
              <input type="text" placeholder="Search teacher name or ID..."
                value={teacherSearch} onChange={(e) => setTeacherSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-md border border-[#d1d5db] dark:border-[#3d6b4f] bg-white dark:bg-[#1a2a1e] text-[13px] text-[#111827] dark:text-[#e9f0ec] focus:outline-none focus:border-[#1a5f3f] focus:ring-2 focus:ring-[#1a5f3f]/10" />
            </div>
            <button onClick={() => setShowAddTeacherModal(true)}
              className="w-full sm:w-auto px-3 py-2 rounded-md bg-[#1a5f3f] hover:bg-[#134a30] text-white text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors">
              <UserPlus size={13} /> Add Faculty Member
            </button>
          </div>

          {/* Teacher Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {teachers.length > 0 ? (
              teachers.map((t) => {
                // Count how many courses currently assigned to this teacher
                const assignedCourses = courses.filter(c => c.assignedTeacher?.teacherId === t.teacherId);
                return (
                  <div key={t._id}
                    className="bg-white dark:bg-[#1a2a1e] rounded-md border border-[#e5e7eb] dark:border-[#2d4033] p-4 flex flex-col justify-between hover:border-[#b8d9c7] dark:hover:border-[#3d6b4f] transition-colors">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[#e8f4ee] text-[#1a5f3f] font-bold flex items-center justify-center text-sm shrink-0">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-[13px] font-semibold text-[#111827] dark:text-[#f0f4f2]">{t.name}</h3>
                            <span className="font-mono text-[11px] text-[#1a5f3f] dark:text-[#4ade80]">{t.teacherId}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">Active</span>
                      </div>

                      <div className="space-y-1 text-[12px] text-[#6b7280] dark:text-[#8ba99b] mb-3 pb-3 border-b border-[#f3f4f6] dark:border-[#1f3326]">
                        <p><span className="font-medium text-[#374151] dark:text-[#cbd5d9]">Designation:</span> {t.designation || 'Assistant Professor'}</p>
                        <p><span className="font-medium text-[#374151] dark:text-[#cbd5d9]">Department:</span> {t.department || deptCode}</p>
                        <p><span className="font-medium text-[#374151] dark:text-[#cbd5d9]">Contact:</span> {t.contactNo || 'N/A'}</p>
                        <p className="truncate"><span className="font-medium text-[#374151] dark:text-[#cbd5d9]">Email:</span> {t.email || `${t.teacherId.toLowerCase()}@ruet.ac.bd`}</p>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Assigned Courses:</span>
                          <span className="font-extrabold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs">
                            {assignedCourses.length} Courses
                          </span>
                        </div>
                        {assignedCourses.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {assignedCourses.map(ac => (
                              <span key={ac.courseCode} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                                {ac.courseCode}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No courses currently assigned</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleViewTeacherProfile(t)}
                        className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <ExternalLink size={13} />
                        View Profile
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setShowTransferHeadModal(true)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                          title={`Transfer Department Headship to ${t.name}`}
                        >
                          <Award size={14} />
                        </button>
                        <button
                          onClick={() => setEditTeacher(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                          title="Edit Teacher"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(t._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete Teacher"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12 text-slate-400">
                No faculty members registered in {deptCode} Department yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────── TAB 3: STUDENTS ────────────────── */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by roll number or name..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <select
                value={studentSeries}
                onChange={(e) => setStudentSeries(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="">All Series</option>
                <option value="20">Series 20</option>
                <option value="21">Series 21</option>
                <option value="22">Series 22</option>
                <option value="23">Series 23</option>
                <option value="24">Series 24</option>
                <option value="25">Series 25</option>
              </select>
            </div>

            <button
              onClick={() => setShowAddStudentModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={15} />
              Enroll New Student
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Roll Number</th>
                  <th className="px-4 py-3.5">Student Name</th>
                  <th className="px-4 py-3.5">Series</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5">Contact No</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {students.length > 0 ? (
                  students.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">{s.rollNumber}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">{s.name}</td>
                      <td className="px-4 py-3.5"><span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold">{s.series}</span></td>
                      <td className="px-4 py-3.5"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">{s.department}</span></td>
                      <td className="px-4 py-3.5 text-slate-500">{s.contactNo || 'N/A'}</td>
                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => setEditStudent(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          title="Edit Student"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s._id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete Student"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No students found for this criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────── TAB 4: OVERVIEW ANALYTICS ────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 size={18} className="text-amber-500" />
              Department Sessional Courses Allocation
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Total Sessional Courses</span>
                <span className="font-extrabold text-sm text-amber-600">{courses.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Assigned to Faculty</span>
                <span className="font-extrabold text-sm text-emerald-600">{assignedCoursesCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Unassigned Courses</span>
                <span className="font-extrabold text-sm text-rose-600">{unassignedCoursesCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Hash size={18} className="text-amber-500" />
              Student Series Cohorts in {deptCode}
            </h3>
            <div className="space-y-3">
              {stats?.studentSeriesDistribution && stats.studentSeriesDistribution.length > 0 ? (
                stats.studentSeriesDistribution.map((item) => (
                  <div key={item._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Series {item._id}</span>
                    <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {item.count} Students
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Series 22</span>
                  <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    57 Students
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── ASSIGN COURSE TO TEACHER MODAL (Section 11) ────────────────── */}
      {assignModalCourse && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="text-amber-500" size={20} />
                <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
                  Assign Course to Teacher
                </h3>
              </div>
              <button onClick={() => setAssignModalCourse(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Course Summary Card */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-700 dark:text-slate-200 space-y-1">
              <p className="font-mono font-bold text-amber-700 dark:text-amber-400 text-sm">
                {assignModalCourse.courseCode} &bull; {assignModalCourse.courseName || assignModalCourse.title}
              </p>
              <p className="text-slate-500">
                Course Type: <strong>Sessional</strong> &bull; Format: <strong>Laboratory & Practical</strong> &bull; Dept: <strong>{deptCode}</strong>
              </p>
            </div>

            <form onSubmit={handleAssignCourse} className="space-y-3.5">
              <div>
                <label className={labelClass}>
                  Select Department Teacher (Section 11)
                </label>
                <select
                  required
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">-- Choose Course Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.teacherId} value={t.teacherId}>
                      {t.name} ({t.teacherId}) - {t.designation || 'Instructor'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Semester</label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className={inputClass}
                  >
                    <option value="1-1">1-1</option>
                    <option value="1-2">1-2</option>
                    <option value="2-1">2-1</option>
                    <option value="2-2">2-2</option>
                    <option value="3-1">3-1</option>
                    <option value="3-2">3-2</option>
                    <option value="4-1">4-1</option>
                    <option value="4-2">4-2</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Academic Session</label>
                  <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className={inputClass}
                  >
                    <option value="2024-2025">2024-2025</option>
                    <option value="2025-2026">2025-2026</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Series Batch</label>
                  <select
                    value={selectedSeries}
                    onChange={(e) => setSelectedSeries(e.target.value)}
                    className={inputClass}
                  >
                    <option value="22">Series 22</option>
                    <option value="23">Series 23</option>
                    <option value="24">Series 24</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500">
                Rule (Section 12): Only Department Head assigns courses. Once assigned, this course immediately appears on the teacher's dashboard, and the teacher becomes the official evaluator for mark requests.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalCourse(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigningLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/30 flex items-center gap-1.5"
                >
                  {assigningLoading ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <>
                      <Check size={14} />
                      Assign Course
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────── VIEW SYLLABUS MODAL ────────────────── */}
      {viewSyllabusCourse && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold text-amber-500">{viewSyllabusCourse.courseCode}</span>
                <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
                  {viewSyllabusCourse.courseName || viewSyllabusCourse.title}
                </h3>
              </div>
              <button onClick={() => setViewSyllabusCourse(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-4 text-xs font-semibold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span>Semester: <strong>{viewSyllabusCourse.semesterLevel || '3-2'}</strong></span>
                <span>Credits: <strong>{viewSyllabusCourse.credits}</strong></span>
                <span>Format: <strong>{viewSyllabusCourse.isSessional ? 'Sessional / Lab' : 'Theory'}</strong></span>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white mb-1.5 uppercase tracking-wider text-[11px]">
                  Course Syllabus & Outline:
                </h4>
                <p className="leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 whitespace-pre-line">
                  {viewSyllabusCourse.syllabus || 'No syllabus text available for this sessional course.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewSyllabusCourse(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── VIEW TEACHER PROFILE MODAL (Section 10) ────────────────── */}
      {teacherProfileModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center text-sm">
                  {teacherProfileModal.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white">
                    {teacherProfileModal.name}
                  </h3>
                  <span className="font-mono text-xs text-purple-600 font-bold">
                    {teacherProfileModal.teacherId} &bull; {teacherProfileModal.designation || 'Faculty'}
                  </span>
                </div>
              </div>
              <button onClick={() => setTeacherProfileModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                <p><strong>Department:</strong> {teacherProfileModal.department || deptCode}</p>
                <p><strong>Contact No:</strong> {teacherProfileModal.contactNo || 'N/A'}</p>
                <p><strong>Email:</strong> {teacherProfileModal.email || `${teacherProfileModal.teacherId.toLowerCase()}@ruet.ac.bd`}</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 dark:text-white mb-2 text-xs uppercase tracking-wider">
                  Assigned Courses ({teacherAssignmentsList.length}):
                </h4>
                {teacherAssignmentsList.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {teacherAssignmentsList.map((a) => (
                      <div key={a._id} className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {a.courseCode}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {a.courseName} &bull; Sem: {a.semester} &bull; Session: {a.academicSession}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No courses currently assigned to this faculty member.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setTeacherProfileModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── ADD TEACHER MODAL ────────────────── */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">Add Department Faculty</h3>
              <button onClick={() => setShowAddTeacherModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateTeacher} className="space-y-3.5">
              <div>
                <label className={labelClass}>Full Name</label>
                <input required type="text" value={teacherForm.name} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} className={inputClass} placeholder="e.g. Dr. John Doe" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Teacher ID</label>
                  <input required type="text" value={teacherForm.teacherId} onChange={e => setTeacherForm({...teacherForm, teacherId: e.target.value.toUpperCase()})} className={inputClass} placeholder="e.g. ETE-295" />
                </div>
                <div>
                  <label className={labelClass}>Department</label>
                  <input disabled value={deptCode} className={`${inputClass} opacity-70 cursor-not-allowed`} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Contact Number</label>
                <input required type="text" value={teacherForm.contactNo} onChange={e => setTeacherForm({...teacherForm, contactNo: e.target.value})} className={inputClass} placeholder="e.g. 017xxxxxxxx" />
              </div>
              <div>
                <label className={labelClass}>Initial Password</label>
                <input required type="password" value={teacherForm.password} onChange={e => setTeacherForm({...teacherForm, password: e.target.value})} className={inputClass} placeholder="Min 6 chars" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddTeacherModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/30">Save Faculty</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────── EDIT TEACHER MODAL ────────────────── */}
      {editTeacher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">Edit Faculty: {editTeacher.teacherId}</h3>
              <button onClick={() => setEditTeacher(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateTeacher} className="space-y-3.5">
              <div>
                <label className={labelClass}>Full Name</label>
                <input required type="text" value={editTeacher.name} onChange={e => setEditTeacher({...editTeacher, name: e.target.value})} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Department</label>
                  <input disabled value={editTeacher.department || deptCode} className={`${inputClass} opacity-70`} />
                </div>
                <div>
                  <label className={labelClass}>Contact No</label>
                  <input required type="text" value={editTeacher.contactNo} onChange={e => setEditTeacher({...editTeacher, contactNo: e.target.value})} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Reset Password (leave blank to keep)</label>
                <input type="password" onChange={e => setEditTeacher({...editTeacher, password: e.target.value})} className={inputClass} placeholder="New password" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditTeacher(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/30">Update Faculty</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────── ADD STUDENT MODAL ────────────────── */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">Enroll New Student</h3>
              <button onClick={() => setShowAddStudentModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateStudent} className="space-y-3.5">
              <div>
                <label className={labelClass}>Full Name</label>
                <input required type="text" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className={inputClass} placeholder="e.g. Alex Johnson" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Roll Number</label>
                  <input required type="text" value={studentForm.rollNumber} onChange={e => setStudentForm({...studentForm, rollNumber: e.target.value})} className={inputClass} placeholder="e.g. 2204060" />
                </div>
                <div>
                  <label className={labelClass}>Series Batch</label>
                  <input required type="text" value={studentForm.series} onChange={e => setStudentForm({...studentForm, series: e.target.value})} className={inputClass} placeholder="e.g. 22" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Department</label>
                  <input disabled value={deptCode} className={`${inputClass} opacity-70`} />
                </div>
                <div>
                  <label className={labelClass}>Contact No</label>
                  <input required type="text" value={studentForm.contactNo} onChange={e => setStudentForm({...studentForm, contactNo: e.target.value})} className={inputClass} placeholder="017xxxxxxxx" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <input required type="password" value={studentForm.password} onChange={e => setStudentForm({...studentForm, password: e.target.value})} className={inputClass} placeholder="Min 6 chars" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddStudentModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/30">Save Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────── EDIT STUDENT MODAL ────────────────── */}
      {editStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">Edit Student: {editStudent.rollNumber}</h3>
              <button onClick={() => setEditStudent(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateStudent} className="space-y-3.5">
              <div>
                <label className={labelClass}>Full Name</label>
                <input required type="text" value={editStudent.name} onChange={e => setEditStudent({...editStudent, name: e.target.value})} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Roll Number</label>
                  <input required type="text" value={editStudent.rollNumber} onChange={e => setEditStudent({...editStudent, rollNumber: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Series Batch</label>
                  <input required type="text" value={editStudent.series} onChange={e => setEditStudent({...editStudent, series: e.target.value})} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Contact No</label>
                <input required type="text" value={editStudent.contactNo} onChange={e => setEditStudent({...editStudent, contactNo: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Reset Password (leave blank to keep)</label>
                <input type="password" onChange={e => setEditStudent({...editStudent, password: e.target.value})} className={inputClass} placeholder="New password" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditStudent(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/30">Update Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Department Head Succession Modal */}
      <TransferHeadshipModal
        isOpen={showTransferHeadModal}
        onClose={() => setShowTransferHeadModal(false)}
        teachers={teachers}
        currentDeptCode={deptCode}
        currentAdminName={user?.name || 'Head of Department'}
        onSuccess={(data) => {
          toast.success(`Department Head authority successfully shifted to ${data.newHead?.name || 'the incoming Head'}!`);
          fetchStats();
          fetchTeachers(debouncedTeacherSearch, teacherDept);
          fetchCourses(debouncedCourseSearch, courseSemesterFilter, courseStatusFilter);
        }}
      />

    </div>
  );
}
