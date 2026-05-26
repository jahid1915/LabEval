import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-toastify';
import { LogIn, User, Eye, EyeOff, Sun, Moon, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TeacherLogin() {
  const [form, setForm]         = useState({ teacherId: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const { login }               = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate                = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    const res = await login('teacher', { ...form, teacherId: form.teacherId.toUpperCase() });
    setLoading(false);
    if (res.success) {
      toast.success('Welcome back!');
      navigate('/teacher');
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative transition-colors duration-300">
      {/* Theme Toggle */}
      <button onClick={toggleTheme} className="absolute top-4 right-4 p-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary transition-colors shadow-sm">
        {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
      </button>

      <Link to="/" className="absolute top-4 left-4 flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">
        <ArrowLeft size={16}/> Home
      </Link>

      <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
        className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-secondary to-accent mb-4 shadow-lg shadow-secondary/30">
            <User className="w-8 h-8 text-white"/>
          </div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 dark:text-white">Teacher Login</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Sign in to your teacher portal</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 border border-slate-100 dark:border-slate-800 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Teacher ID</label>
              <input name="teacherId" type="text" value={form.teacherId} onChange={handleChange} required
                placeholder="e.g. AIS, MKH"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all uppercase"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
              <div className="relative">
                <input name="password" type={showPass ? 'text' : 'password'} value={form.password} onChange={handleChange} required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all"/>
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-secondary transition-colors">
                  {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-secondary hover:bg-secondary-focus text-white rounded-xl font-bold shadow-lg shadow-secondary/25 hover:shadow-secondary/40 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <span className="loading loading-spinner loading-sm"/> : <><LogIn size={18}/> Sign In</>}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Don't have an account? <Link to="/signup/teacher" className="text-secondary font-semibold hover:underline">Sign Up</Link>
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Are you a student? <Link to="/login/student" className="text-primary font-semibold hover:underline">Student Login</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
