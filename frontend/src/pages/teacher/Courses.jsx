import { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ShieldCheck, ArrowRight, RefreshCw, Users, Clock,
  Calendar, Layers, CheckCircle2, ChevronRight, History
} from 'lucide-react';

export default function Courses() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'history'
  const [currentAssignments, setCurrentAssignments] = useState([]);
  const [historyAssignments, setHistoryAssignments] = useState([]);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Fetch Current Assignments (Zero Manual Selection - Section 25, 26, 30)
  const fetchCurrentCourses = useCallback(async () => {
    try {
      const res = await api.get('/teacher/courses/current');
      if (res.data?.success) {
        setCurrentAssignments(res.data.assignments || []);
      }
    } catch {
      toast.error('Failed to load current assigned courses');
    }
  }, []);

  // Fetch Teaching History (Section 28, 29, 30, 67, 68)
  const fetchTeachingHistory = useCallback(async (page = 1) => {
    try {
      const res = await api.get(`/teacher/courses/history?page=${page}&limit=10`);
      if (res.data?.success) {
        setHistoryAssignments(res.data.history || []);
        if (res.data.pagination) {
          setHistoryPagination(res.data.pagination);
        }
      }
    } catch {
      toast.error('Failed to load teaching history');
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchCurrentCourses(), fetchTeachingHistory(1)]);
    setLoading(false);
  }, [fetchCurrentCourses, fetchTeachingHistory]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleOpenCourse = (item) => {
    // Map to selectedCourse session state format expected by Teacher Dashboard
    const courseObj = {
      _id: item.courseOfferingId || item.courseId,
      courseOfferingId: item.courseOfferingId,
      courseCode: item.courseCode,
      courseName: item.courseTitle,
      department: item.departmentCode || user?.department || 'ETE',
      series: item.series,
      semester: item.semester,
      session: item.academicSession,
      studentCount: item.studentCount,
      role: item.role
    };
    sessionStorage.setItem('selectedCourse', JSON.stringify(courseObj));
    navigate('/teacher');
  };

  // Group current assignments by Academic Session -> Semester -> Series (Section 26)
  const groupedCurrent = currentAssignments.reduce((acc, curr) => {
    const key = `${curr.academicSession || 'Current'} • ${curr.semester || 'Current Semester'}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto space-y-7 pb-16">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold mb-1.5">
            <ShieldCheck size={14} />
            Official Academic Roster
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            Assigned Courses & Teaching History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Instructor: <strong>{user?.name}</strong> ({user?.teacherId}) &bull; Dept. of {user?.department || 'ETE'}, RUET
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'current'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Current Semester ({currentAssignments.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <History size={13} />
              <span>Teaching History ({historyPagination.total || historyAssignments.length})</span>
            </button>
          </div>

          <button
            onClick={fetchAll}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-purple-600 shadow-sm"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── INSTITUTIONAL POLICY NOTICE (Zero manual teacher selection) ── */}
      <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-3">
        <ShieldCheck size={18} className="shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
        <div>
          <p className="font-bold text-sm">RUET Academic Allocation Policy</p>
          <p className="mt-0.5 text-slate-600 dark:text-slate-300 leading-relaxed">
            According to institutional regulations, courses are allocated strictly by the <strong>Department Head</strong>. Teachers do NOT manually select courses. The rosters below are linked to actual student cohort enrollments. Each series assignment remains completely distinct.
          </p>
        </div>
      </div>

      {/* ── CURRENT COURSES TAB ── */}
      {activeTab === 'current' && (
        <div className="space-y-6">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-600" />
              <p className="text-xs">Loading assigned courses...</p>
            </div>
          ) : currentAssignments.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
              <BookOpen className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-700 dark:text-white mb-1">
                No Currently Assigned Courses
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You currently have no active course offerings allocated by your Department Head for this period. As soon as the Head activates a course offering, it will automatically appear here.
              </p>
            </div>
          ) : (
            Object.entries(groupedCurrent).map(([groupTitle, list]) => (
              <div key={groupTitle} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h2 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                    {groupTitle}
                  </h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {list.length} {list.length === 1 ? 'Course' : 'Courses'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <AnimatePresence>
                    {list.map((item, idx) => (
                      <motion.div
                        key={item.assignmentId || item.courseOfferingId}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-purple-500/30 transition-all flex flex-col justify-between group relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-600 to-indigo-600" />

                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="font-mono font-extrabold text-base text-purple-700 dark:text-purple-400">
                              {item.courseCode}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {item.role || 'PRIMARY_TEACHER'}
                            </span>
                          </div>

                          <h3 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-2 mb-3">
                            {item.courseTitle}
                          </h3>

                          <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <p className="flex items-center justify-between">
                              <span>Series Cohort:</span>
                              <strong className="font-mono text-purple-600 dark:text-purple-400">Series {item.series}</strong>
                            </p>
                            <p className="flex items-center justify-between">
                              <span>Academic Session:</span>
                              <strong>{item.academicSession}</strong>
                            </p>
                            <p className="flex items-center justify-between">
                              <span>Semester:</span>
                              <strong>{item.semester}</strong>
                            </p>
                            <p className="flex items-center justify-between pt-1">
                              <span>Enrolled Students:</span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {item.studentCount} students
                              </span>
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenCourse(item)}
                          className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm shadow-purple-500/20 transition-all flex items-center justify-center gap-1.5 group-hover:scale-[1.01]"
                        >
                          <span>Open Course Workspace</span>
                          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TEACHING HISTORY TAB (Sections 28, 29, 67, 68) ── */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Permanent Teaching History Archive
              </h2>
              <p className="text-xs text-slate-400">
                All completed and archived teaching assignments across past academic sessions.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
              Total Recorded: {historyPagination.total || historyAssignments.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  <th className="px-4 py-3">Course Code</th>
                  <th className="px-4 py-3">Course Title</th>
                  <th className="px-4 py-3">Academic Session</th>
                  <th className="px-4 py-3">Semester</th>
                  <th className="px-4 py-3">Series</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {historyAssignments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center text-slate-400">
                      No historical teaching records archived yet. Previous assignments are preserved permanently.
                    </td>
                  </tr>
                ) : (
                  historyAssignments.map((hist) => (
                    <tr key={hist.assignmentId || hist._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-purple-600 dark:text-purple-400">
                        {hist.courseCode}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {hist.courseTitle}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {hist.academicSession}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {hist.semester}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        Series {hist.series}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {hist.role}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 uppercase">
                          {hist.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {hist.studentCount || 0} students
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {historyPagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400">
                Page {historyPagination.page} of {historyPagination.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={historyPagination.page <= 1}
                  onClick={() => fetchTeachingHistory(historyPagination.page - 1)}
                  className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={historyPagination.page >= historyPagination.totalPages}
                  onClick={() => fetchTeachingHistory(historyPagination.page + 1)}
                  className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
