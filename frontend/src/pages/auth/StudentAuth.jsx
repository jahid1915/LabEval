import React, { useState, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-toastify';
import { UserPlus, GraduationCap, LogIn, Eye, EyeOff, Sun, Moon, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEPARTMENTS = ['CSE','EEE','ME','CIVIL','ETE','ECE','IPE','MSE','CME','MTE','BECM','ARCHI'];

export default function StudentAuth() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname.includes('/login');

  // Shared States
  const { login, register } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Form States
  const [loginForm, setLoginForm] = useState({ rollNumber: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', rollNumber: '', series: '', contactNo: '', department: 'CSE', password: '', confirmPassword: '' });

  const handleLoginChange = e => setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  const handleSignupChange = e => setSignupForm({ ...signupForm, [e.target.name]: e.target.value });

  const handleLoginSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    const res = await login('student', loginForm);
    setLoading(false);
    if (res.success) {
      toast.success('Welcome back!');
      navigate('/student');
    } else {
      toast.error(res.message);
    }
  };

  const handleSignupSubmit = async e => {
    e.preventDefault();
    if (signupForm.password !== signupForm.confirmPassword) return toast.error('Passwords do not match');
    if (signupForm.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    const { confirmPassword, ...data } = signupForm;
    const res = await register('student', data);
    setLoading(false);
    if (res.success) { 
      toast.success('Account created!'); 
      navigate('/student'); 
    } else { 
      toast.error(res.message); 
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";
  const labelClass = "text-sm font-semibold text-slate-700 dark:text-slate-300";

  // Animation variants
  const variants = {
    enter: (direction) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({ x: direction < 0 ? 300 : -300, opacity: 0 })
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 relative transition-colors duration-300 overflow-hidden">
      <button onClick={toggleTheme} className="absolute top-4 right-4 p-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary transition-colors shadow-sm z-50">
        {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
      </button>
      <Link to="/" className="absolute top-4 left-4 flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-primary transition-colors z-50">
        <ArrowLeft size={16}/> Home
      </Link>

      <div className="w-full max-w-lg z-10 flex flex-col items-center mt-4">
        {/* Header Icon */}
        <motion.div layoutId="student-icon" className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent mb-4 shadow-lg shadow-primary/30">
          <GraduationCap className="w-8 h-8 text-white"/>
        </motion.div>
        <h1 className="text-3xl font-heading font-extrabold text-slate-900 dark:text-white mb-6">Student Portal</h1>

        {/* Sliding Toggle */}
        <div className="relative flex w-full max-w-[280px] bg-slate-200 dark:bg-slate-800 rounded-full p-1 mb-8 shadow-inner">
          <motion.div 
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-700 rounded-full shadow-sm"
            initial={false}
            animate={{ x: isLogin ? 0 : '100%' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          <button 
            type="button"
            className={`relative flex-1 py-2.5 text-sm font-bold rounded-full z-10 transition-colors ${isLogin ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}
            onClick={() => navigate('/login/student', { replace: true })}
          >
            Sign In
          </button>
          <button 
            type="button"
            className={`relative flex-1 py-2.5 text-sm font-bold rounded-full z-10 transition-colors ${!isLogin ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}
            onClick={() => navigate('/signup/student', { replace: true })}
          >
            Sign Up
          </button>
        </div>

        {/* Forms Container */}
        <div className="w-full relative min-h-[460px]">
          <AnimatePresence mode="wait" custom={isLogin ? -1 : 1}>
            {isLogin ? (
              <motion.div
                key="login" custom={-1}
                variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}
                className="w-full absolute top-0"
              >
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 border border-slate-100 dark:border-slate-800 p-8">
                  <form onSubmit={handleLoginSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className={labelClass}>Student ID</label>
                      <input name="rollNumber" type="text" value={loginForm.rollNumber} onChange={handleLoginChange} required placeholder="e.g. 2204001" className={inputClass}/>
                    </div>
                    <div className="space-y-1.5">
                      <label className={labelClass}>Password</label>
                      <div className="relative">
                        <input name="password" type={showPass ? 'text' : 'password'} value={loginForm.password} onChange={handleLoginChange} required placeholder="••••••••" className={`${inputClass} pr-12`}/>
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary">
                          {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                        </button>
                      </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-3.5 bg-primary hover:bg-primary-focus text-white rounded-xl font-bold shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-60">
                      {loading ? <span className="loading loading-spinner loading-sm"/> : <><LogIn size={18}/> Sign In</>}
                    </button>
                  </form>
                  <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Are you a teacher? <Link to="/login/teacher" className="text-secondary font-semibold hover:underline">Teacher Portal</Link>
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="signup" custom={1}
                variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}
                className="w-full absolute top-0"
              >
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 border border-slate-100 dark:border-slate-800 p-8">
                  <form onSubmit={handleSignupSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className={labelClass}>Full Name</label>
                      <input name="name" type="text" value={signupForm.name} onChange={handleSignupChange} required placeholder="Your full name" className={inputClass}/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className={labelClass}>Student ID</label>
                        <input name="rollNumber" type="text" value={signupForm.rollNumber} onChange={handleSignupChange} required placeholder="e.g. 2204001" className={inputClass}/>
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelClass}>Series</label>
                        <input name="series" type="text" value={signupForm.series} onChange={handleSignupChange} required placeholder="e.g. 22" className={inputClass}/>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className={labelClass}>Contact No.</label>
                        <input name="contactNo" type="text" value={signupForm.contactNo} onChange={handleSignupChange} required placeholder="01XXXXXXXXX" className={inputClass}/>
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelClass}>Department</label>
                        <select name="department" value={signupForm.department} onChange={handleSignupChange} className={inputClass}>
                          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className={labelClass}>Password</label>
                        <div className="relative">
                          <input name="password" type={showPass ? 'text' : 'password'} value={signupForm.password} onChange={handleSignupChange} required placeholder="••••••••" className={inputClass}/>
                          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary">
                            {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelClass}>Confirm</label>
                        <input name="confirmPassword" type="password" value={signupForm.confirmPassword} onChange={handleSignupChange} required placeholder="••••••••" className={inputClass}/>
                      </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-3.5 bg-primary hover:bg-primary-focus text-white rounded-xl font-bold shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-60">
                      {loading ? <span className="loading loading-spinner loading-sm"/> : <><UserPlus size={18}/> Create Account</>}
                    </button>
                  </form>
                  <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Are you a teacher? <Link to="/signup/teacher" className="text-secondary font-semibold hover:underline">Teacher Portal</Link>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
