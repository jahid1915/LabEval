import { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Activity, HelpCircle, FileCheck, ClipboardList,
  TrendingUp, ChevronRight, Bell, CheckCircle, XCircle,
  Settings, Save, AlertTriangle, ArrowLeft, RefreshCw,
  Search, Award, CheckCircle2, User, Hash, FileSpreadsheet,
  FileText, ExternalLink, Sparkles
} from 'lucide-react';
import { toast } from 'react-toastify';
import { calculateRUETGrade } from '../../utils/gradeCalculator';
import {
  generateRUETPDFReport,
  generateRUETXLSXReport
} from '../../utils/ruetReportGenerator';
import EvaluationLayoutModal from '../../components/EvaluationLayoutModal';

const MODULE_CARDS = [
  { title: 'Attendance & Report', icon: <BookOpen size={16} />, path: 'attendance' },
  { title: 'Lab Performance',     icon: <Activity size={16} />, path: 'performance' },
  { title: 'Lab Quiz',            icon: <HelpCircle size={16} />, path: 'quiz' },
  { title: 'Lab Test',            icon: <FileCheck size={16} />, path: 'test' },
  { title: 'Others',             icon: <ClipboardList size={16} />, path: 'others' },
  { title: 'Final Result',        icon: <TrendingUp size={16} />, path: 'results' },
];

export default function TeacherDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelected] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('selectedCourse')) || null; } catch { return null; }
  });
  const [showLayoutModal, setShowLayoutModal] = useState(false);

  // Student Mark Requests State (Sections 6 & 7)
  const [requests, setRequests] = useState([]);
  const [requestSearch, setRequestSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('All');
  const [activeRequestModal, setActiveRequestModal] = useState(null);
  const [marksForm, setMarksForm] = useState({
    quiz: 18,
    labReport: 15,
    labViva: 9,
    labTest: 10,
    openEnded: 'A',
    attendance: 10,
    maxMarks: 65,
    remarks: ''
  });
  const [processingMarks, setProcessingMarks] = useState(false);

  // Fetch teacher's assigned courses
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/teacher/courses');
      setCourses(data);
    } catch {
      toast.error('Could not load assigned courses');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch mark requests directed to this teacher
  const fetchRequests = useCallback(async () => {
    try {
      const { data } = await api.get('/teacher/requests');
      setRequests(data);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchCourses();
    fetchRequests();
  }, [fetchCourses, fetchRequests]);

  const handleCourseSelect = (course) => {
    sessionStorage.setItem('selectedCourse', JSON.stringify(course));
    setSelected(course);
  };

  const handleModuleClick = (path) => {
    navigate(`/teacher/${path}`, { state: { course: selectedCourse, department: user?.department } });
  };

  // Open Process Detailed Marks Modal (Section 7)
  const handleOpenProcessModal = (req) => {
    setActiveRequestModal(req);
    const existing = req.detailedMarks || {};
    setMarksForm({
      quiz: existing.quiz ?? 16,
      labReport: existing.labReport ?? 13,
      labViva: existing.labViva ?? 8,
      labTest: existing.labTest ?? 9,
      openEnded: existing.openEnded ?? 'A',
      attendance: existing.attendance ?? 10,
      maxMarks: 65,
      remarks: req.remarks || 'Verified by Course Teacher'
    });
  };

  // Calculate live total, grade, and grade point for RUET standard
  const calcTotal = () => {
    const q = parseFloat(marksForm.quiz) || 0;
    const r = parseFloat(marksForm.labReport) || 0;
    const v = parseFloat(marksForm.labViva) || 0;
    const t = parseFloat(marksForm.labTest) || 0;
    const a = parseFloat(marksForm.attendance) || 0;
    const oe = marksForm.openEnded === 'A' ? 0 : (parseFloat(marksForm.openEnded) || 0);
    return Math.round((q + r + v + t + oe + a) * 100) / 100;
  };

  const total = calcTotal();
  const maxMarks = parseFloat(marksForm.maxMarks) || 65;
  const pct = maxMarks > 0 ? (total / maxMarks) * 100 : 0;

  // Real-time RUET letter grade & grade point
  let letterGrade = 'F';
  let gradePoint = 0.00;
  if (pct >= 80) { letterGrade = 'A+'; gradePoint = 4.00; }
  else if (pct >= 75) { letterGrade = 'A'; gradePoint = 3.75; }
  else if (pct >= 70) { letterGrade = 'A-'; gradePoint = 3.50; }
  else if (pct >= 65) { letterGrade = 'B+'; gradePoint = 3.25; }
  else if (pct >= 60) { letterGrade = 'B'; gradePoint = 3.00; }
  else if (pct >= 55) { letterGrade = 'B-'; gradePoint = 2.75; }
  else if (pct >= 50) { letterGrade = 'C+'; gradePoint = 2.50; }
  else if (pct >= 45) { letterGrade = 'C'; gradePoint = 2.25; }
  else if (pct >= 40) { letterGrade = 'D'; gradePoint = 2.00; }

  // Submit Detailed Marks and Complete Request
  const handleSubmitDetailedMarks = async (e) => {
    e.preventDefault();
    if (!activeRequestModal) return;
    setProcessingMarks(true);
    try {
      await api.patch(`/teacher/requests/${activeRequestModal._id}`, {
        status: 'Completed',
        detailedMarks: {
          quiz: parseFloat(marksForm.quiz) || 0,
          labReport: parseFloat(marksForm.labReport) || 0,
          labViva: parseFloat(marksForm.labViva) || 0,
          labTest: parseFloat(marksForm.labTest) || 0,
          openEnded: marksForm.openEnded,
          attendance: parseFloat(marksForm.attendance) || 0,
          maxMarks: maxMarks
        },
        remarks: marksForm.remarks
      });
      toast.success(`Detailed marks released to student ${activeRequestModal.studentRoll || activeRequestModal.student?.rollNumber}!`);
      setActiveRequestModal(null);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit detailed marks');
    } finally {
      setProcessingMarks(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(r => {
    const matchesSearch =
      (r.studentRoll || r.student?.rollNumber || '').toLowerCase().includes(requestSearch.toLowerCase()) ||
      (r.studentName || r.student?.name || '').toLowerCase().includes(requestSearch.toLowerCase()) ||
      (r.course || '').toLowerCase().includes(requestSearch.toLowerCase());
    const matchesStatus = requestStatusFilter === 'All' || r.status === requestStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Quick export for course
  const handleExportCoursePDF = () => {
    if (!selectedCourse) return;
    toast.info('Generating official RUET Course Evaluation PDF...');
    navigate('/teacher/results', { state: { course: selectedCourse, department: user?.department } });
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* ── TEACHER PROFILE HEADER ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md shadow-indigo-500/20">
              {user?.name?.charAt(0) || 'T'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
                  Faculty Instructor
                </span>
                <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  ID: {user?.teacherId || 'TEACHER'}
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {user?.name || 'Course Instructor'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {user?.designation || 'Assistant Professor'} &bull; Dept. of {user?.department || 'ETE'}, Rajshahi University of Engineering & Technology
              </p>
            </div>
          </div>
          <button onClick={() => { fetchCourses(); fetchRequests(); toast.success('Dashboard synced'); }}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 hover:border-blue-500 transition-colors">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ── COURSE SELECTION & OVERVIEW ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen size={16} className="text-blue-600 dark:text-blue-400" />
              Assigned Courses ({courses.length})
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Assigned by Department Head &bull; Click any course to load evaluation modules
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="spinner" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
            <BookOpen size={28} className="text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No courses currently assigned</p>
            <p className="text-[11px] text-slate-500 mt-1">Courses assigned by your Department Head will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {courses.map((course) => {
              const isSelected = selectedCourse?._id === course._id;
              return (
                <div key={course._id} onClick={() => handleCourseSelect(course)}
                  className={`cursor-pointer rounded-xl p-4 border transition-all ${
                    isSelected
                      ? 'bg-blue-50/60 dark:bg-blue-950/25 border-blue-500 dark:border-blue-400 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                  }`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`font-mono font-bold text-[14px] ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                      {course.courseCode}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Active
                    </span>
                  </div>

                  <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 mb-2.5">{course.courseName}</h3>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <span>Series {course.series} &bull; Sem: {course.semester || '3-2'}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{course.studentCount ?? '—'} Students</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── COURSE EVALUATION MODULES (If Course is Selected) ── */}
      {selectedCourse && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Active Course Session</span>
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">
                {selectedCourse.courseCode} &mdash; {selectedCourse.courseName}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setShowLayoutModal(true)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 hover:border-blue-500 transition-colors"
                title="Configure evaluation criteria and layout">
                <Settings size={13} className="text-slate-500" /> Configure Layout
              </button>
              <button onClick={() => navigate('/teacher/results', { state: { course: selectedCourse, department: user?.department } })}
                className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-500/20">
                <TrendingUp size={13} /> Final Results & Export
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {MODULE_CARDS.map((card, idx) => {
              const iconColors = [
                'text-blue-600 bg-blue-50 dark:bg-blue-950/50',
                'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/50',
                'text-violet-600 bg-violet-50 dark:bg-violet-950/50',
                'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50',
                'text-amber-600 bg-amber-50 dark:bg-amber-950/50',
                'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
              ];
              const colorCls = iconColors[idx % iconColors.length];

              return (
                <button key={card.path} onClick={() => handleModuleClick(card.path)}
                  className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all flex flex-col items-center text-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 group">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${colorCls}`}>
                    {card.icon}
                  </span>
                  <span>{card.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DEDICATED STUDENT MARK REQUEST PANEL (Section 6 & 7) ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-amber-600 dark:text-amber-400" />
              <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">
                Student Mark Request Panel
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Review and process student requests for detailed assessment mark breakdowns
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search roll, name, course..."
                value={requestSearch} onChange={(e) => setRequestSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500" />
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              {['All', 'Pending', 'Completed'].map((st) => (
                <button key={st} onClick={() => setRequestStatusFilter(st)}
                  className={`px-3 py-1 rounded-md transition-colors font-semibold ${
                    requestStatusFilter === st
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}>
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Student Roll & Name</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Series</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#6b8f77]">Semester</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#6b8f77]">Course</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#6b8f77]">Date</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#6b8f77]">Status</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#6b8f77]">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => {
                  const roll = req.studentRoll || req.student?.rollNumber || 'N/A';
                  const name = req.studentName || req.student?.name || 'Student';
                  const isDone = req.status === 'Completed' || req.status === 'Accepted';
                  return (
                    <tr key={req._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{name}</div>
                        <div className="font-mono text-purple-600 dark:text-purple-400 font-bold text-[11px]">{roll}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold">
                          {req.series || '22'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold">{req.semester || '3-2'}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{req.course}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{req.courseName}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isDone
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse'
                        }`}>
                          {isDone ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleOpenProcessModal(req)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 ml-auto ${
                            isDone
                              ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                          }`}
                        >
                          <Sparkles size={13} />
                          {isDone ? 'Edit Marks' : 'Process & Release Marks'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No student mark requests found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ────────────────── PROCESS REQUEST MODAL (Section 7: RUET Detailed Marks) ────────────────── */}
      {activeRequestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white">
                    Provide Detailed Academic Marks
                  </h3>
                  <p className="text-xs text-slate-400">
                    Course: <strong>{activeRequestModal.course}</strong> &bull; {activeRequestModal.semester}
                  </p>
                </div>
              </div>
              <button onClick={() => setActiveRequestModal(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={18} />
              </button>
            </div>

            {/* Student Info Tag */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-800 dark:text-white">
                  {activeRequestModal.studentName || activeRequestModal.student?.name}
                </p>
                <p className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                  Roll: {activeRequestModal.studentRoll || activeRequestModal.student?.rollNumber} &bull; Series {activeRequestModal.series}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold">
                Dept: {activeRequestModal.department || 'ETE'}
              </span>
            </div>

            {/* Assessment Input Grid (Matches attached XLSX reference & Section 7) */}
            <form onSubmit={handleSubmitDetailedMarks} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Quiz [20]
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={marksForm.quiz}
                    onChange={(e) => setMarksForm({ ...marksForm, quiz: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Lab Report [15]
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    step="0.5"
                    value={marksForm.labReport}
                    onChange={(e) => setMarksForm({ ...marksForm, labReport: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Lab Viva [10]
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={marksForm.labViva}
                    onChange={(e) => setMarksForm({ ...marksForm, labViva: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Lab Test [20]
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={marksForm.labTest}
                    onChange={(e) => setMarksForm({ ...marksForm, labTest: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Open Ended [0]
                  </label>
                  <input
                    type="text"
                    value={marksForm.openEnded}
                    onChange={(e) => setMarksForm({ ...marksForm, openEnded: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Attendance [10]
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={marksForm.attendance}
                    onChange={(e) => setMarksForm({ ...marksForm, attendance: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Total & Live RUET Grade Summary */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                    Total Marks:
                  </span>
                  <span className="text-xl font-heading font-extrabold text-emerald-800 dark:text-emerald-200">
                    {total} <span className="text-xs font-normal">/ {maxMarks}</span>
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                    Calculated RUET Grade:
                  </span>
                  <span className="text-xl font-heading font-extrabold text-emerald-800 dark:text-emerald-200">
                    {letterGrade} <span className="text-xs font-normal">({gradePoint.toFixed(2)})</span>
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Teacher Remarks / Comments
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sessional evaluation completed and released"
                  value={marksForm.remarks}
                  onChange={(e) => setMarksForm({ ...marksForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveRequestModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingMarks}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/30 flex items-center gap-1.5"
                >
                  {processingMarks ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      Save & Release Detailed Marks
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure Layout & Assessment Scheme Modal */}
      <EvaluationLayoutModal
        isOpen={showLayoutModal}
        onClose={() => setShowLayoutModal(false)}
        course={selectedCourse}
      />

    </div>
  );
}
