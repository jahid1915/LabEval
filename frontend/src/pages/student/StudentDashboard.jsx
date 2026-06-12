import { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  BookOpen, Send, Clock, CheckCircle, XCircle,
  Eye, RefreshCw, GraduationCap, User, BarChart2
} from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } } };

const StatusBadge = ({ status }) => {
  if (status === 'Pending') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-semibold rounded-xl text-xs">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        Pending Approval
      </span>
    );
  }
  if (status === 'Accepted') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-semibold rounded-xl text-xs">
        <CheckCircle size={12} />
        Approved
      </span>
    );
  }
  if (status === 'Rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 font-semibold rounded-xl text-xs">
        <XCircle size={12} />
        Rejected
      </span>
    );
  }
  return null;
};

const CourseCard = ({ course, onRequest, requesting, navigate }) => {
  const requestStatus = course.request?.status || null;

  return (
    <motion.div variants={item}
      className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-primary/30 dark:hover:border-primary/30 transition-all duration-300 relative overflow-hidden flex flex-col"
    >
      {/* Top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-primary to-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

      <div className="p-6 flex flex-col flex-1">
        {/* Course info */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 group-hover:bg-primary flex items-center justify-center transition-colors duration-300 shrink-0">
            <BookOpen className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-extrabold text-xl text-slate-800 dark:text-white group-hover:text-primary transition-colors truncate">
              {course.courseCode}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium truncate">{course.courseName}</p>
          </div>
        </div>

        {/* Teacher info */}
        <div className="flex items-center gap-2 mb-4 text-sm text-slate-500 dark:text-slate-400">
          <User size={14} className="shrink-0" />
          <span className="truncate">{course.teacherName}</span>
        </div>

        {/* Badges */}
        <div className="flex gap-2 mb-5">
          <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">Series {course.series}</span>
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-full">{course.department}</span>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 gap-2 py-3 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl mb-5 border border-slate-100/50 dark:border-slate-800/50 text-center">
          <div>
            <p className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-slate-500 tracking-wider">Attendance</p>
            <p className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">{course.attendancePercentage}%</p>
          </div>
          <div className="border-l border-slate-100 dark:border-slate-800/60">
            <p className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-slate-500 tracking-wider flex items-center justify-center gap-1">
              <BarChart2 size={9} /> Total Marks
            </p>
            <p className="text-sm font-extrabold text-primary mt-0.5">{course.totalMarks}<span className="text-slate-400 text-xs font-semibold">/75</span></p>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action area */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/50">
          {/* No request yet */}
          {!requestStatus && (
            <button
              onClick={() => onRequest(course)}
              disabled={requesting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-focus text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/25 transition-all disabled:opacity-50"
            >
              <Send size={14} />
              Request Marks
            </button>
          )}

          {/* Pending */}
          {requestStatus === 'Pending' && (
            <div className="flex items-center justify-center">
              <StatusBadge status="Pending" />
            </div>
          )}

          {/* Accepted → View Marks */}
          {requestStatus === 'Accepted' && (
            <button
              onClick={() => navigate(`/student/marks/${course.courseCode}`)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all"
            >
              <Eye size={14} />
              View Marks
            </button>
          )}

          {/* Rejected → Re-request */}
          {requestStatus === 'Rejected' && (
            <div className="space-y-2">
              <div className="flex items-center justify-center">
                <StatusBadge status="Rejected" />
              </div>
              <button
                onClick={() => onRequest(course)}
                disabled={requesting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 text-slate-600 dark:text-slate-300 hover:text-primary rounded-xl font-semibold text-xs transition-all disabled:opacity-50"
              >
                <RefreshCw size={12} />
                Re-request
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [courses, setCourses]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [requesting, setRequesting] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      const { data } = await api.get('/student/courses');
      setCourses(data);
    } catch {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleRequestMarks = async (course) => {
    setRequesting(true);
    try {
      await api.post('/student/request', {
        courseCode: course.courseCode,
        teacherId: course.teacherId
      });
      toast.success(`Request sent for ${course.courseCode}`);
      await fetchCourses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    } finally {
      setRequesting(false);
    }
  };

  // Quick stats
  const totalCourses    = courses.length;
  const pendingRequests = courses.filter(c => c.request?.status === 'Pending').length;
  const approvedCourses = courses.filter(c => c.request?.status === 'Accepted').length;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-slate-800 dark:text-white mb-1">
          Welcome, <span className="text-primary">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
          Your courses • {user?.department} • Series {user?.series}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-heading font-extrabold text-slate-800 dark:text-white">{totalCourses}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Total Courses</p>
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-heading font-extrabold text-slate-800 dark:text-white">{pendingRequests}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Pending Requests</p>
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-2xl font-heading font-extrabold text-slate-800 dark:text-white">{approvedCourses}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Marks Available</p>
          </div>
        </motion.div>
      </div>

      {/* Course Cards Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner text-primary loading-lg" />
        </div>
      ) : courses.length === 0 ? (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700"
        >
          <BookOpen className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700 dark:text-white mb-2">No Courses Found</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            No courses are available for your department ({user?.department}) and series ({user?.series}) yet.
            Please check back later or contact your teacher.
          </p>
        </motion.div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {courses.map(course => (
            <CourseCard
              key={course._id}
              course={course}
              onRequest={handleRequestMarks}
              requesting={requesting}
              navigate={navigate}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default StudentDashboard;
