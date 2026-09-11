import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, GraduationCap, BookOpen, ClipboardList,
  Plus, Trash2, Edit, Search, Shield, RefreshCw,
  Sliders, UserPlus, FileSpreadsheet, Check, X,
  Building2, Hash, Phone, Mail, Award, AlertTriangle
} from 'lucide-react';

const DEPARTMENTS = [
  'CSE', 'EEE', 'ME', 'CIVIL', 'ETE', 'ECE',
  'IPE', 'MSE', 'CME', 'MTE', 'BECM', 'ARCHI'
];

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Teachers State
  const [teachers, setTeachers] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherDept, setTeacherDept] = useState('');
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [editTeacher, setEditTeacher] = useState(null);
  const [teacherForm, setTeacherForm] = useState({
    name: '', teacherId: '', department: 'CSE', contactNo: '', password: ''
  });

  // Students State
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDept, setStudentDept] = useState('');
  const [studentSeries, setStudentSeries] = useState('');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({
    name: '', series: '22', rollNumber: '', department: 'CSE', contactNo: '', password: ''
  });

  // Courses State
  const [courses, setCourses] = useState([]);
  const [courseSearch, setCourseSearch] = useState('');
  const [courseDept, setCourseDept] = useState('');

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch {
      toast.error('Failed to load system statistics');
    }
  }, []);

  // Fetch Teachers
  const fetchTeachers = useCallback(async () => {
    try {
      let url = '/admin/teachers?';
      if (teacherDept) url += `department=${teacherDept}&`;
      if (teacherSearch) url += `search=${teacherSearch}&`;
      const { data } = await api.get(url);
      setTeachers(data);
    } catch {
      toast.error('Failed to load teachers roster');
    }
  }, [teacherDept, teacherSearch]);

  // Fetch Students
  const fetchStudents = useCallback(async () => {
    try {
      let url = '/admin/students?';
      if (studentDept) url += `department=${studentDept}&`;
      if (studentSeries) url += `series=${studentSeries}&`;
      if (studentSearch) url += `search=${studentSearch}&`;
      const { data } = await api.get(url);
      setStudents(data);
    } catch {
      toast.error('Failed to load students roster');
    }
  }, [studentDept, studentSeries, studentSearch]);

  // Fetch Courses
  const fetchCourses = useCallback(async () => {
    try {
      let url = '/admin/courses?';
      if (courseDept) url += `department=${courseDept}&`;
      if (courseSearch) url += `search=${courseSearch}&`;
      const { data } = await api.get(url);
      setCourses(data);
    } catch {
      toast.error('Failed to load courses');
    }
  }, [courseDept, courseSearch]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchTeachers(), fetchStudents(), fetchCourses()]);
    setLoading(false);
  }, [fetchStats, fetchTeachers, fetchStudents, fetchCourses]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── TEACHER HANDLERS ────────────────────────────────────────────────
  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/teachers', teacherForm);
      toast.success('Teacher created successfully!');
      setShowAddTeacherModal(false);
      setTeacherForm({ name: '', teacherId: '', department: 'CSE', contactNo: '', password: '' });
      fetchTeachers();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create teacher');
    }
  };

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/teachers/${editTeacher._id}`, editTeacher);
      toast.success('Teacher updated successfully!');
      setEditTeacher(null);
      fetchTeachers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update teacher');
    }
  };

  const handleDeleteTeacher = async (id) => {
    if (!window.confirm('Are you sure you want to remove this teacher? Their allocated courses will also be purged.')) return;
    try {
      await api.delete(`/admin/teachers/${id}`);
      toast.success('Teacher removed successfully');
      fetchTeachers();
      fetchCourses();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete teacher');
    }
  };

  // ── STUDENT HANDLERS ────────────────────────────────────────────────
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/students', studentForm);
      toast.success('Student created successfully!');
      setShowAddStudentModal(false);
      setStudentForm({ name: '', series: '22', rollNumber: '', department: 'CSE', contactNo: '', password: '' });
      fetchStudents();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create student');
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/students/${editStudent._id}`, editStudent);
      toast.success('Student updated successfully!');
      setEditStudent(null);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update student');
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Delete this student and all associated attendance/marks logs?')) return;
    try {
      await api.delete(`/admin/students/${id}`);
      toast.success('Student record removed');
      fetchStudents();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete student');
    }
  };

  // ── COURSE HANDLERS ─────────────────────────────────────────────────
  const handleDeleteCourse = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course and all associated evaluation records?')) return;
    try {
      await api.delete(`/admin/courses/${id}`);
      toast.success('Course purged successfully');
      fetchCourses();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete course');
    }
  };

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-sm";
  const labelClass = "text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block";

  return (
    <div className="space-y-8 pb-16">
      
      {/* Admin Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-amber-950 p-6 sm:p-8 text-white shadow-xl overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg">
              <Shield size={32} />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold mb-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Master Admin Console
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
                Institutional Administration Hub
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Centralized oversight for students, faculty roster, courses, and continuous lab logs.
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="self-start md:self-center px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold transition-all flex items-center gap-2 backdrop-blur shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { title: 'Total Students', value: stats?.totalStudents ?? '...', icon: <GraduationCap size={24} />, color: 'from-blue-600 to-cyan-500', shadow: 'shadow-blue-500/20' },
          { title: 'Faculty Members', value: stats?.totalTeachers ?? '...', icon: <Users size={24} />, color: 'from-purple-600 to-indigo-500', shadow: 'shadow-purple-500/20' },
          { title: 'Active Courses', value: stats?.totalCourses ?? '...', icon: <BookOpen size={24} />, color: 'from-emerald-600 to-teal-500', shadow: 'shadow-emerald-500/20' },
          { title: 'Attendance Logs', value: stats?.totalAttendance ?? '...', icon: <ClipboardList size={24} />, color: 'from-amber-600 to-orange-500', shadow: 'shadow-amber-500/20' },
        ].map((card, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex items-center gap-4"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} ${card.shadow} flex items-center justify-center text-white shrink-0 shadow-lg`}>
              {card.icon}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.title}</p>
              <h3 className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white mt-0.5">
                {card.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Admin Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview Analytics', icon: <Sliders size={16} /> },
          { key: 'teachers', label: `Teachers (${teachers.length})`, icon: <Users size={16} /> },
          { key: 'students', label: `Students (${students.length})`, icon: <GraduationCap size={16} /> },
          { key: 'courses', label: `Courses (${courses.length})`, icon: <BookOpen size={16} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ────────────────── TAB 1: OVERVIEW ────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Department Distribution Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 size={18} className="text-amber-500" />
              Student Enrollment by Department
            </h3>
            <div className="space-y-3">
              {stats?.studentDeptDistribution && stats.studentDeptDistribution.length > 0 ? (
                stats.studentDeptDistribution.map((item) => (
                  <div key={item._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{item._id}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        {item.count} Enrolled
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No student enrollment data available yet.</p>
              )}
            </div>
          </div>

          {/* Series Distribution Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Hash size={18} className="text-amber-500" />
              Student Cohorts by Series Batch
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
                <p className="text-sm text-slate-400">No series batch data recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── TAB 2: TEACHERS ────────────────── */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          {/* Action & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <select
                value={teacherDept}
                onChange={(e) => setTeacherDept(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowAddTeacherModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={15} />
              Add New Faculty
            </button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Teacher Name</th>
                  <th className="px-4 py-3.5">ID</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5">Contact</th>
                  <th className="px-4 py-3.5">Courses</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {teachers.length > 0 ? (
                  teachers.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center text-xs shrink-0">
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        {t.name}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-purple-600 dark:text-purple-400 font-bold">{t.teacherId}</td>
                      <td className="px-4 py-3.5"><span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold">{t.department}</span></td>
                      <td className="px-4 py-3.5 text-slate-500">{t.contactNo || 'N/A'}</td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[11px]">
                          {t.allocatedCourses?.length || 0} Courses
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => setEditTeacher(t)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                          title="Edit Teacher"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(t._id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete Teacher"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No faculty members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────── TAB 3: STUDENTS ────────────────── */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Action & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search roll or name..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <select
                value={studentDept}
                onChange={(e) => setStudentDept(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Series (e.g. 22)"
                value={studentSeries}
                onChange={(e) => setStudentSeries(e.target.value)}
                className="w-28 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>

            <button
              onClick={() => setShowAddStudentModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={15} />
              Add Student
            </button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Roll Number</th>
                  <th className="px-4 py-3.5">Name</th>
                  <th className="px-4 py-3.5">Series</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5">Contact</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {students.length > 0 ? (
                  students.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">{s.rollNumber}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">{s.name}</td>
                      <td className="px-4 py-3.5">Series {s.series}</td>
                      <td className="px-4 py-3.5"><span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold">{s.department}</span></td>
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

      {/* ────────────────── TAB 4: COURSES ────────────────── */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search course code or name..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>

            <select
              value={courseDept}
              onChange={(e) => setCourseDept(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Course Code</th>
                  <th className="px-4 py-3.5">Course Title</th>
                  <th className="px-4 py-3.5">Series & Dept</th>
                  <th className="px-4 py-3.5">Instructor</th>
                  <th className="px-4 py-3.5">Scheme Breakdown (75 Marks)</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {courses.length > 0 ? (
                  courses.map((c) => {
                    const cfg = c.assessmentConfig || {};
                    return (
                      <tr key={c._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">{c.courseCode}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">{c.courseName}</td>
                        <td className="px-4 py-3.5">Series {c.series} ({c.department})</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                          {c.teacherName} <span className="text-slate-400 text-[11px]">({c.teacherId})</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600">Att:{cfg.attendance ?? 5}</span>
                            <span className="px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600">Rep:{cfg.report ?? 10}</span>
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-600">Perf:{cfg.performance ?? 5}</span>
                            <span className="px-1.5 py-0.5 rounded bg-pink-50 dark:bg-pink-950/50 text-pink-600">Quiz:{cfg.quiz ?? 30}</span>
                            <span className="px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/50 text-orange-600">Test:{cfg.test ?? 20}</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">Other:{cfg.others ?? 5}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleDeleteCourse(c._id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Purge Course"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No courses found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────── ADD TEACHER MODAL ────────────────── */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">Add New Faculty Member</h3>
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
                  <input required type="text" value={teacherForm.teacherId} onChange={e => setTeacherForm({...teacherForm, teacherId: e.target.value.toUpperCase()})} className={inputClass} placeholder="e.g. JHN" />
                </div>
                <div>
                  <label className={labelClass}>Department</label>
                  <select value={teacherForm.department} onChange={e => setTeacherForm({...teacherForm, department: e.target.value})} className={inputClass}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
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
                <button type="submit" className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/30">Save Teacher</button>
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
                  <select value={editTeacher.department} onChange={e => setEditTeacher({...editTeacher, department: e.target.value})} className={inputClass}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
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
              <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">Add New Student</h3>
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
                  <input required type="text" value={studentForm.rollNumber} onChange={e => setStudentForm({...studentForm, rollNumber: e.target.value})} className={inputClass} placeholder="e.g. 2211001" />
                </div>
                <div>
                  <label className={labelClass}>Series Batch</label>
                  <input required type="text" value={studentForm.series} onChange={e => setStudentForm({...studentForm, series: e.target.value})} className={inputClass} placeholder="e.g. 22" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Department</label>
                  <select value={studentForm.department} onChange={e => setStudentForm({...studentForm, department: e.target.value})} className={inputClass}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Department</label>
                  <select value={editStudent.department} onChange={e => setEditStudent({...editStudent, department: e.target.value})} className={inputClass}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Contact No</label>
                  <input required type="text" value={editStudent.contactNo} onChange={e => setEditStudent({...editStudent, contactNo: e.target.value})} className={inputClass} />
                </div>
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

    </div>
  );
}
