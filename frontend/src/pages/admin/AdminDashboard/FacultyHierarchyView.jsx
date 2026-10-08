import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderTree, Building2, Users, GraduationCap, BookOpen,
  ChevronRight, ArrowLeft, Shield, UserCheck, Plus, Search,
  RefreshCw, CheckCircle2, Clock, AlertTriangle, FileSpreadsheet,
  Calendar, Layers, Eye, Trash2, Edit, X, ArrowUpRight
} from 'lucide-react';
import api from '../../../api/axios';

const ROLE_LABELS = {
  PRIMARY_TEACHER: 'Primary Teacher',
  PRIMARY: 'Primary Teacher',
  CO_TEACHER: 'Co-Teacher',
  LAB_TEACHER: 'Lab / Sessional Teacher',
  COURSE_COORDINATOR: 'Course Coordinator',
  TEMPORARY: 'Temporary Teacher'
};

const ROLE_COLORS = {
  PRIMARY_TEACHER: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  PRIMARY: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  CO_TEACHER: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  LAB_TEACHER: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  COURSE_COORDINATOR: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  TEMPORARY: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
};

export default function FacultyHierarchyView() {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Hierarchical navigation state
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [deptOverview, setDeptOverview] = useState(null);
  const [loadingDept, setLoadingDept] = useState(false);

  // Department console sub-tab
  const [deptTab, setDeptTab] = useState('assignments'); // 'assignments' | 'teachers' | 'students' | 'courses' | 'head-history'

  // Sub-tab data
  const [deptTeachers, setDeptTeachers] = useState([]);
  const [deptAssignments, setDeptAssignments] = useState([]);
  const [deptCourses, setDeptCourses] = useState([]);
  const [deptStudents, setDeptStudents] = useState([]);
  const [deptHeadHistory, setDeptHeadHistory] = useState([]);
  const [loadingSubTab, setLoadingSubTab] = useState(false);

  // Sub-tab searches
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  // Modals
  const [showAssignHeadModal, setShowAssignHeadModal] = useState(false);
  const [eligibleTeachers, setEligibleTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [headReason, setHeadReason] = useState('');
  const [submittingHead, setSubmittingHead] = useState(false);

  const [showAssignCourseModal, setShowAssignCourseModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    courseCode: '',
    teacherId: '',
    role: 'PRIMARY_TEACHER',
    series: '22',
    academicSession: '2024-2025',
    semester: '3-2',
    notes: '',
    allowCrossDepartment: false
  });
  const [submittingAssignCourse, setSubmittingAssignCourse] = useState(false);

  const [teacherWorkloadModal, setTeacherWorkloadModal] = useState(null);

  // 1. Fetch faculties summary
  const fetchFaculties = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/faculties-summary');
      setFaculties(data.faculties || []);
    } catch (err) {
      toast.error('Failed to load faculties summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaculties();
  }, [fetchFaculties]);

  // 2. Fetch department details when selected
  const fetchDeptOverview = useCallback(async (deptCode) => {
    setLoadingDept(true);
    try {
      const { data } = await api.get(`/admin/departments/${deptCode}/overview`);
      setDeptOverview(data);
    } catch {
      toast.error(`Failed to load overview for Department ${deptCode}`);
    } finally {
      setLoadingDept(false);
    }
  }, []);

  // 3. Fetch sub-tab data for department
  const fetchDeptSubTabData = useCallback(async (deptCode, tab) => {
    setLoadingSubTab(true);
    try {
      if (tab === 'assignments') {
        const { data } = await api.get(`/admin/teaching-assignments/current?department=${deptCode}&limit=100`);
        setDeptAssignments(data.assignments || []);
      } else if (tab === 'teachers') {
        const { data } = await api.get(`/admin/teachers?department=${deptCode}&limit=100`);
        setDeptTeachers(data.teachers || data || []);
      } else if (tab === 'students') {
        const { data } = await api.get(`/admin/students?department=${deptCode}&limit=100`);
        setDeptStudents(data.students || data || []);
      } else if (tab === 'courses') {
        const { data } = await api.get(`/admin/courses?department=${deptCode}`);
        setDeptCourses(data || []);
      } else if (tab === 'head-history') {
        const { data } = await api.get(`/admin/departments/${deptCode}/head-history`);
        setDeptHeadHistory(data.history || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSubTab(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchDeptOverview(selectedDepartment.code);
      fetchDeptSubTabData(selectedDepartment.code, deptTab);
    }
  }, [selectedDepartment, deptTab, fetchDeptOverview, fetchDeptSubTabData]);

  // Handle drill downs
  const handleSelectFaculty = (f) => {
    setSelectedFaculty(f);
    setSelectedDepartment(null);
  };

  const handleSelectDepartment = (d) => {
    setSelectedDepartment(d);
    setDeptTab('assignments');
  };

  const handleBackToUniversity = () => {
    setSelectedFaculty(null);
    setSelectedDepartment(null);
  };

  const handleBackToFaculty = () => {
    setSelectedDepartment(null);
  };

  // Assign Head submit
  const handleOpenAssignHeadModal = async () => {
    setSelectedTeacherId('');
    setHeadReason('');
    setShowAssignHeadModal(true);
    try {
      const { data } = await api.get(`/admin/teachers?department=${selectedDepartment.code}&limit=100`);
      setEligibleTeachers(data.teachers || data || []);
    } catch {
      // ignore
    }
  };

  const handleSubmitAssignHead = async (e) => {
    e.preventDefault();
    if (!selectedTeacherId || !headReason.trim()) {
      return toast.error('Please select teacher and provide appointment reason');
    }

    setSubmittingHead(true);
    try {
      const { data } = await api.post(`/admin/departments/${selectedDepartment.code}/assign-head`, {
        teacherId: selectedTeacherId,
        reason: headReason.trim()
      });
      toast.success(data.message || 'Department Head appointed successfully');
      setShowAssignHeadModal(false);
      fetchDeptOverview(selectedDepartment.code);
      fetchFaculties();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign Department Head');
    } finally {
      setSubmittingHead(false);
    }
  };

  // Assign Course submit
  const handleOpenAssignCourseModal = async () => {
    try {
      const [cRes, tRes] = await Promise.all([
        api.get(`/admin/courses?department=${selectedDepartment.code}`),
        api.get(`/admin/teachers?department=${selectedDepartment.code}&limit=100`)
      ]);
      setDeptCourses(cRes.data || []);
      setEligibleTeachers(tRes.data.teachers || tRes.data || []);
      setShowAssignCourseModal(true);
    } catch {
      toast.error('Failed to load courses or teachers');
    }
  };

  const handleSubmitAssignCourse = async (e) => {
    e.preventDefault();
    if (!assignForm.courseCode || !assignForm.teacherId) {
      return toast.error('Please select Course and Teacher');
    }

    setSubmittingAssignCourse(true);
    try {
      const { data } = await api.post('/admin/teaching-assignments', assignForm);
      toast.success(data.message || 'Course assigned successfully');
      setShowAssignCourseModal(false);
      fetchDeptSubTabData(selectedDepartment.code, 'assignments');
      fetchDeptOverview(selectedDepartment.code);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign course');
    } finally {
      setSubmittingAssignCourse(false);
    }
  };

  // Revoke Course
  const handleRevokeAssignment = async (id, courseCode, teacherName) => {
    if (!window.confirm(`Revoke assignment of ${courseCode} from ${teacherName}?`)) return;
    try {
      await api.delete(`/admin/teaching-assignments/${id}`);
      toast.success('Assignment revoked');
      fetchDeptSubTabData(selectedDepartment.code, 'assignments');
      fetchDeptOverview(selectedDepartment.code);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke');
    }
  };

  // Workload modal
  const handleOpenWorkload = async (teacherId) => {
    try {
      const { data } = await api.get(`/admin/teachers/${teacherId}/teaching-overview`);
      setTeacherWorkloadModal(data);
    } catch {
      toast.error('Failed to load teacher workload');
    }
  };

  // Totals for University Level
  const totalDepartments = faculties.reduce((acc, f) => acc + (f.stats?.departmentsCount || 0), 0);
  const totalTeachers = faculties.reduce((acc, f) => acc + (f.stats?.teachersCount || 0), 0);
  const totalStudents = faculties.reduce((acc, f) => acc + (f.stats?.studentsCount || 0), 0);
  const totalCourses = faculties.reduce((acc, f) => acc + (f.stats?.coursesCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* ── BREADCRUMB NAVIGATION ── */}
      <div className="flex items-center flex-wrap gap-2 text-xs font-semibold px-4 py-2.5 bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-xl shadow-sm">
        <button
          onClick={handleBackToUniversity}
          className={`hover:text-blue-600 transition-colors flex items-center gap-1 ${
            !selectedFaculty ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <FolderTree size={14} /> RUET University Faculties
        </button>

        {selectedFaculty && (
          <>
            <ChevronRight size={13} className="text-slate-400" />
            <button
              onClick={handleBackToFaculty}
              className={`hover:text-blue-600 transition-colors flex items-center gap-1 ${
                !selectedDepartment ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Building2 size={13} /> {selectedFaculty.name} ({selectedFaculty.code})
            </button>
          </>
        )}

        {selectedDepartment && (
          <>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
              <BookOpen size={13} /> {selectedDepartment.name} [{selectedDepartment.code}]
            </span>
          </>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── LEVEL 1: UNIVERSITY FACULTIES OVERVIEW (Default View) ───────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {!selectedFaculty && !selectedDepartment && (
        <div className="space-y-6">
          {/* University Aggregate Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-[#111c38] p-4 rounded-xl border border-slate-200 dark:border-[#1e293b] border-l-4 border-l-blue-500 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                <span>Faculties</span>
                <FolderTree size={14} className="text-blue-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{faculties.length}</p>
            </div>

            <div className="bg-white dark:bg-[#111c38] p-4 rounded-xl border border-slate-200 dark:border-[#1e293b] border-l-4 border-l-indigo-500 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                <span>Departments</span>
                <Building2 size={14} className="text-indigo-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalDepartments}</p>
            </div>

            <div className="bg-white dark:bg-[#111c38] p-4 rounded-xl border border-slate-200 dark:border-[#1e293b] border-l-4 border-l-purple-500 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                <span>Total Teachers</span>
                <Users size={14} className="text-purple-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalTeachers}</p>
            </div>

            <div className="bg-white dark:bg-[#111c38] p-4 rounded-xl border border-slate-200 dark:border-[#1e293b] border-l-4 border-l-cyan-500 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                <span>Total Students</span>
                <GraduationCap size={14} className="text-cyan-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalStudents}</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search faculty or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#15203b] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <button
              onClick={fetchFaculties}
              className="p-2 rounded-xl bg-white dark:bg-[#15203b] border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Faculties Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-full py-12 text-center text-slate-400">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                Loading university faculties...
              </div>
            ) : faculties.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400">
                No faculties found.
              </div>
            ) : (
              faculties.map((f) => (
                <div
                  key={f._id}
                  onClick={() => handleSelectFaculty(f)}
                  className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-extrabold text-xs font-mono border border-blue-200 dark:border-blue-800">
                        Faculty Code: {f.code}
                      </span>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Explore Departments <ChevronRight size={14} />
                      </span>
                    </div>

                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 transition-colors">
                      {f.name}
                    </h2>
                    {f.deanName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Dean: <span className="font-semibold text-slate-700 dark:text-slate-300">{f.deanName}</span>
                      </p>
                    )}
                  </div>

                  {/* Summary Badges Grid */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Departments</p>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">{f.stats?.departmentsCount || 0}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Teachers</p>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">{f.stats?.teachersCount || 0}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Students</p>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">{f.stats?.studentsCount || 0}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Courses</p>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">{f.stats?.coursesCount || 0}</p>
                    </div>
                  </div>

                  {/* Departments Pills */}
                  {f.departments && f.departments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {f.departments.map(d => (
                        <span key={d._id} className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                          {d.code}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── LEVEL 2: FACULTY DEPARTMENTS VIEW ───────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selectedFaculty && !selectedDepartment && (
        <div className="space-y-6">
          {/* Faculty Header Card */}
          <div className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <button
                  onClick={handleBackToUniversity}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline mb-2"
                >
                  <ArrowLeft size={13} /> Back to All Faculties
                </button>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs border border-blue-200 dark:border-blue-800">
                    {selectedFaculty.code}
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {selectedFaculty.name}
                  </h2>
                </div>
                {selectedFaculty.deanName && (
                  <p className="text-xs text-slate-500 mt-1">Dean: {selectedFaculty.deanName}</p>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {selectedFaculty.departments?.length || 0} Departments
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {selectedFaculty.stats?.teachersCount || 0} Teachers
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {selectedFaculty.stats?.studentsCount || 0} Students
                </span>
              </div>
            </div>
          </div>

          {/* Departments Grid */}
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Departments Under {selectedFaculty.code}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedFaculty.departments?.map((d) => (
              <div
                key={d._id}
                onClick={() => handleSelectDepartment(d)}
                className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs font-mono border border-indigo-200 dark:border-indigo-800">
                      {d.code}
                    </span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                      Open Console <ChevronRight size={13} />
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-900 dark:text-white text-base group-hover:text-blue-600 transition-colors">
                    {d.name}
                  </h4>

                  {/* Head Info */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 mt-3 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                      <Shield size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {d.headName || 'Head Vacant'}
                      </p>
                      {d.headId && (
                        <p className="text-[10px] text-slate-400 font-mono">
                          ID: {d.headId}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                    <p className="text-[10px] font-bold text-slate-400">Teachers</p>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">{d.teachersCount || 0}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                    <p className="text-[10px] font-bold text-slate-400">Students</p>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">{d.studentsCount || 0}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                    <p className="text-[10px] font-bold text-slate-400">Courses</p>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">{d.coursesCount || 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── LEVEL 3: DEPARTMENT CONSOLE VIEW ────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selectedDepartment && (
        <div className="space-y-6">
          {/* Department Header Card */}
          <div className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <button
                  onClick={handleBackToFaculty}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline mb-2"
                >
                  <ArrowLeft size={13} /> Back to {selectedFaculty?.code} Departments
                </button>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs border border-indigo-200 dark:border-indigo-800">
                    {selectedDepartment.code}
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {selectedDepartment.name}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Faculty of {selectedFaculty?.name} &bull; RUET Department Administration Console
                </p>
              </div>

              {/* Head Quick Action */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenAssignHeadModal}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
                >
                  <Shield size={14} /> Change / Appoint Head
                </button>
                <button
                  onClick={handleOpenAssignCourseModal}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <Plus size={14} /> Assign Teacher
                </button>
              </div>
            </div>

            {/* Current Head Banner */}
            {deptOverview && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="sm:col-span-2 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    <Shield size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                      Current Department Head
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {deptOverview.department.headName || 'Vacant'}
                    </p>
                    {deptOverview.department.headId && (
                      <p className="text-[11px] text-slate-400 font-mono">
                        Teacher ID: {deptOverview.department.headId} {deptOverview.department.headTeacher?.designation && `• ${deptOverview.department.headTeacher.designation}`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Department Faculty</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white">{deptOverview.stats.teachersCount}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total Courses</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white">{deptOverview.stats.coursesCount}</p>
                </div>
              </div>
            )}
          </div>

          {/* Department Sub-Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 dark:border-[#1e293b] overflow-x-auto text-xs font-semibold">
            {[
              { key: 'assignments', label: 'Current Teaching Assignments', icon: <BookOpen size={14} /> },
              { key: 'teachers', label: 'Department Teachers', icon: <Users size={14} /> },
              { key: 'students', label: 'Department Students', icon: <GraduationCap size={14} /> },
              { key: 'courses', label: 'Course Catalog', icon: <Layers size={14} /> },
              { key: 'head-history', label: 'Headship History', icon: <Clock size={14} /> }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setDeptTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
                  deptTab === tab.key
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ── SUB-TAB 1: CURRENT TEACHING ASSIGNMENTS ── */}
          {deptTab === 'assignments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Teaching Assignments ({deptAssignments.length})
                </h4>
                <button
                  onClick={handleOpenAssignCourseModal}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1"
                >
                  <Plus size={13} /> Assign Teacher
                </button>
              </div>

              <div className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Course Code</th>
                      <th className="py-2.5 px-3">Course Title</th>
                      <th className="py-2.5 px-3">Instructor</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Session / Semester</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loadingSubTab ? (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-400">Loading assignments...</td></tr>
                    ) : deptAssignments.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-400">No active assignments for this department.</td></tr>
                    ) : (
                      deptAssignments.map((a) => (
                        <tr key={a._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{a.courseCode}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{a.courseName}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 dark:text-white">{a.teacherName}</span>
                            <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({a.teacherId})</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${ROLE_COLORS[a.role] || ROLE_COLORS.PRIMARY_TEACHER}`}>
                              {ROLE_LABELS[a.role] || a.role}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{a.semester} [{a.academicSession}]</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenWorkload(a.teacherId)}
                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:text-blue-600 text-[11px] font-semibold"
                              >
                                Workload
                              </button>
                              <button
                                onClick={() => handleRevokeAssignment(a._id, a.courseCode, a.teacherName)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SUB-TAB 2: DEPARTMENT TEACHERS ── */}
          {deptTab === 'teachers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  placeholder="Filter teachers..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-64"
                />
              </div>

              <div className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Teacher ID</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Designation</th>
                      <th className="py-2.5 px-3">Active Courses</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loadingSubTab ? (
                      <tr><td colSpan={5} className="py-8 text-center text-slate-400">Loading teachers...</td></tr>
                    ) : deptTeachers.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-slate-400">No teachers found in this department.</td></tr>
                    ) : (
                      deptTeachers
                        .filter(t => t.name?.toLowerCase().includes(teacherSearch.toLowerCase()) || t.teacherId?.toLowerCase().includes(teacherSearch.toLowerCase()))
                        .map((t) => (
                          <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono font-bold text-purple-600">{t.teacherId}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                              {t.name}
                              {selectedDepartment.headId === t.teacherId && (
                                <span className="ml-2 px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold uppercase">
                                  Head
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{t.designation}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-blue-600">
                                {t.assignedCoursesCount || 0} Courses
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleOpenWorkload(t.teacherId)}
                                className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-blue-600 font-semibold text-[11px]"
                              >
                                View Workload
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SUB-TAB 3: DEPARTMENT STUDENTS ── */}
          {deptTab === 'students' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Filter students by roll or name..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-64"
              />

              <div className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Roll / ID</th>
                      <th className="py-2.5 px-3">Full Name</th>
                      <th className="py-2.5 px-3">Series</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loadingSubTab ? (
                      <tr><td colSpan={4} className="py-8 text-center text-slate-400">Loading students...</td></tr>
                    ) : deptStudents.length === 0 ? (
                      <tr><td colSpan={4} className="py-8 text-center text-slate-400">No students found.</td></tr>
                    ) : (
                      deptStudents
                        .filter(s => s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.rollNumber?.toLowerCase().includes(studentSearch.toLowerCase()))
                        .map((s) => (
                          <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{s.rollNumber}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{s.name}</td>
                            <td className="py-2.5 px-3 font-mono">{s.series}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
                                {s.status || 'Active'}
                              </span>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SUB-TAB 4: DEPARTMENT COURSES ── */}
          {deptTab === 'courses' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Course Code</th>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Credit</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Semester</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {deptCourses.map((c) => (
                      <tr key={c._id || c.courseCode} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{c.courseCode}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{c.courseName || c.title}</td>
                        <td className="py-2.5 px-3">{c.credit || c.creditHours || 3.0}</td>
                        <td className="py-2.5 px-3 font-semibold">{c.courseType || 'Theory'}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{c.semesterLevel || '3-2'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SUB-TAB 5: HEADSHIP HISTORY ── */}
          {deptTab === 'head-history' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-xl p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Historical Headship Records for Dept. of {selectedDepartment.code}
                </h4>

                {deptHeadHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No previous headship records recorded yet.</p>
                ) : (
                  <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    {deptHeadHistory.map((h, idx) => (
                      <div key={h._id || idx} className="relative pl-7 text-xs space-y-1">
                        <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900 shadow-sm" />
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {h.newHeadName} ({h.newHeadId})
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(h.effectiveDate).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Previous Head: <span className="font-semibold">{h.previousHeadName || 'None'}</span>
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2 rounded border border-slate-100 dark:border-slate-800">
                          Reason: {h.reason}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Authorized by: {h.assignedByName || 'System Admin'} &bull; Status: <span className="uppercase font-mono font-bold">{h.status}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: ASSIGN / CHANGE DEPARTMENT HEAD ── */}
      <AnimatePresence>
        {showAssignHeadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                    <Shield size={18} />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Appoint Head of Dept. of {selectedDepartment.code}
                  </h3>
                </div>
                <button onClick={() => setShowAssignHeadModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitAssignHead} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Select Eligible Professor / Teacher *
                  </label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    required
                  >
                    <option value="">-- Choose Teacher --</option>
                    {eligibleTeachers.map(t => (
                      <option key={t._id || t.teacherId} value={t.teacherId}>
                        {t.name} ({t.teacherId}) - {t.designation || 'Faculty'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Reason for Appointment *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Regular 3-year term rotation, administrative handover"
                    value={headReason}
                    onChange={(e) => setHeadReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAssignHeadModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingHead}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  >
                    {submittingHead ? 'Appointing...' : 'Confirm Head Appointment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: ASSIGN TEACHER TO COURSE ── */}
      <AnimatePresence>
        {showAssignCourseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600">
                    <BookOpen size={18} />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Assign Course in {selectedDepartment.code}
                  </h3>
                </div>
                <button onClick={() => setShowAssignCourseModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitAssignCourse} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Select Course *</label>
                  <select
                    value={assignForm.courseCode}
                    onChange={(e) => setAssignForm({ ...assignForm, courseCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    required
                  >
                    <option value="">-- Choose Course --</option>
                    {deptCourses.map(c => (
                      <option key={c._id || c.courseCode} value={c.courseCode}>
                        {c.courseCode} - {c.courseName || c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Select Instructor *</label>
                  <select
                    value={assignForm.teacherId}
                    onChange={(e) => setAssignForm({ ...assignForm, teacherId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    required
                  >
                    <option value="">-- Choose Instructor --</option>
                    {eligibleTeachers.map(t => (
                      <option key={t._id || t.teacherId} value={t.teacherId}>
                        {t.name} ({t.teacherId}) - {t.designation || 'Faculty'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Teaching Role *</label>
                  <select
                    value={assignForm.role}
                    onChange={(e) => setAssignForm({ ...assignForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    required
                  >
                    <option value="PRIMARY_TEACHER">PRIMARY_TEACHER (Main Course In-Charge)</option>
                    <option value="CO_TEACHER">CO_TEACHER (Associate Instructor)</option>
                    <option value="LAB_TEACHER">LAB_TEACHER (Lab / Sessional Instructor)</option>
                    <option value="COURSE_COORDINATOR">COURSE_COORDINATOR</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAssignCourseModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAssignCourse}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    {submittingAssignCourse ? 'Assigning...' : 'Confirm Assignment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: TEACHER WORKLOAD ── */}
      <AnimatePresence>
        {teacherWorkloadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {teacherWorkloadModal.teacher.name}
                  </h3>
                  <p className="text-slate-400">
                    {teacherWorkloadModal.teacher.teacherId} &bull; {teacherWorkloadModal.teacher.designation} &bull; Dept of {teacherWorkloadModal.teacher.department}
                  </p>
                </div>
                <button onClick={() => setTeacherWorkloadModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              {/* Workload Bar */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Courses</p>
                  <p className="text-lg font-extrabold text-blue-600">{teacherWorkloadModal.workload.totalCourses}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Theory / Lab</p>
                  <p className="text-lg font-extrabold text-purple-600">
                    {teacherWorkloadModal.workload.theoryCoursesCount} / {teacherWorkloadModal.workload.labCoursesCount}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Credits</p>
                  <p className="text-lg font-extrabold text-emerald-600">{teacherWorkloadModal.workload.totalCredits}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Students</p>
                  <p className="text-lg font-extrabold text-cyan-600">{teacherWorkloadModal.workload.totalStudents}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold uppercase tracking-wider text-slate-500 mb-2">Active Teaching Assignments</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {teacherWorkloadModal.currentCourses.map(c => (
                    <div key={c._id} className="p-2 rounded border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-blue-600">{c.courseCode}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 ml-2">{c.courseName}</span>
                        <span className="text-[10px] text-slate-400 block">{ROLE_LABELS[c.role] || c.role} &bull; {c.semester} [{c.academicSession}]</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600">ACTIVE</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
