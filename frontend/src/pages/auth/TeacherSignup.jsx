import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-toastify';
import { UserPlus, User, Eye, EyeOff, Sun, Moon, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const DEPARTMENTS = ['CSE','EEE','ME','CIVIL','ETE','ECE','IPE','MSE','CME','MTE','BECM','ARCHI'];

export default function TeacherSignup() {
  const [form, setForm]         = useState({ name:'', teacherId:'', department:'CSE', contactNo:'', password:'', confirmPassword:'' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const { register }            = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate                = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    const { confirmPassword, ...data } = form;
    const res = await register('teacher', { ...data, teacherId: data.teacherId.toUpperCase() });
    setLoading(false);
    if (res.success) { toast.success('Account created!'); navigate('/teacher'); }
    else toast.error(res.message);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all";
  const labelClass = "text-sm font-semibold text-slate-700 dark:text-slate-300";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative transition-colors duration-300">
      <button onClick={toggleTheme} className="absolute top-4 right-4 p-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-secondary transition-colors shadow-sm">
        {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
      </button>
      <Link to="/" className="absolute top-4 left-4 flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-secondary transition-colors">
        <ArrowLeft size={16}/> Home
      </Link>

      <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }} className="w-full max-w-lg my-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-secondary to-accent mb-4 shadow-lg shadow-secondary/30">
            <User className="w-8 h-8 text-white"/>
          </div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 dark:text-white">Teacher Sign Up</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Create your teacher account</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 border border-slate-100 dark:border-slate-800 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className={labelClass}>Teacher Name</label>
              <input name="name" type="text" value={form.name} onChange={handleChange} required placeholder="Your full name" className={inputClass}/>
            </div>

            {/* Teacher ID + Dept */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Teacher ID</label>
                <input name="teacherId" type="text" value={form.teacherId} onChange={handleChange} required placeholder="e.g. AIS, MKH"
                  className={inputClass + " uppercase"}/>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Department</label>
                <select name="department" value={form.department} onChange={handleChange} className={inputClass}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-1.5">
              <label className={labelClass}>Contact No.</label>
              <input name="contactNo" type="text" value={form.contactNo} onChange={handleChange} required placeholder="01XXXXXXXXX" className={inputClass}/>
            </div>

            {/* Password + Confirm */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Password</label>
                <div className="relative">
                  <input name="password" type={showPass ? 'text' : 'password'} value={form.password} onChange={handleChange} required placeholder="••••••••" className={inputClass}/>
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-secondary">
                    {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Confirm Password</label>
                <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required placeholder="••••••••" className={inputClass}/>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-secondary hover:bg-secondary-focus text-white rounded-xl font-bold shadow-lg shadow-secondary/25 hover:shadow-secondary/40 transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
              {loading ? <span className="loading loading-spinner loading-sm"/> : <><UserPlus size={18}/> Create Account</>}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Already have an account? <Link to="/login/teacher" className="text-secondary font-semibold hover:underline">Sign In</Link>
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Are you a student? <Link to="/signup/student" className="text-primary font-semibold hover:underline">Student Sign Up</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
