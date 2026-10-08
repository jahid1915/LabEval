import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  BookOpen, Users, UserCheck, Plus, RefreshCw, Trash2, CheckCircle2,
  AlertCircle, Shield, Sparkles, Filter, ChevronRight
} from 'lucide-react';

export default function HeadTeachingAssignmentsPage() {
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);

  // Assignment Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    courseId: '',
    teacherId: '', // Teacher ID or 'MYSELF'
    role: 'PRIMARY_TEACHER',
    academicSession: '2024-2025',
    semester: '1st Semester',
    series: '22',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const deptCode = user?.departmentCode || user?.department || 'ETE';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [assRes, teachRes, crsRes] = await Promise.all([
        api.get('/head/teaching-assignments'),
        api.get('/head/teachers'),
        api.get('/head/courses')
      ]);

      if (assRes.data?.success) setAssignments(assRes.data.assignments || []);
      if (teachRes.data?.success) setTeachers(teachRes.data.teachers || []);
      if (crsRes.data?.success) setCourses(crsRes.data.courses || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!form.courseId || !form.teacherId) {
      toast.warning('Please select both a course and a teacher');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/head/teaching-assignments', form);
      if (res.data?.success) {
        toast.success(res.data.message || 'Course assigned successfully!');
        setShowModal(false);
        setForm({
          courseId: '',
          teacherId: '',
          role: 'PRIMARY_TEACHER',
          academicSession: '2024-2025',
          semester: '1st Semester',
          series: '22',
          notes: ''
        });
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this teaching assignment?')) return;
    try {
      const res = await api.delete(`/head/teaching-assignments/${id}`);
      if (res.data?.success) {
        toast.success('Assignment revoked successfully');
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke assignment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-violet-950/40 border border-blue-500/20 rounded-2xl shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">
              {deptCode} Department
            </span>
            <span className="px-2.5 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3" /> Department Academic Authority
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-400" />
            Course Teaching Assignments
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Allocate courses to department faculty members, assign courses to yourself, and manage teaching workloads.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-900/30 transition"
          >
            <Plus className="w-4 h-4" />
            Assign Course
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Assignments</p>
          <p className="text-2xl font-bold text-white mt-1">{assignments.filter(a => a.status === 'active').length}</p>
        </div>
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Assigned Teachers</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            {new Set(assignments.map(a => a.teacherId)).size}
          </p>
        </div>
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Department Courses</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{courses.length}</p>
        </div>
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Department Faculty</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{teachers.length}</p>
        </div>
      </div>

      {/* Current Assignments Table (Section 20) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-400" />
            Current Teaching Assignments Map
          </h3>
          <span className="text-xs text-slate-400">{assignments.length} Total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Assigned Teacher</th>
                <th className="py-3 px-4">Session / Series</th>
                <th className="py-3 px-4">Semester</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                    Loading assignments...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                    No course assignments found. Click "Assign Course" to create one.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4">
                      <p className="font-bold text-white font-mono">{a.courseCode}</p>
                      <p className="text-xs text-slate-400 line-clamp-1">{a.courseName}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-200">{a.teacherName}</p>
                      <p className="text-xs font-mono text-slate-400">{a.teacherId}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300">
                      {a.academicSession} • {a.series} Series
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300">
                      {a.semester}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded font-medium">
                        {a.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                        a.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {a.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : null}
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {a.status === 'active' && (
                        <button
                          onClick={() => handleRevoke(a._id)}
                          title="Revoke Assignment"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Assign Course Modal (Sections 17, 18) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-blue-500/30 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                Assign Course to Teacher
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Select Course</label>
                <select
                  value={form.courseId}
                  onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.courseCode} — {c.courseTitle} ({c.credit || 3} cr)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Select Teacher (or Assign to Yourself)
                </label>
                <select
                  value={form.teacherId}
                  onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">-- Choose Teacher --</option>
                  <option value="MYSELF" className="font-bold text-blue-400 bg-slate-900">
                    ⭐ [ Myself — Department Head ]
                  </option>
                  {teachers.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.teacherId}) — {t.designation || 'Lecturer'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Session</label>
                  <select
                    value={form.academicSession}
                    onChange={(e) => setForm({ ...form, academicSession: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="2024-2025">2024-2025</option>
                    <option value="2023-2024">2023-2024</option>
                    <option value="2022-2023">2022-2023</option>
                    <option value="2021-2022">2021-2022</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Series</label>
                  <select
                    value={form.series}
                    onChange={(e) => setForm({ ...form, series: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="20">20 Series</option>
                    <option value="21">21 Series</option>
                    <option value="22">22 Series</option>
                    <option value="23">23 Series</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Semester</label>
                  <input
                    type="text"
                    value={form.semester}
                    onChange={(e) => setForm({ ...form, semester: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Teaching Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="PRIMARY_TEACHER">PRIMARY_TEACHER</option>
                  <option value="CO_TEACHER">CO_TEACHER</option>
                  <option value="LAB_TEACHER">LAB_TEACHER</option>
                  <option value="COURSE_COORDINATOR">COURSE_COORDINATOR</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-900/30 transition disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {submitting ? 'Assigning...' : 'Assign Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
