import { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { motion } from 'framer-motion';
import {
  BookOpen, Activity, HelpCircle, FileCheck, ClipboardList,
  TrendingUp, ChevronRight, Plus, Bell, CheckCircle, XCircle, Mic
} from 'lucide-react';
import { toast } from 'react-toastify';

const MODULE_CARDS = [
  { title:'Attendance & Report', icon:<BookOpen className="w-7 h-7"/>,     color:'from-blue-500 to-cyan-400',    shadow:'shadow-blue-500/30',   path:'attendance' },
  { title:'Lab Performance',     icon:<Activity className="w-7 h-7"/>,     color:'from-purple-500 to-fuchsia-500', shadow:'shadow-purple-500/30',path:'performance' },
  { title:'Lab Quiz',            icon:<HelpCircle className="w-7 h-7"/>,   color:'from-pink-500 to-rose-400',    shadow:'shadow-pink-500/30',   path:'quiz' },
  { title:'Lab Test',            icon:<FileCheck className="w-7 h-7"/>,    color:'from-indigo-500 to-blue-500',  shadow:'shadow-indigo-500/30', path:'test' },
  { title:'Board Viva',          icon:<Mic className="w-7 h-7"/>,          color:'from-teal-500 to-cyan-400',    shadow:'shadow-teal-500/30',   path:'viva' },
  { title:'Others',              icon:<ClipboardList className="w-7 h-7"/>,color:'from-orange-500 to-amber-400', shadow:'shadow-orange-500/30', path:'others' },
  { title:'Final Result',        icon:<TrendingUp className="w-7 h-7"/>,   color:'from-emerald-500 to-teal-400', shadow:'shadow-emerald-500/30',path:'results' },
];

const item = { hidden:{ y:20, opacity:0 }, show:{ y:0, opacity:1, transition:{ type:'spring', stiffness:100 } } };
const container = { hidden:{ opacity:0 }, show:{ opacity:1, transition:{ staggerChildren:0.08 } } };

export default function TeacherDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [courses, setCourses]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedCourse, setSelected] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('selectedCourse')) || null; } catch { return null; }
  });
  const [requests, setRequests]       = useState([]);
  const [courseRequests, setCourseRequests] = useState([]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/teacher/courses');
      setCourses(data);
    } catch { toast.error('Could not load courses'); }
    finally { setLoading(false); }
  };

  const fetchRequests = async () => {
    try {
      const { data } = await api.get('/teacher/requests');
      setRequests(data.filter(r => r.status === 'Pending'));
    } catch { /* silent */ }
  };

  const fetchCourseRequests = useCallback(async (courseCode) => {
    try {
      const { data } = await api.get(`/teacher/requests?course=${courseCode}`);
      setCourseRequests(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCourses();
    fetchRequests();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchCourseRequests(selectedCourse.courseCode);
    }
  }, [selectedCourse, fetchCourseRequests]);

  const handleCourseSelect = (course) => {
    sessionStorage.setItem('selectedCourse', JSON.stringify(course));
    setSelected(course);
  };

  const handleModuleClick = (path) => {
    navigate(`/teacher/${path}`, { state: { course: selectedCourse, department: user?.department } });
  };

  const handleRequest = async (id, status) => {
    try {
      await api.patch(`/teacher/requests/${id}`, { status });
      setRequests(prev => prev.filter(r => r._id !== id));
      toast.success(`Request ${status}`);
    } catch { toast.error('Failed to update request'); }
  };

  const handleCourseRequest = async (id, status) => {
    try {
      const { data } = await api.patch(`/teacher/requests/${id}`, { status });
      setCourseRequests(prev => prev.map(r => r._id === id ? data : r));
      toast.success(`Request ${status}`);
    } catch { toast.error('Failed to update request'); }
  };

  // ── Course Selection Screen ────────────────────────────────────────
  if (!selectedCourse) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-slate-800 dark:text-white mb-1">
              Welcome, <span className="text-primary">{user?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Select a course to manage its lab sessions.</p>
          </div>
          <button onClick={() => navigate('/teacher/courses')}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-md shadow-primary/25 hover:bg-primary-focus transition-all">
            <Plus size={16}/> Add Course
          </button>
        </div>

        {/* Pending Requests */}
        {requests.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5">
            <h2 className="font-heading font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-3">
              <Bell size={18}/> Pending Student Requests ({requests.length})
            </h2>
            <div className="space-y-2">
              {requests.filter(r => r.student).map(req => (
                <div key={req._id} className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl px-4 py-3 border border-amber-100 dark:border-amber-900/40">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white text-sm">{req.student?.name} <span className="text-slate-400 font-normal ml-2">({req.student?.rollNumber})</span></p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Course: <strong className="text-slate-750 dark:text-slate-350">{req.course}</strong> · {req.student?.department} · Series {req.student?.series}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRequest(req._id, 'Accepted')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors">
                      <CheckCircle size={14}/> Accept
                    </button>
                    <button onClick={() => handleRequest(req._id, 'Rejected')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-colors">
                      <XCircle size={14}/> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Courses Grid */}
        {loading ? (
          <div className="flex justify-center py-20"><span className="loading loading-spinner text-primary loading-lg"/></div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
            <BookOpen className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto mb-4"/>
            <h3 className="text-xl font-bold text-slate-700 dark:text-white mb-2">No Courses Yet</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Add your first course to start managing lab sessions.</p>
            <button onClick={() => navigate('/teacher/courses')}
              className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-md shadow-primary/25">
              <Plus size={16} className="inline mr-2"/>Add Course
            </button>
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map(course => (
              <motion.div key={course._id} variants={item}
                onClick={() => handleCourseSelect(course)}
                className="group cursor-pointer bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-primary/30 dark:hover:border-primary/30 transition-all duration-300 p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary to-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"/>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 group-hover:bg-primary flex items-center justify-center transition-colors duration-300">
                    <BookOpen className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300"/>
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-2xl text-slate-800 dark:text-white group-hover:text-primary transition-colors">{course.courseCode}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{course.courseName}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/50">
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">Series {course.series}</span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-full">{course.department}</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-primary group-hover:translate-x-1 transition-all"/>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    );
  }

  // ── Module Cards Screen ────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={() => { setSelected(null); sessionStorage.removeItem('selectedCourse'); }}
          className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-primary transition-colors flex items-center gap-1">
          ← Back
        </button>
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-heading font-extrabold text-slate-800 dark:text-white">Lab Modules</h1>
            <span className="px-4 py-1.5 bg-primary/10 text-primary font-bold rounded-xl text-lg">{selectedCourse.courseCode}</span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">{selectedCourse.courseName}</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Series {selectedCourse.series} · {selectedCourse.department}</p>
        </div>
      </div>

      <motion.div variants={container} initial="hidden" animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {MODULE_CARDS.map((card) => (
          <motion.div key={card.title} variants={item}
            onClick={() => handleModuleClick(card.path)}
            className="group cursor-pointer bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-300 p-6 relative overflow-hidden">
            <div className={`absolute -right-8 -top-8 w-28 h-28 bg-gradient-to-br ${card.color} rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`}/>
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${card.color} shadow-lg ${card.shadow} text-white transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                  {card.icon}
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                  <ChevronRight size={16}/>
                </div>
              </div>
              <h3 className="font-heading font-bold text-lg text-slate-800 dark:text-white group-hover:text-primary dark:group-hover:text-primary transition-colors">{card.title}</h3>
            </div>
            <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${card.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`}/>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Student Mark Requests for this course ─────────────────── */}
      {courseRequests.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-heading font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
              <Bell size={18} className="text-amber-500" />
              Student Mark Requests
              <span className="ml-2 px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full">
                {courseRequests.filter(r => r.status === 'Pending').length} pending
              </span>
            </h2>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {courseRequests.filter(r => r.student).map(req => (
              <div key={req._id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {req.student?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-800 dark:text-white">
                      {req.student?.name}
                      <span className="text-slate-400 font-normal ml-2">({req.student?.rollNumber})</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {req.student?.department} · Series {req.student?.series}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {req.status === 'Pending' ? (
                    <>
                      <button
                        onClick={() => handleCourseRequest(req._id, 'Accepted')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        <CheckCircle size={14} /> Accept
                      </button>
                      <button
                        onClick={() => handleCourseRequest(req._id, 'Rejected')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </>
                  ) : req.status === 'Accepted' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold rounded-lg text-xs">
                      <CheckCircle size={12} /> Accepted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 font-semibold rounded-lg text-xs">
                      <XCircle size={12} /> Rejected
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
