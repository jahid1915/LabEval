import { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  Users, Search, RefreshCw, CheckCircle2, XCircle, Shield,
  ChevronLeft, ChevronRight, Eye, AlertCircle, FileEdit, Send
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
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [correctionStudent, setCorrectionStudent] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({
    field: 'name',
    proposedValue: '',
    reason: ''
  });
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

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

  const handleRequestCorrection = async (e) => {
    e.preventDefault();
    if (!correctionStudent) return;
    if (!correctionForm.proposedValue.trim() || !correctionForm.reason.trim()) {
      toast.warning('Proposed value and reason are required');
      return;
    }

    setSubmittingCorrection(true);
    try {
      const res = await api.post('/head/students/request-correction', {
        studentId: correctionStudent._id,
        field: correctionForm.field,
        proposedValue: correctionForm.proposedValue.trim(),
        reason: correctionForm.reason.trim()
      });

      if (res.data?.success) {
        toast.success('Data correction request submitted to Administrator for review!');
        setCorrectionStudent(null);
        setCorrectionForm({ field: 'name', proposedValue: '', reason: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit correction request');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/20 rounded-2xl shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">
              {deptCode} Department
            </span>
            <span className="px-2.5 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3" /> View & Academic Monitoring Only
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            Department Students Directory
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Showing all registered students of <span className="font-semibold text-white">{deptCode}</span>. Master records are managed by System Administration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchStudents(pagination.page)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Students</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Students</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.active.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Regular</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{stats.regular.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Irregular</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{stats.irregular.toLocaleString()}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, roll, or registration..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 text-sm text-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={seriesFilter}
              onChange={(e) => setSeriesFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">All Series</option>
              <option value="20">20 Series</option>
              <option value="21">21 Series</option>
              <option value="22">22 Series</option>
              <option value="23">23 Series</option>
              <option value="24">24 Series</option>
            </select>
          </div>

          <div>
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">All Sessions</option>
              <option value="2024-2025">2024-2025</option>
              <option value="2023-2024">2023-2024</option>
              <option value="2022-2023">2022-2023</option>
              <option value="2021-2022">2021-2022</option>
              <option value="2020-2021">2020-2021</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Student Roll</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Reg No</th>
                <th className="py-3 px-4">Series</th>
                <th className="py-3 px-4">Session</th>
                <th className="py-3 px-4">Semester</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                    No students found matching your filters.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-white">
                      {student.rollNumber}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-200">{student.name}</p>
                      {student.email && <p className="text-xs text-slate-400">{student.email}</p>}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-xs">
                      {student.registrationNumber || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded">
                        {student.series} Series
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300">
                      {student.session}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300">
                      {student.semester || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                        student.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {student.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {student.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedStudent(student)}
                          title="View Profile"
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setCorrectionStudent(student);
                            setCorrectionForm({ field: 'name', proposedValue: student.name, reason: '' });
                          }}
                          title="Request Data Correction from Admin"
                          className="flex items-center gap-1 px-2 py-1 text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          Correct
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400">
          <div>
            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} students
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchStudents(pagination.page - 1)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-slate-300 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-slate-300">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchStudents(pagination.page + 1)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-slate-300 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* View Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Student Academic Record
              </h3>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <p className="text-xs text-slate-500 uppercase">Roll Number</p>
                <p className="font-mono font-bold text-blue-400 mt-0.5">{selectedStudent.rollNumber}</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <p className="text-xs text-slate-500 uppercase">Registration</p>
                <p className="font-mono text-slate-200 mt-0.5">{selectedStudent.registrationNumber || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 col-span-2">
                <p className="text-xs text-slate-500 uppercase">Full Name</p>
                <p className="font-semibold text-white mt-0.5">{selectedStudent.name}</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <p className="text-xs text-slate-500 uppercase">Department</p>
                <p className="font-semibold text-slate-200 mt-0.5">{selectedStudent.department}</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <p className="text-xs text-slate-500 uppercase">Series / Session</p>
                <p className="text-slate-200 mt-0.5">{selectedStudent.series} Series • {selectedStudent.session}</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <p className="text-xs text-slate-500 uppercase">Current Semester</p>
                <p className="text-slate-200 mt-0.5">{selectedStudent.semester || '1st Semester'}</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <p className="text-xs text-slate-500 uppercase">Status</p>
                <p className="text-slate-200 mt-0.5 capitalize">{selectedStudent.status}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Data Correction Modal (Section 29) */}
      {correctionStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/30 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-amber-400" />
                Request Data Correction
              </h3>
              <button
                onClick={() => setCorrectionStudent(null)}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Department Heads cannot edit master records directly. Your request will be reviewed by the System Administrator.
            </p>

            <form onSubmit={handleRequestCorrection} className="space-y-4 text-sm">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Target Student</p>
                  <p className="font-semibold text-white">{correctionStudent.name}</p>
                </div>
                <span className="font-mono font-bold text-blue-400">{correctionStudent.rollNumber}</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Field to Correct</label>
                <select
                  value={correctionForm.field}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, field: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="name">Student Name</option>
                  <option value="rollNumber">Roll / Student ID</option>
                  <option value="registrationNumber">Registration Number</option>
                  <option value="series">Series</option>
                  <option value="session">Academic Session</option>
                  <option value="semester">Semester</option>
                  <option value="status">Status</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Proposed Value</label>
                <input
                  type="text"
                  placeholder="Enter corrected value"
                  value={correctionForm.proposedValue}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, proposedValue: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Reason / Justification</label>
                <textarea
                  rows={3}
                  placeholder="Explain why this correction is required..."
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectionStudent(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCorrection}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-amber-900/30 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submittingCorrection ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
