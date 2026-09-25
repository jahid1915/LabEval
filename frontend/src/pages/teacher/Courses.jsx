import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ShieldCheck, ArrowRight, RefreshCw, Users, Clock, Award } from 'lucide-react';

export default function Courses() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/teacher/courses');
      setCourses(data);
    } catch {
      toast.error('Failed to load assigned courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleOpenCourse = (course) => {
    sessionStorage.setItem('selectedCourse', JSON.stringify(course));
    navigate('/teacher');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold mb-1.5">
            <ShieldCheck size={14} />
            Official Academic Roster
          </div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-800 dark:text-white">
            Assigned Courses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Instructor: <strong>{user?.name}</strong> ({user?.teacherId}) &bull; Dept. of {user?.department || 'ETE'}, RUET
          </p>
        </div>

        <button
          onClick={fetchCourses}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-purple-600 transition-all flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Institutional Policy Notice (Section 12 Compliance) */}
      <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-3">
        <ShieldCheck size={18} className="shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
        <div>
          <p className="font-bold text-sm">RUET Academic Course Assignment Policy</p>
          <p className="mt-0.5 text-slate-600 dark:text-slate-300">
            According to university regulations, course assignments are managed exclusively by the <strong>Department Head</strong>. Teachers cannot manually add or select courses. All courses displayed below are officially allocated to you for the current semester.
          </p>
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner text-purple-600 loading-lg" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
          <BookOpen className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-white mb-1">
            No Assigned Courses
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You currently have no courses allocated by your Department Head. Once the Department Head assigns a sessional course, it will appear here immediately.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {courses.map((course, idx) => (
              <motion.div
                key={course._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-purple-500/30 transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-indigo-600" />

                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono font-extrabold text-base text-purple-700 dark:text-purple-400">
                      {course.courseCode}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Assigned
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-sm text-slate-800 dark:text-white line-clamp-2 mb-3">
                    {course.courseName}
                  </h3>

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <p><strong>Series:</strong> Series {course.series} &bull; Dept: {course.department}</p>
                    <p><strong>Semester:</strong> {course.semester || '3-2'} &bull; Session: {course.session || '2024-2025'}</p>
                    <p><strong>Enrolled Students:</strong> {course.studentCount ?? 57} students</p>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenCourse(course)}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm shadow-purple-500/20 transition-all flex items-center justify-center gap-1.5 group-hover:scale-[1.01]"
                >
                  <span>Open Course Dashboard</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
