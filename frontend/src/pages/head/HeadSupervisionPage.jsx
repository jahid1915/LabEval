import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  FolderGit2, Users, UserCheck, Plus, Search, RefreshCw, CheckCircle2,
  AlertCircle, ChevronRight, Layers, Award, Sparkles, BookOpen, ExternalLink, Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HeadSupervisionPage() {
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'projects' | 'assignments'
  const [activityFilter, setActivityFilter] = useState('ALL');

  // Data
  const [overview, setOverview] = useState({ summary: {}, teachers: [] });
  const [projects, setProjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [teachersList, setTeachersList] = useState([]);

  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    activityType: 'PROJECT_I',
    session: '2022-2023',
    series: '22',
    semester: '4th',
    teacherId: '',
    projectTitle: '',
    projectDescription: ''
  });
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const deptCode = user?.departmentCode || user?.department || 'ETE';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, listRes, teachRes] = await Promise.all([
        api.get('/head/supervision/overview'),
        api.get(`/head/supervision/list${activityFilter !== 'ALL' ? `?activityType=${activityFilter}` : ''}`),
        api.get('/head/teachers')
      ]);

      if (ovRes.data?.success) setOverview(ovRes.data);
      if (listRes.data?.success) {
        setProjects(listRes.data.projects || []);
        setAssignments(listRes.data.assignments || []);
      }
      if (teachRes.data?.success) setTeachersList(teachRes.data.teachers || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load supervision data');
    } finally {
      setLoading(false);
    }
  }, [activityFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch eligible students when modal filters change
  const fetchEligible = async () => {
    if (!assignForm.session || !assignForm.series) return;
    setLoadingEligible(true);
    try {
      const res = await api.get('/head/supervision/eligible-students', {
        params: {
          activityType: assignForm.activityType,
          session: assignForm.session,
          series: assignForm.series,
          semester: assignForm.semester
        }
      });
      if (res.data?.success) {
        setEligibleStudents(res.data.students || []);
      }
    } catch (err) {
      toast.error('Failed to load eligible students');
    } finally {
      setLoadingEligible(false);
    }
  };

  useEffect(() => {
    if (showAssignModal) {
      fetchEligible();
      setSelectedStudentIds([]);
    }
  }, [showAssignModal, assignForm.activityType, assignForm.session, assignForm.series]);

  const handleToggleStudent = (id) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(x => x !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!assignForm.teacherId) {
      toast.warning('Please select a supervisor');
      return;
    }
    if (selectedStudentIds.length === 0) {
      toast.warning('Please select at least one student');
      return;
    }

    setSubmittingAssign(true);
    try {
      const res = await api.post('/head/supervision/assign', {
        ...assignForm,
        studentIds: selectedStudentIds
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Supervision successfully assigned!');
        setShowAssignModal(false);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create supervision assignment');
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleCancelAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to cancel this supervision assignment?')) return;
    try {
      const res = await api.delete(`/head/supervision/${assignmentId}`);
      if (res.data?.success) {
        toast.success('Assignment cancelled');
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel assignment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-blue-950/40 border border-emerald-500/20 rounded-2xl shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
              {deptCode} Department
            </span>
            <span className="px-2.5 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full flex items-center gap-1">
              <Award className="w-3 h-3" /> Academic Allocation
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FolderGit2 className="w-6 h-6 text-emerald-400" />
            Project, Seminar & Thesis Supervision
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Allocate supervisors, monitor research progress, and manage Project-I, Project-II, Seminar & Thesis groups.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-900/30 transition"
          >
            <Plus className="w-4 h-4" />
            Assign Supervision
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Supervisions</p>
          <p className="text-2xl font-bold text-white mt-1">{overview.summary?.totalAssignments || 0}</p>
        </div>
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Project-I</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{overview.summary?.projectI || 0}</p>
        </div>
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Project-II</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{overview.summary?.projectII || 0}</p>
        </div>
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Seminar</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">{overview.summary?.seminar || 0}</p>
        </div>
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Thesis / Research</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{overview.summary?.thesis || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-semibold transition border-b-2 ${
            activeTab === 'overview'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Teacher Supervision Map
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-2 text-sm font-semibold transition border-b-2 ${
            activeTab === 'projects'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Active Project Teams ({projects.length})
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 text-sm font-semibold transition border-b-2 ${
            activeTab === 'assignments'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Individual Assignments ({assignments.length})
        </button>
      </div>

      {/* TAB 1: Teacher Supervision Overview Table (Section 39) */}
      {activeTab === 'overview' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Department Supervisors & Allocation Summary
            </h3>
            <span className="text-xs text-slate-400">{overview.teachers?.length || 0} Faculty Members</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4 text-center">Project-I</th>
                  <th className="py-3 px-4 text-center">Project-II</th>
                  <th className="py-3 px-4 text-center">Seminar</th>
                  <th className="py-3 px-4 text-center">Thesis</th>
                  <th className="py-3 px-4 text-right">Total Supervisees</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                {overview.teachers?.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4">
                      <p className="font-medium text-white">{t.name}</p>
                      <p className="text-xs font-mono text-slate-400">{t.teacherId}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300">{t.designation}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono">
                        {t.counts?.PROJECT_I || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-mono">
                        {t.counts?.PROJECT_II || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-mono">
                        {t.counts?.SEMINAR || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-mono">
                        {t.counts?.THESIS || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white">
                      {t.counts?.total || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Active Projects Teams */}
      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
              <FolderGit2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              No active project teams yet. Click "Assign Supervision" to create one.
            </div>
          ) : (
            projects.map((proj) => (
              <div key={proj._id} className="p-5 bg-slate-900/70 border border-slate-800 rounded-xl hover:border-slate-700 transition flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                      {proj.activityType}
                    </span>
                    <span className="text-xs text-slate-400">
                      {proj.academicSession} • {proj.series} Series
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white line-clamp-1">{proj.title}</h4>
                  {proj.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{proj.description}</p>
                  )}

                  <div className="mt-3 p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs space-y-1">
                    <p className="text-slate-400">
                      Supervisor: <span className="text-slate-200 font-semibold">{proj.primarySupervisorName}</span>
                    </p>
                    <p className="text-slate-400">
                      Team: <span className="text-emerald-400 font-mono font-medium">{proj.students?.map(s => s.rollNumber).join(', ')}</span>
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">Overall Progress</span>
                    <span className="font-bold text-emerald-400">{proj.progress || 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${proj.progress || 0}%` }}
                    />
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {proj.milestones?.filter(m => m.status === 'completed').length || 0} / {proj.milestones?.length || 0} Milestones
                    </span>
                    <Link
                      to={`/student/projects/${proj._id}/workspace`}
                      className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                    >
                      Open Workspace <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: Individual Assignments */}
      {activeTab === 'assignments' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Activity</th>
                  <th className="py-3 px-4">Session / Series</th>
                  <th className="py-3 px-4">Supervisor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                {assignments.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4">
                      <p className="font-mono font-semibold text-white">{a.studentRoll}</p>
                      <p className="text-xs text-slate-400">{a.studentName}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded">
                        {a.activityType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300">
                      {a.academicSession} • {a.series} Series
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-200">{a.teacherName}</p>
                      <p className="text-xs font-mono text-slate-400">{a.teacherId}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        a.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {a.status === 'active' && (
                        <button
                          onClick={() => handleCancelAssignment(a._id)}
                          title="Cancel Assignment"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Supervision Modal (Sections 23, 24, 25, 26) */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/30 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-emerald-400" />
                Allocate Academic Supervision
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Activity Type</label>
                  <select
                    value={assignForm.activityType}
                    onChange={(e) => setAssignForm({ ...assignForm, activityType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="PROJECT_I">Project-I</option>
                    <option value="PROJECT_II">Project-II</option>
                    <option value="SEMINAR">Seminar</option>
                    <option value="THESIS">Thesis / Research</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Session</label>
                  <select
                    value={assignForm.session}
                    onChange={(e) => setAssignForm({ ...assignForm, session: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
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
                    value={assignForm.series}
                    onChange={(e) => setAssignForm({ ...assignForm, series: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
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
                    value={assignForm.semester}
                    onChange={(e) => setAssignForm({ ...assignForm, semester: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Supervisor Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Select Supervisor</label>
                <select
                  value={assignForm.teacherId}
                  onChange={(e) => setAssignForm({ ...assignForm, teacherId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">-- Choose Faculty Supervisor --</option>
                  {teachersList.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.teacherId}) — {t.designation || 'Lecturer'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Project / Research Title</label>
                <input
                  type="text"
                  placeholder="e.g. AI-Based Smart Antenna System"
                  value={assignForm.projectTitle}
                  onChange={(e) => setAssignForm({ ...assignForm, projectTitle: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description / Scope (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Brief synopsis or research scope..."
                  value={assignForm.projectDescription}
                  onChange={(e) => setAssignForm({ ...assignForm, projectDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Student Selection Roster (Section 24) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-400">
                    Select Students for Team ({selectedStudentIds.length} selected)
                  </label>
                  <span className="text-xs text-slate-500">
                    {eligibleStudents.length} Students in Series {assignForm.series}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl max-h-48 overflow-y-auto space-y-2">
                  {loadingEligible ? (
                    <p className="text-xs text-slate-400 text-center py-4">Loading eligible students...</p>
                  ) : eligibleStudents.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No students found matching session/series.</p>
                  ) : (
                    eligibleStudents.map((s) => {
                      const isSelected = selectedStudentIds.includes(s._id);
                      const isAlreadyAssigned = s.isAssigned;

                      return (
                        <div
                          key={s._id}
                          onClick={() => !isAlreadyAssigned && handleToggleStudent(s._id)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                            isAlreadyAssigned
                              ? 'opacity-40 bg-slate-900 border-slate-800 cursor-not-allowed'
                              : isSelected
                              ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                              : 'bg-slate-900/50 border-slate-800/80 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isAlreadyAssigned}
                              onChange={() => {}}
                              className="checkbox checkbox-xs checkbox-emerald"
                            />
                            <span className="font-mono font-bold text-slate-200">{s.rollNumber}</span>
                            <span>{s.name}</span>
                          </div>

                          {isAlreadyAssigned && (
                            <span className="text-amber-400/80 text-[10px]">
                              Already with {s.currentSupervisor}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign || selectedStudentIds.length === 0}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {submittingAssign ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
