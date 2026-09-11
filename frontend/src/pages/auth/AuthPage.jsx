import { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-toastify';
import {
  GraduationCap, User, Shield, Eye, EyeOff,
  Sun, Moon, ArrowLeft, CheckCircle2, Lock,
  Phone, Hash, Building2, Sparkles, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEPARTMENTS = [
  'CSE', 'EEE', 'ME', 'CIVIL', 'ETE', 'ECE',
  'IPE', 'MSE', 'CME', 'MTE', 'BECM', 'ARCHI'
];

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useTheme();

  // Determine initial role and mode from URL
  const initialRole = location.pathname.includes('admin')
    ? 'admin'
    : location.pathname.includes('teacher')
    ? 'teacher'
    : 'student';

  const initialMode = location.pathname.includes('signup') ? 'signup' : 'login';

  const [role, setRole] = useState(initialRole);
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Sync state if URL changes
  useEffect(() => {
    if (location.pathname.includes('admin')) setRole('admin');
    else if (location.pathname.includes('teacher')) setRole('teacher');
    else if (location.pathname.includes('student')) setRole('student');

    if (location.pathname.includes('signup')) setMode('signup');
    else setMode('login');
  }, [location.pathname]);

  // Form states
  const [studentForm, setStudentForm] = useState({
    rollNumber: '',
    name: '',
    series: '',
    department: 'CSE',
    contactNo: '',
    password: '',
    confirmPassword: '',
  });

  const [teacherForm, setTeacherForm] = useState({
    teacherId: '',
    name: '',
    department: 'CSE',
    contactNo: '',
    password: '',
    confirmPassword: '',
  });

  const [adminForm, setAdminForm] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    contactNo: '',
    confirmPassword: '',
  });

  const handleStudentChange = (e) => setStudentForm({ ...studentForm, [e.target.name]: e.target.value });
  const handleTeacherChange = (e) => setTeacherForm({ ...teacherForm, [e.target.name]: e.target.value });
  const handleAdminChange = (e) => setAdminForm({ ...adminForm, [e.target.name]: e.target.value });

  // Autofill helpers for rapid testing/evaluation
  const fillDemo = (targetRole) => {
    if (targetRole === 'student') {
      setRole('student');
      setMode('login');
      setStudentForm((prev) => ({ ...prev, rollNumber: '2204001', password: 'password123' }));
      toast.info('Autofilled sample Student credentials');
    } else if (targetRole === 'teacher') {
      setRole('teacher');
      setMode('login');
      setTeacherForm((prev) => ({ ...prev, teacherId: 'T-101', password: 'password123' }));
      toast.info('Autofilled sample Teacher credentials');
    } else if (targetRole === 'admin') {
      setRole('admin');
      setMode('login');
      setAdminForm((prev) => ({ ...prev, username: 'admin', password: 'admin123' }));
      toast.info('Autofilled Super Admin credentials');
    }
  };

  const handleRoleSwitch = (newRole) => {
    setRole(newRole);
    if (newRole === 'admin') {
      setMode('login');
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (role === 'student') {
        if (mode === 'login') {
          const res = await login('student', {
            rollNumber: studentForm.rollNumber.trim(),
            password: studentForm.password,
          });
          if (res.success) {
            toast.success(`Welcome back, ${res.user?.name || 'Student'}!`);
            navigate('/student');
          } else {
            toast.error(res.message);
          }
        } else {
          if (studentForm.password !== studentForm.confirmPassword) {
            setLoading(false);
            return toast.error('Passwords do not match');
          }
          if (studentForm.password.length < 6) {
            setLoading(false);
            return toast.error('Password must be at least 6 characters');
          }
          const { confirmPassword, ...payload } = studentForm;
          const res = await register('student', {
            ...payload,
            rollNumber: payload.rollNumber.trim(),
          });
          if (res.success) {
            toast.success('Student account created successfully!');
            navigate('/student');
          } else {
            toast.error(res.message);
          }
        }
      } else if (role === 'teacher') {
        if (mode === 'login') {
          const res = await login('teacher', {
            teacherId: teacherForm.teacherId.trim().toUpperCase(),
            password: teacherForm.password,
          });
          if (res.success) {
            toast.success(`Welcome back, ${res.user?.name || 'Instructor'}!`);
            navigate('/teacher');
          } else {
            toast.error(res.message);
          }
        } else {
          if (teacherForm.password !== teacherForm.confirmPassword) {
            setLoading(false);
            return toast.error('Passwords do not match');
          }
          if (teacherForm.password.length < 6) {
            setLoading(false);
            return toast.error('Password must be at least 6 characters');
          }
          const { confirmPassword, ...payload } = teacherForm;
          const res = await register('teacher', {
            ...payload,
            teacherId: payload.teacherId.trim().toUpperCase(),
          });
          if (res.success) {
            toast.success('Teacher account created successfully!');
            navigate('/teacher');
          } else {
            toast.error(res.message);
          }
        }
      } else if (role === 'admin') {
        if (mode === 'login') {
          const res = await login('admin', {
            username: adminForm.username.trim(),
            password: adminForm.password,
          });
          if (res.success) {
            toast.success('Administrator access verified!');
            navigate('/admin');
          } else {
            toast.error(res.message);
          }
        } else {
          if (adminForm.password !== adminForm.confirmPassword) {
            setLoading(false);
            return toast.error('Passwords do not match');
          }
          const { confirmPassword, ...payload } = adminForm;
          const res = await register('admin', payload);
          if (res.success) {
            toast.success('Admin account created!');
            navigate('/admin');
          } else {
            toast.error(res.message);
          }
        }
      }
    } catch (err) {
      toast.error(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  // Role metadata
  const roleConfig = {
    student: {
      title: 'Student Portal',
      subtitle: 'Track your attendance, report submissions, and lab grades',
      icon: <GraduationCap className="w-7 h-7" />,
      gradient: 'from-blue-600 via-cyan-600 to-teal-500',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      activeBtn: 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-blue-500/30',
    },
    teacher: {
      title: 'Instructor Portal',
      subtitle: 'Manage lab courses, continuous evaluations, and result sheets',
      icon: <User className="w-7 h-7" />,
      gradient: 'from-indigo-600 via-purple-600 to-fuchsia-600',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      activeBtn: 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-purple-500/30',
    },
    admin: {
      title: 'Administrator Console',
      subtitle: 'System-wide control of faculty, students, courses, and analytics',
      icon: <Shield className="w-7 h-7" />,
      gradient: 'from-amber-600 via-orange-600 to-rose-600',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      activeBtn: 'bg-gradient-to-r from-amber-600 to-orange-600 shadow-orange-500/30',
    },
  };

  const currentRoleConfig = roleConfig[role];
  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm font-medium shadow-inner';
  const labelClass = 'text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative transition-colors duration-300 overflow-x-hidden">
      
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-primary/15 via-secondary/15 to-accent/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-2xl pointer-events-none -z-10" />

      {/* Top Controls */}
      <div className="w-full max-w-xl flex items-center justify-between mb-4 z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-primary transition-all shadow-sm group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-primary transition-all shadow-sm"
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-xl z-10">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-black/60 p-6 sm:p-8 relative overflow-hidden">
          
          {/* Institutional Branding Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 p-2 shadow-md border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                <img src="/RUET.png" alt="RUET Logo" className="w-full h-full object-contain" />
              </div>
              <div className="text-left">
                <h2 className="font-heading font-extrabold text-lg text-slate-900 dark:text-white leading-tight">
                  LabEval RUET
                </h2>
                <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${currentRoleConfig.badgeColor}`}>
                  {currentRoleConfig.title}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              {currentRoleConfig.subtitle}
            </p>
          </div>

          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-6 border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => handleRoleSwitch('student')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-heading text-xs font-bold transition-all ${
                role === 'student'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GraduationCap size={15} />
              <span>Student</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSwitch('teacher')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-heading text-xs font-bold transition-all ${
                role === 'teacher'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User size={15} />
              <span>Teacher</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSwitch('admin')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-heading text-xs font-bold transition-all ${
                role === 'admin'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield size={15} />
              <span>Admin</span>
            </button>
          </div>

          {/* Mode Slider Toggle (Sign In vs Sign Up) - for Student & Teacher */}
          {role !== 'admin' && (
            <div className="relative flex w-full max-w-[260px] mx-auto bg-slate-100 dark:bg-slate-800/80 rounded-full p-1 mb-6 border border-slate-200/60 dark:border-slate-700/60">
              <motion.div
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-700 rounded-full shadow-sm"
                initial={false}
                animate={{ x: mode === 'login' ? 0 : '100%' }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
              <button
                type="button"
                className={`relative flex-1 py-1.5 text-xs font-bold rounded-full z-10 transition-colors ${
                  mode === 'login'
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
                onClick={() => setMode('login')}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`relative flex-1 py-1.5 text-xs font-bold rounded-full z-10 transition-colors ${
                  mode === 'signup'
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
                onClick={() => setMode('signup')}
              >
                Register
              </button>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {/* ────────────────── STUDENT FORMS ────────────────── */}
              {role === 'student' && mode === 'login' && (
                <motion.div
                  key="student-login"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div>
                    <label className={labelClass}>
                      <Hash size={13} className="text-primary" />
                      Student Roll Number
                    </label>
                    <input
                      type="text"
                      name="rollNumber"
                      required
                      placeholder="e.g. 2211001"
                      value={studentForm.rollNumber}
                      onChange={handleStudentChange}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      <Lock size={13} className="text-primary" />
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        name="password"
                        required
                        placeholder="••••••••"
                        value={studentForm.password}
                        onChange={handleStudentChange}
                        className={`${inputClass} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {role === 'student' && mode === 'signup' && (
                <motion.div
                  key="student-signup"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className={labelClass}>Full Name</label>
                      <input
                        type="text"
                        name="name"
                        required
                        placeholder="e.g. John Doe"
                        value={studentForm.name}
                        onChange={handleStudentChange}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Academic Series</label>
                      <input
                        type="text"
                        name="series"
                        required
                        placeholder="e.g. 22"
                        value={studentForm.series}
                        onChange={handleStudentChange}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className={labelClass}>Roll Number</label>
                      <input
                        type="text"
                        name="rollNumber"
                        required
                        placeholder="e.g. 2211001"
                        value={studentForm.rollNumber}
                        onChange={handleStudentChange}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Department</label>
                      <select
                        name="department"
                        value={studentForm.department}
                        onChange={handleStudentChange}
                        className={inputClass}
                      >
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Contact Number</label>
                    <input
                      type="text"
                      name="contactNo"
                      required
                      placeholder="e.g. 017xxxxxxxx"
                      value={studentForm.contactNo}
                      onChange={handleStudentChange}
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className={labelClass}>Password</label>
                      <input
                        type="password"
                        name="password"
                        required
                        placeholder="Min 6 characters"
                        value={studentForm.password}
                        onChange={handleStudentChange}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Confirm Password</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        required
                        placeholder="Confirm password"
                        value={studentForm.confirmPassword}
                        onChange={handleStudentChange}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ────────────────── TEACHER FORMS ────────────────── */}
              {role === 'teacher' && mode === 'login' && (
                <motion.div
                  key="teacher-login"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div>
                    <label className={labelClass}>
                      <Hash size={13} className="text-secondary" />
                      Teacher Identification Code (Teacher ID)
                    </label>
                    <input
                      type="text"
                      name="teacherId"
                      required
                      placeholder="e.g. T-101 or AIS"
                      value={teacherForm.teacherId}
                      onChange={handleTeacherChange}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      <Lock size={13} className="text-secondary" />
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        name="password"
                        required
                        placeholder="••••••••"
                        value={teacherForm.password}
                        onChange={handleTeacherChange}
                        className={`${inputClass} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {role === 'teacher' && mode === 'signup' && (
                <motion.div
                  key="teacher-signup"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className={labelClass}>Full Name</label>
                      <input
                        type="text"
                        name="name"
                        required
                        placeholder="e.g. Dr. Jane Smith"
                        value={teacherForm.name}
                        onChange={handleTeacherChange}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Teacher ID</label>
                      <input
                        type="text"
                        name="teacherId"
                        required
                        placeholder="e.g. T-101 or JSM"
                        value={teacherForm.teacherId}
                        onChange={handleTeacherChange}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className={labelClass}>Department</label>
                      <select
                        name="department"
                        value={teacherForm.department}
                        onChange={handleTeacherChange}
                        className={inputClass}
                      >
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Contact Number</label>
                      <input
                        type="text"
                        name="contactNo"
                        required
                        placeholder="e.g. 017xxxxxxxx"
                        value={teacherForm.contactNo}
                        onChange={handleTeacherChange}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className={labelClass}>Password</label>
                      <input
                        type="password"
                        name="password"
                        required
                        placeholder="Min 6 characters"
                        value={teacherForm.password}
                        onChange={handleTeacherChange}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Confirm Password</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        required
                        placeholder="Confirm password"
                        value={teacherForm.confirmPassword}
                        onChange={handleTeacherChange}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ────────────────── ADMIN FORMS ────────────────── */}
              {role === 'admin' && (
                <motion.div
                  key="admin-login"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                    <Shield size={16} className="shrink-0 mt-0.5" />
                    <span>
                      Restricted Administrative Console. Enter your super administrator credentials to manage courses, faculty, and student registries.
                    </span>
                  </div>

                  <div>
                    <label className={labelClass}>
                      <User size={13} className="text-amber-500" />
                      Administrator Username / Email
                    </label>
                    <input
                      type="text"
                      name="username"
                      required
                      placeholder="e.g. admin or admin@ruet.ac.bd"
                      value={adminForm.username}
                      onChange={handleAdminChange}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      <Lock size={13} className="text-amber-500" />
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        name="password"
                        required
                        placeholder="••••••••"
                        value={adminForm.password}
                        onChange={handleAdminChange}
                        className={`${inputClass} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 px-6 rounded-xl font-heading font-bold text-sm text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2 mt-2 ${
                currentRoleConfig.activeBtn
              } hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50`}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <span>
                    {mode === 'login'
                      ? `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`
                      : `Create ${role.charAt(0).toUpperCase() + role.slice(1)} Account`}
                  </span>
                  <Sparkles size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Strip */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Quick Demo Fillers
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fillDemo('student')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 transition-colors"
              >
                🎓 Demo Student
              </button>
              <button
                type="button"
                onClick={() => fillDemo('teacher')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 transition-colors"
              >
                👨‍🏫 Demo Teacher
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 transition-colors"
              >
                🛡️ Demo Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
