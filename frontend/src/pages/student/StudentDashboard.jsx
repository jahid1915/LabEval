import { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Send, Clock, CheckCircle, XCircle,
  Eye, RefreshCw, GraduationCap, User, BarChart2,
  FileText, Award, Calendar, ChevronRight, Sparkles,
  ShieldCheck, AlertCircle, CheckCircle2, Download
} from 'lucide-react';
import { generateStudentAcademicTranscriptPDF } from '../../utils/ruetReportGenerator';

const ALL_SEMESTERS = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];
const SEMESTERS = ALL_SEMESTERS;

export default function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeSemester, setActiveSemester] = useState('3-2');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestingCourse, setRequestingCourse] = useState(null);
  const [detailedMarksModal, setDetailedMarksModal] = useState(null);

  const fetchCourses = useCallback(async (sem) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/student/courses?semester=${sem || activeSemester}`);
      setCourses(data);
    } catch {
      toast.error('Failed to load semester courses');
    } finally {
      setLoading(false);
    }
  }, [activeSemester]);

  useEffect(() => {
    fetchCourses(activeSemester);
  }, [activeSemester, fetchCourses]);

  // Request Detailed Marks Handler (Section 5)
  const handleRequestMarks = async (course) => {
    setRequestingCourse(course.courseCode);
    try {
      await api.post('/student/request', {
        courseCode: course.courseCode,
        teacherId: course.teacherId,
        semester: activeSemester,
        academicSession: course.session || '2024-2025'
      });
      toast.success(`Request for ${course.courseCode} sent to ${course.teacherName}!`);
      await fetchCourses(activeSemester);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit mark request');
    } finally {
      setRequestingCourse(null);
    }
  };

  // Calculate SGPA for current semester
  const coursesWithGrades = courses.filter(c => c.gradePoint !== undefined && c.gradePoint !== null && c.gradePoint > 0);
  const totalCredits = courses.reduce((acc, c) => acc + (parseFloat(c.credits) || 3.0), 0);
  const weightedPoints = courses.reduce((acc, c) => acc + ((parseFloat(c.credits) || 3.0) * (c.gradePoint || 0)), 0);
  const sgpa = totalCredits > 0 ? (weightedPoints / totalCredits).toFixed(2) : '3.75';

  // Download Transcript PDF (Section 17 & 18)
  const handleDownloadTranscript = async () => {
    try {
      await generateStudentAcademicTranscriptPDF({
        student: {
          name: user?.name || 'Md. Jahid Hasan',
          rollNumber: user?.rollNumber || '2204028',
          series: user?.series || '22',
          department: user?.department || 'ETE',
          departmentName: user?.departmentName || 'Electronics & Telecommunication Engineering',
          facultyName: user?.facultyName || 'Faculty of Electrical & Computer Engineering',
          academicSession: '2024-2025'
        },
        semester: activeSemester,
        courses: courses
      });
      toast.success('Official Semester Transcript PDF downloaded!');
    } catch (err) {
      toast.error('Failed to generate transcript: ' + err.message);
    }
  };

  return (
    <div className="space-y-5 pb-16">
      
      {/* ── STUDENT PROFILE HEADER ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/20">
              <GraduationCap size={20} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 uppercase tracking-wide">
                  Series {user?.series || '22'}
                </span>
                <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Roll: {user?.rollNumber || '2204028'}
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {user?.name || 'Student'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Department of {user?.department || 'ETE'} &bull; Rajshahi University of Engineering & Technology
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleDownloadTranscript}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-500/20">
              <Download size={13} /> Semester Transcript (PDF)
            </button>
            <button onClick={() => fetchCourses(activeSemester)} disabled={loading}
              className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 hover:border-blue-500 transition-colors">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── SEMESTER NAVIGATION TABS (Section 3 & 4) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          {SEMESTERS.map((sem) => (
            <button key={sem} onClick={() => setActiveSemester(sem)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 ${
                activeSemester === sem
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}>
              <Calendar size={12} />
              <span>{sem} Sem</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pb-2 sm:pb-0">
          <span className="text-[11px] text-slate-500 font-medium">Quick Select:</span>
          <select value={activeSemester} onChange={(e) => setActiveSemester(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500">
            {ALL_SEMESTERS.map((sem) => (
              <option key={sem} value={sem}>{sem} Semester</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── SEMESTER SUMMARY METRICS (Multi-Color Cards) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Emerald: SGPA */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Semester SGPA</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{sgpa}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Award size={18} />
          </div>
        </div>

        {/* Electric Blue: Total Credits */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-800/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Total Credits</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{totalCredits.toFixed(2)}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <BookOpen size={18} />
          </div>
        </div>

        {/* Indigo: Courses */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-800/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Total Courses</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{courses.length}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <GraduationCap size={18} />
          </div>
        </div>

        {/* Amber: Marks Requested */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-800/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Marks Requested</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {courses.filter(c => c.request).length}
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Sparkles size={18} />
          </div>
        </div>
      </div>

      {/* ── SEMESTER COURSE LIST ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen size={16} className="text-blue-600 dark:text-blue-400" />
            Academic Course Records &mdash; {activeSemester} Semester
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Faculty members assigned to each course for this session by Department Head.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="spinner" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-10">
            <BookOpen size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-medium text-slate-500">No courses recorded for {activeSemester} semester yet.</p>
          </div>
        ) : (
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Course Code</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Course Title</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Type</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Assigned Teacher</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Grade</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">GP</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Marks</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => {
                  const req = c.request;
                  const hasCompletedMarks = req?.status === 'Completed' || req?.status === 'Accepted' || (c.detailedMarks && Object.keys(c.detailedMarks).length > 0);
                  const isPending = req?.status === 'Pending';

                  return (
                    <tr key={c._id || c.courseCode} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {c.courseCode}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {c.courseName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800">
                          Sessional
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-[12px]">
                          {c.teacherName || 'Assigned Faculty Member'}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {c.teacherDesignation || 'Course Teacher'} &bull; {c.teacherId || 'Dept Faculty'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-[12px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          {c.grade || (hasCompletedMarks ? (req?.detailedMarks?.grade || 'A+') : 'A+')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-700 dark:text-slate-200">
                        {c.gradePoint ? Number(c.gradePoint).toFixed(2) : (hasCompletedMarks ? (req?.detailedMarks?.gradePoint?.toFixed(2) || '4.00') : '4.00')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasCompletedMarks ? (
                          <button onClick={() => setDetailedMarksModal({ ...c, req })}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold flex items-center gap-1 ml-auto transition-colors shadow-sm shadow-blue-500/20">
                            <Eye size={12} /> View Marks
                          </button>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-200 dark:border-amber-800">
                            Pending Approval
                          </span>
                        ) : (
                          <button onClick={() => handleRequestMarks(c)} disabled={requestingCourse === c.courseCode}
                            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 text-[11px] font-semibold flex items-center gap-1 ml-auto hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50">
                            {requestingCourse === c.courseCode ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              <><Send size={11} /> Request Marks</>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ────────────────── VIEW DETAILED MARKS MODAL (Section 7) ────────────────── */}
      {detailedMarksModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  {detailedMarksModal.courseCode} &bull; {activeSemester} Semester
                </span>
                <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
                  Official Detailed Marks Breakdown
                </h3>
              </div>
              <button onClick={() => setDetailedMarksModal(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={18} />
              </button>
            </div>

            {/* Course & Teacher Details */}
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 text-xs space-y-1">
              <p className="font-bold text-blue-900 dark:text-blue-200">
                {detailedMarksModal.courseName}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Course Teacher: <strong>{detailedMarksModal.teacherName || 'Md Abu Ismail Siddique'}</strong> ({detailedMarksModal.teacherDesignation || 'Asst. Prof.'})
              </p>
            </div>

            {/* Assessment Breakdown Table (RUET Reference Format) */}
            {(() => {
              const dm = detailedMarksModal.req?.detailedMarks || detailedMarksModal.detailedMarks || {};
              const quiz = dm.quiz ?? 18;
              const report = dm.labReport ?? 13;
              const viva = dm.labViva ?? 9;
              const test = dm.labTest ?? 10;
              const openEnded = dm.openEnded ?? 'A';
              const attendance = dm.attendance ?? 10;
              const total = dm.total ?? 60;
              const grade = dm.grade || 'A+';
              const gp = dm.gradePoint ? dm.gradePoint.toFixed(2) : '4.00';

              return (
                <div className="space-y-4">
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                    <table className="w-full text-center text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 font-bold uppercase text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="py-2.5 px-2">Quiz<br/>[20]</th>
                          <th className="py-2.5 px-2">Report<br/>[15]</th>
                          <th className="py-2.5 px-2">Viva<br/>[10]</th>
                          <th className="py-2.5 px-2">Test<br/>[20]</th>
                          <th className="py-2.5 px-2">Open<br/>[0]</th>
                          <th className="py-2.5 px-2">Atnd.<br/>[10]</th>
                          <th className="py-2.5 px-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">Total<br/>[65]</th>
                        </tr>
                      </thead>
                      <tbody className="font-extrabold text-sm text-slate-800 dark:text-white">
                        <tr>
                          <td className="py-3 px-2 border-t border-slate-200 dark:border-slate-700">{quiz}</td>
                          <td className="py-3 px-2 border-t border-slate-200 dark:border-slate-700">{report}</td>
                          <td className="py-3 px-2 border-t border-slate-200 dark:border-slate-700">{viva}</td>
                          <td className="py-3 px-2 border-t border-slate-200 dark:border-slate-700">{test}</td>
                          <td className="py-3 px-2 border-t border-slate-200 dark:border-slate-700">{openEnded}</td>
                          <td className="py-3 px-2 border-t border-slate-200 dark:border-slate-700">{attendance}</td>
                          <td className="py-3 px-2 border-t border-slate-200 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-black text-base">{total}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Grade Banner */}
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                        Final Obtained Grade:
                      </span>
                      <span className="text-2xl font-heading font-black text-emerald-800 dark:text-emerald-300">
                        {grade}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                        Grade Point:
                      </span>
                      <span className="text-2xl font-heading font-black text-emerald-800 dark:text-emerald-300">
                        {gp}
                      </span>
                    </div>
                  </div>

                  {detailedMarksModal.req?.remarks && (
                    <div className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                      <strong>Teacher Remarks:</strong> {detailedMarksModal.req.remarks}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailedMarksModal(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
