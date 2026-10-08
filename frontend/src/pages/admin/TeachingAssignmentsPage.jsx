import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Users, GraduationCap, Plus, Search, Filter,
  FileSpreadsheet, RefreshCw, CheckCircle2, Clock, X,
  Layers, ChevronRight, UserCheck, Eye, Trash2, Edit, AlertTriangle, Building2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api/axios';

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

export default function TeachingAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [sessionFilter, setSessionFilter] = useState('ALL');
  const [semesterFilter, setSemesterFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [departments, setDepartments] = useState([]);

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeacherWorkload, setSelectedTeacherWorkload] = useState(null);
  const [loadingWorkload, setLoadingWorkload] = useState(false);
  const [selectedCourseRoster, setSelectedCourseRoster] = useState(null);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // New assignment form state
  const [allCourses, setAllCourses] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
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
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data } = await api.get('/departments');
      setDepartments(data.departments || data || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (deptFilter !== 'ALL') params.department = deptFilter;
      if (sessionFilter !== 'ALL') params.session = sessionFilter;
      if (semesterFilter !== 'ALL') params.semester = semesterFilter;
      if (roleFilter !== 'ALL') params.role = roleFilter;
      if (search) params.search = search;
      params.limit = 100;

      const { data } = await api.get('/admin/teaching-assignments/current', { params });
      setAssignments(data.assignments || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load teaching assignments');
    } finally {
      setLoading(false);
    }
  }, [deptFilter, sessionFilter, semesterFilter, roleFilter, search]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Load teacher workload modal
  const handleOpenWorkload = async (teacherId) => {
    setLoadingWorkload(true);
    try {
      const { data } = await api.get(`/admin/teachers/${teacherId}/teaching-overview`);
      setSelectedTeacherWorkload(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load teacher workload');
    } finally {
      setLoadingWorkload(false);
    }
  };

  // Load course roster modal
  const handleOpenRoster = async (courseCode) => {
    setLoadingRoster(true);
    try {
      const { data } = await api.get(`/admin/courses/${encodeURIComponent(courseCode)}/teaching-roster`);
      setSelectedCourseRoster(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load course roster');
    } finally {
      setLoadingRoster(false);
    }
  };

  // Revoke assignment
  const handleRevokeAssignment = async (id, courseCode, teacherName) => {
    if (!window.confirm(`Revoke teaching assignment for ${teacherName} on ${courseCode}? Historical records will be preserved.`)) return;
    try {
      await api.delete(`/admin/teaching-assignments/${id}`);
      toast.success('Teaching assignment revoked successfully');
      fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke assignment');
    }
  };

  // Open Assign Modal
  const handleOpenAssignModal = async () => {
    try {
      const [cRes, tRes] = await Promise.all([
        api.get('/admin/courses'),
        api.get('/admin/teachers?limit=200')
      ]);
      setAllCourses(cRes.data || []);
      setAllTeachers(tRes.data.teachers || tRes.data || []);
      setShowAssignModal(true);
    } catch {
      toast.error('Failed to load courses or teachers for assignment');
    }
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!assignForm.courseCode || !assignForm.teacherId) {
      return toast.error('Please select both Course and Teacher');
    }

    setSubmittingAssign(true);
    try {
      const { data } = await api.post('/admin/teaching-assignments', assignForm);
      toast.success(data.message || 'Course assigned successfully');
      setShowAssignModal(false);
      setAssignForm({
        courseCode: '',
        teacherId: '',
        role: 'PRIMARY_TEACHER',
        series: '22',
        academicSession: '2024-2025',
        semester: '3-2',
        notes: '',
        allowCrossDepartment: false
      });
      fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign course');
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Export to Excel
  const handleExportXLSX = () => {
    if (assignments.length === 0) return toast.info('No assignments to export');
    const rows = assignments.map(a => ({
      'Course Code': a.courseCode,
      'Course Name': a.courseName || a.courseId?.courseName || '',
      'Course Type': a.courseId?.courseType || 'Theory',
      'Department': a.departmentCode,
      'Teacher ID': a.teacherId,
      'Teacher Name': a.teacherName,
      'Designation': a.teacher?.designation || '',
      'Teaching Role': ROLE_LABELS[a.role] || a.role,
      'Academic Session': a.academicSession,
      'Semester': a.semester,
      'Series': a.series,
      'Enrolled Students': a.studentCount || 0,
      'Status': a.status
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Teaching Assignments');
    XLSX.writeFile(wb, `RUET_Teaching_Assignments_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ── HEADER ── */}
      <div className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                Academic Management
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                University-Wide Teaching Assignments
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Current Teacher–Course Assignments
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Real-time monitoring and control of teaching rosters, roles, and faculty workload across all departments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportXLSX}
              className="px-3.5 py-2 rounded-lg bg-white dark:bg-[#15203b] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 hover:border-emerald-500 hover:text-emerald-600 transition-colors shadow-sm"
            >
              <FileSpreadsheet size={14} className="text-emerald-500" /> Export Excel
            </button>
            <button
              onClick={handleOpenAssignModal}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
            >
              <Plus size={14} /> Assign Teacher to Course
            </button>
            <button
              onClick={fetchAssignments}
              disabled={loading}
              className="p-2 rounded-lg bg-white dark:bg-[#15203b] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-500 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search course or teacher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#15203b] text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#15203b] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d._id} value={d.code}>{d.code} - {d.name}</option>
            ))}
          </select>

          {/* Session Filter */}
          <select
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#15203b] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="ALL">All Academic Sessions</option>
            <option value="2025-2026">2025-2026</option>
            <option value="2024-2025">2024-2025</option>
            <option value="2023-2024">2023-2024</option>
          </select>

          {/* Semester Filter */}
          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#15203b] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="ALL">All Semesters</option>
            <option value="1-1">1st Year / 1st Sem (1-1)</option>
            <option value="1-2">1st Year / 2nd Sem (1-2)</option>
            <option value="2-1">2nd Year / 1st Sem (2-1)</option>
            <option value="2-2">2nd Year / 2nd Sem (2-2)</option>
            <option value="3-1">3rd Year / 1st Sem (3-1)</option>
            <option value="3-2">3rd Year / 2nd Sem (3-2)</option>
            <option value="4-1">4th Year / 1st Sem (4-1)</option>
            <option value="4-2">4th Year / 2nd Sem (4-2)</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#15203b] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="ALL">All Teaching Roles</option>
            <option value="PRIMARY_TEACHER">Primary Teacher</option>
            <option value="CO_TEACHER">Co-Teacher</option>
            <option value="LAB_TEACHER">Lab / Sessional Teacher</option>
            <option value="COURSE_COORDINATOR">Course Coordinator</option>
          </select>
        </div>
      </div>

      {/* ── ASSIGNMENTS TABLE ── */}
      <div className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#15203b] border-b border-slate-200 dark:border-slate-700/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Teacher</th>
                <th className="py-3 px-4">Teaching Role</th>
                <th className="py-3 px-4">Session / Sem</th>
                <th className="py-3 px-4 text-center">Enrolled Students</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    Loading current teaching assignments...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No active teaching assignments found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Course */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                          {a.courseCode}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                          {a.courseId?.courseType || 'Theory'}
                        </span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-xs mt-0.5">
                        {a.courseName || a.courseId?.courseName}
                      </p>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        <Building2 size={11} className="text-blue-500" />
                        {a.departmentCode}
                      </span>
                    </td>

                    {/* Teacher */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {a.teacherName}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        <span>{a.teacherId}</span>
                        {a.teacher?.designation && <span>&bull; {a.teacher.designation}</span>}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${ROLE_COLORS[a.role] || ROLE_COLORS.PRIMARY_TEACHER}`}>
                        {ROLE_LABELS[a.role] || a.role}
                      </span>
                    </td>

                    {/* Session / Semester */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 dark:text-slate-200 font-semibold">
                        {a.semester}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {a.academicSession} [Series {a.series}]
                      </div>
                    </td>

                    {/* Enrolled Students */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleOpenRoster(a.courseCode)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 font-bold hover:bg-cyan-100 transition-colors"
                        title="Click to view full student roster"
                      >
                        <GraduationCap size={12} />
                        {a.studentCount || 0} Students
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenWorkload(a.teacherId)}
                          className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-600 dark:text-slate-300 hover:text-blue-600 text-[11px] font-semibold transition-colors"
                          title="View Teacher Workload"
                        >
                          Workload
                        </button>
                        <button
                          onClick={() => handleRevokeAssignment(a._id, a.courseCode, a.teacherName)}
                          className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition-colors"
                          title="Revoke Assignment"
                        >
                          <Trash2 size={13} />
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

      {/* ── MODAL: ASSIGN TEACHER TO COURSE ── */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Assign Teacher to Course</h3>
                    <p className="text-[11px] text-slate-400">Configure semester teaching role and assignment</p>
                  </div>
                </div>
                <button onClick={() => setShowAssignModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveAssignment} className="space-y-3.5 text-xs">
                {/* Select Course */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Select Course *
                  </label>
                  <select
                    value={assignForm.courseCode}
                    onChange={(e) => setAssignForm({ ...assignForm, courseCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-900 dark:text-white"
                    required
                  >
                    <option value="">-- Choose Course --</option>
                    {allCourses.map(c => (
                      <option key={c._id || c.courseCode} value={c.courseCode}>
                        {c.courseCode} - {c.courseName || c.title} ({c.departmentCode || 'ETE'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Teacher */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Select Teacher *
                  </label>
                  <select
                    value={assignForm.teacherId}
                    onChange={(e) => setAssignForm({ ...assignForm, teacherId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-900 dark:text-white"
                    required
                  >
                    <option value="">-- Choose Teacher --</option>
                    {allTeachers.map(t => (
                      <option key={t._id || t.teacherId} value={t.teacherId}>
                        {t.name} ({t.teacherId}) - Dept of {t.department}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Teaching Role */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Teaching Role *
                  </label>
                  <select
                    value={assignForm.role}
                    onChange={(e) => setAssignForm({ ...assignForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-900 dark:text-white"
                    required
                  >
                    <option value="PRIMARY_TEACHER">PRIMARY_TEACHER (Course In-Charge / Main Theory)</option>
                    <option value="CO_TEACHER">CO_TEACHER (Associate / Co-Instructor)</option>
                    <option value="LAB_TEACHER">LAB_TEACHER (Sessional / Lab In-Charge)</option>
                    <option value="COURSE_COORDINATOR">COURSE_COORDINATOR (Course Coordinator)</option>
                  </select>
                </div>

                {/* Session & Semester */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                      Session
                    </label>
                    <input
                      type="text"
                      value={assignForm.academicSession}
                      onChange={(e) => setAssignForm({ ...assignForm, academicSession: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                      Semester
                    </label>
                    <input
                      type="text"
                      value={assignForm.semester}
                      onChange={(e) => setAssignForm({ ...assignForm, semester: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                      Series
                    </label>
                    <input
                      type="text"
                      value={assignForm.series}
                      onChange={(e) => setAssignForm({ ...assignForm, series: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                {/* Cross-department allowance */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="allowCross"
                    checked={assignForm.allowCrossDepartment}
                    onChange={(e) => setAssignForm({ ...assignForm, allowCrossDepartment: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="allowCross" className="text-xs text-slate-600 dark:text-slate-400 font-medium cursor-pointer">
                    Authorize cross-department teaching assignment
                  </label>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAssign}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20"
                  >
                    {submittingAssign ? 'Assigning...' : 'Confirm Assignment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: TEACHER WORKLOAD MODAL ── */}
      <AnimatePresence>
        {selectedTeacherWorkload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center font-bold text-sm">
                    {selectedTeacherWorkload.teacher.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {selectedTeacherWorkload.teacher.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {selectedTeacherWorkload.teacher.teacherId} &bull; {selectedTeacherWorkload.teacher.designation} &bull; Dept. of {selectedTeacherWorkload.teacher.department}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedTeacherWorkload(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              {/* Workload Stats Bar */}
              <div className="grid grid-cols-4 gap-2.5">
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Current Courses</p>
                  <p className="text-xl font-extrabold text-blue-600">{selectedTeacherWorkload.workload.totalCourses}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Theory / Lab</p>
                  <p className="text-xl font-extrabold text-purple-600">{selectedTeacherWorkload.workload.theoryCoursesCount} / {selectedTeacherWorkload.workload.labCoursesCount}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total Credits</p>
                  <p className="text-xl font-extrabold text-emerald-600">{selectedTeacherWorkload.workload.totalCredits}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total Students</p>
                  <p className="text-xl font-extrabold text-cyan-600">{selectedTeacherWorkload.workload.totalStudents}</p>
                </div>
              </div>

              {/* Current Assignments List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Active Teaching Assignments</h4>
                <div className="space-y-2">
                  {selectedTeacherWorkload.currentCourses.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No active courses currently assigned.</p>
                  ) : (
                    selectedTeacherWorkload.currentCourses.map(c => (
                      <div key={c._id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-600">{c.courseCode}</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{c.courseName}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Role: {ROLE_LABELS[c.role] || c.role} &bull; {c.semester} [{c.academicSession}] &bull; {c.studentCount} Students
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 text-[10px] font-bold">
                          ACTIVE
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Historical Courses List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Course Teaching History (Preserved)</h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedTeacherWorkload.courseHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No historical course records.</p>
                  ) : (
                    selectedTeacherWorkload.courseHistory.map(h => (
                      <div key={h._id} className="p-2 rounded border border-slate-100 dark:border-slate-800/60 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">{h.courseCode} - {h.courseName}</span>
                          <span className="text-[10px] text-slate-400 ml-2">({h.semester} [{h.academicSession}])</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-mono">
                          {h.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: COURSE ENROLLED STUDENTS ROSTER ── */}
      <AnimatePresence>
        {selectedCourseRoster && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600 text-base">{selectedCourseRoster.course.courseCode}</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">{selectedCourseRoster.course.courseName}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dept. of {selectedCourseRoster.course.departmentCode} &bull; {selectedCourseRoster.studentCount} Students Enrolled
                  </p>
                </div>
                <button onClick={() => setSelectedCourseRoster(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              {/* Assigned Teachers Banner */}
              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-1.5">
                  Assigned Instructors
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedCourseRoster.assignedTeachers.map(t => (
                    <span key={t._id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <UserCheck size={12} className="text-blue-500" />
                      {t.teacherName} ({ROLE_LABELS[t.role] || t.role})
                    </span>
                  ))}
                </div>
              </div>

              {/* Students Roster Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Enrolled Student Roster</h4>
                <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Roll / ID</th>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Series</th>
                        <th className="py-2 px-3">Department</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedCourseRoster.students.map((s, idx) => (
                        <tr key={s._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-mono font-bold text-blue-600">{s.rollNumber}</td>
                          <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">{s.name}</td>
                          <td className="py-2 px-3">{s.series}</td>
                          <td className="py-2 px-3">{s.department}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
