import { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  Users, Plus, Search, RefreshCw, Upload, Trash2, Edit,
  CheckCircle2, XCircle, Shield, ChevronLeft, ChevronRight, Eye, X
} from 'lucide-react';

export default function HeadStudentsPage() {
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, regular: 0, irregular: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({
    name: '', rollNumber: '', registrationNumber: '', series: '', semester: '1st Semester', session: '', contactNo: '', email: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const deptCode = user?.departmentCode || user?.department || 'ETE';

  const fetchStudents = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum,
        limit: 25,
        ...(seriesFilter && { series: seriesFilter }),
        ...(sessionFilter && { session: sessionFilter }),
        ...(semesterFilter && { semester: semesterFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(search.trim() && { search: search.trim() })
      });

      const res = await api.get(`/head/students?${params}`);
      if (res.data?.success) {
        setStudents(res.data.students || []);
        setStats(res.data.stats || { total: 0, active: 0, regular: 0, irregular: 0 });
        setPagination(res.data.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [seriesFilter, sessionFilter, semesterFilter, statusFilter, search]);

  useEffect(() => {
    fetchStudents(1);
  }, [fetchStudents]);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.rollNumber) {
      toast.warning('Name and Student Roll are required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/head/students', studentForm);
      if (res.data?.success) {
        toast.success(`Student ${studentForm.rollNumber} created successfully!`);
        setShowAddModal(false);
        setStudentForm({
          name: '', rollNumber: '', registrationNumber: '', series: '', semester: '1st Semester', session: '', contactNo: '', email: ''
        });
        fetchStudents(pagination.page);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!editStudent) return;
    setSubmitting(true);
    try {
      const res = await api.put(`/head/students/${editStudent._id}`, editStudent);
      if (res.data?.success) {
        toast.success(`Student ${editStudent.rollNumber} updated`);
        setEditStudent(null);
        fetchStudents(pagination.page);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async (studentId, roll) => {
    if (!window.confirm(`Are you sure you want to permanently delete student ${roll}?`)) return;
    try {
      const res = await api.delete(`/head/students/${studentId}`);
      if (res.data?.success) {
        toast.success(`Student ${roll} removed`);
        fetchStudents(pagination.page);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete student');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Department Head • {deptCode} Students</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Department Student Roster
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Strictly scoped to students of {deptCode} department.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchStudents(pagination.page)}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/head/import"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>Import Excel</span>
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* ── Metric Summary Pills ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-400 uppercase">TOTAL STUDENTS</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total || pagination.total}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-semibold text-emerald-600 uppercase">ACTIVE LEARNERS</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.active}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-400 uppercase">REGULAR STATUS</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{stats.regular}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-400 uppercase">IRREGULAR</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats.irregular}</p>
        </div>
      </div>

      {/* ── Search & Filter Controls ──────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, roll, reg, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <input
            type="text"
            placeholder="Series (e.g. 22)"
            value={seriesFilter}
            onChange={(e) => setSeriesFilter(e.target.value)}
            className="w-28 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />

          <input
            type="text"
            placeholder="Session (e.g. 2022-23)"
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            className="w-36 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />

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
                <th className="px-4 py-3">Series</th>
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">Semester</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center text-slate-400 font-sans">
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center text-slate-400 font-sans">
                    No students found in {deptCode} database.
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
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">
                      {student.series}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {student.session || '—'}
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
                    <td className="px-4 py-3 text-right space-x-1 font-sans">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditStudent(student)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        title="Edit Student"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student._id, student.rollNumber)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Delete Student"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {students.length} of {pagination.total} students
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchStudents(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <span>Page {pagination.page} of {pagination.totalPages}</span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchStudents(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Student Modal ─────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Student ({deptCode})</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Student Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jahid Hasan"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Roll Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2204001"
                    value={studentForm.rollNumber}
                    onChange={(e) => setStudentForm({ ...studentForm, rollNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Registration No</label>
                  <input
                    type="text"
                    placeholder="e.g. 725"
                    value={studentForm.registrationNumber}
                    onChange={(e) => setStudentForm({ ...studentForm, registrationNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Series</label>
                  <input
                    type="text"
                    placeholder="e.g. 22"
                    value={studentForm.series}
                    onChange={(e) => setStudentForm({ ...studentForm, series: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Session</label>
                  <input
                    type="text"
                    placeholder="e.g. 2022-23"
                    value={studentForm.session}
                    onChange={(e) => setStudentForm({ ...studentForm, session: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs rounded-xl text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {submitting ? 'Saving...' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Student Detail Modal ──────────────────────────────────── */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Student Profile</h3>
              <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                <p className="text-slate-400 text-[10px] uppercase font-bold">NAME & ID</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedStudent.name}</p>
                <p className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{selectedStudent.rollNumber}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <p className="text-slate-400 text-[10px] font-bold">REG. NO</p>
                  <p className="font-mono">{selectedStudent.registrationNumber || 'N/A'}</p>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <p className="text-slate-400 text-[10px] font-bold">DEPARTMENT</p>
                  <p className="font-bold">{selectedStudent.department}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <p className="text-slate-400 text-[10px] font-bold">SERIES</p>
                  <p className="font-bold">{selectedStudent.series}</p>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <p className="text-slate-400 text-[10px] font-bold">SESSION</p>
                  <p>{selectedStudent.session || 'N/A'}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedStudent(null)}
              className="w-full py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Edit Student Modal ────────────────────────────────────────── */}
      {editStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Student: {editStudent.rollNumber}</h3>
              <button onClick={() => setEditStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Student Name</label>
                <input
                  type="text"
                  required
                  value={editStudent.name || ''}
                  onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Registration No</label>
                  <input
                    type="text"
                    value={editStudent.registrationNumber || ''}
                    onChange={(e) => setEditStudent({ ...editStudent, registrationNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Series</label>
                  <input
                    type="text"
                    value={editStudent.series || ''}
                    onChange={(e) => setEditStudent({ ...editStudent, series: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Session</label>
                  <input
                    type="text"
                    value={editStudent.session || ''}
                    onChange={(e) => setEditStudent({ ...editStudent, session: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Status</label>
                  <select
                    value={editStudent.status || 'active'}
                    onChange={(e) => setEditStudent({ ...editStudent, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="graduated">Graduated</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditStudent(null)}
                  className="px-4 py-2 text-xs rounded-xl text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {submitting ? 'Saving...' : 'Update Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
