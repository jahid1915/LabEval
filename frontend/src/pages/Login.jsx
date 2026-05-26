import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-toastify';
import { LogIn, UserPlus, User, BookOpen, GraduationCap, Building2, Phone, Hash, Type, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [role, setRole] = useState('student');
  const [formData, setFormData] = useState({
    name: '',
    series: '',
    rollNumber: '',
    teacherId: '',
    contactNo: '',
    password: '',
    confirmPassword: '',
    department: 'CSE',
  });
  
  const [allocatedCourses, setAllocatedCourses] = useState([{ courseCode: '', series: '' }]);
  const [enrolledCourses, setEnrolledCourses] = useState([{ courseCode: '' }]);
  
  const { login, register } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    // Auto-generate Teacher ID if switching to teacher register
    if (newMode === 'register' && role === 'teacher' && !formData.teacherId) {
      setFormData(prev => ({ ...prev, teacherId: prev.department + '-' + Math.floor(1000 + Math.random() * 9000) }));
    }
  };

  const handleRoleSwitch = (newRole) => {
    setRole(newRole);
    // Auto-generate Teacher ID if switching to teacher register
    if (mode === 'register' && newRole === 'teacher') {
      setFormData(prev => ({ ...prev, teacherId: prev.department + '-' + Math.floor(1000 + Math.random() * 9000) }));
    }
  };

  const handleDepartmentChange = (e) => {
    const newDept = e.target.value;
    setFormData(prev => {
      const updates = { department: newDept };
      // Regenerate Teacher ID with new department prefix if in teacher register mode
      if (mode === 'register' && role === 'teacher') {
        updates.teacherId = newDept + '-' + Math.floor(1000 + Math.random() * 9000);
      }
      return { ...prev, ...updates };
    });
  };

  const handleCourseChange = (index, field, value) => {
    const newCourses = [...allocatedCourses];
    newCourses[index][field] = value;
    setAllocatedCourses(newCourses);
  };

  const handleAddCourse = () => {
    setAllocatedCourses([...allocatedCourses, { courseCode: '', series: '' }]);
  };

  const handleRemoveCourse = (index) => {
    const newCourses = allocatedCourses.filter((_, i) => i !== index);
    setAllocatedCourses(newCourses);
  };

  const handleEnrolledCourseChange = (index, value) => {
    const updated = [...enrolledCourses];
    updated[index].courseCode = value;
    setEnrolledCourses(updated);
  };

  const handleAddEnrolledCourse = () => {
    setEnrolledCourses([...enrolledCourses, { courseCode: '' }]);
  };

  const handleRemoveEnrolledCourse = (index) => {
    setEnrolledCourses(enrolledCourses.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === 'register') {
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      const credentials = role === 'student' 
        ? { 
            name: formData.name, 
            series: formData.series, 
            rollNumber: formData.rollNumber, 
            department: formData.department, 
            contactNo: formData.contactNo, 
            password: formData.password,
            enrolledCourses: enrolledCourses.filter(c => c.courseCode)
          }
        : { 
            name: formData.name, 
            teacherId: formData.teacherId, 
            department: formData.department, 
            contactNo: formData.contactNo, 
            password: formData.password,
            allocatedCourses: allocatedCourses.filter(c => c.courseCode && c.series)
          };

      const res = await register(role, credentials);
      if (res.success) {
        toast.success('Registration Successful! Logging you in...');
        navigate(role === 'teacher' ? '/teacher' : '/student');
      } else {
        toast.error(res.message);
      }
    } else {
      // Login mode
      const credentials = role === 'student' 
        ? { rollNumber: formData.rollNumber, password: formData.password, department: formData.department }
        : { teacherId: formData.teacherId, password: formData.password, department: formData.department };

      const res = await login(role, credentials);
      if (res.success) {
        toast.success('Login Successful');
        navigate(role === 'teacher' ? '/teacher' : '/student');
      } else {
        toast.error(res.message);
      }
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 sm:p-8 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors"
        aria-label="Toggle theme"
      >
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      {/* Premium Geometric Background Elements */}
      <div className="absolute inset-0 z-0 bg-grid-pattern opacity-50 dark:opacity-10"></div>
      
      {/* Animated glowing orbs for geometric depth */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 dark:opacity-40 animate-blob z-0"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-secondary/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 dark:opacity-40 animate-blob animation-delay-2000 z-0"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[30rem] h-[30rem] bg-accent/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 dark:opacity-40 animate-blob animation-delay-4000 z-0"></div>

      {/* Main Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="glass-panel max-w-5xl w-full rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row z-10 my-8"
      >
        
        {/* Branding Section */}
        <div className="w-full md:w-5/12 bg-gradient-to-br from-primary via-primary-focus to-secondary p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 dark:bg-slate-900/10 backdrop-blur-sm z-0"></div>
          
          <div className="relative z-10 flex items-center gap-3">
            <span className="font-heading font-bold text-2xl tracking-tight">RUET</span>
          </div>

          <div className="relative z-10 my-16">
            <motion.img 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              src="https://upload.wikimedia.org/wikipedia/en/f/f7/Rajshahi_University_of_Engineering_%26_Technology_emblem.svg" alt="RUET Logo" 
              className="w-16 h-16 object-contain mb-6 drop-shadow-lg" 
            />
            <h1 className="text-5xl font-heading font-extrabold mb-4 leading-tight">
              LabEval <br/> <span className="text-white/80 font-light text-3xl">RUET</span>
            </h1>
            <p className="opacity-90 max-w-sm text-lg font-light leading-relaxed">
              The next-generation laboratory performance tracking and evaluation platform.
            </p>
          </div>

          <div className="relative z-10 text-sm font-medium opacity-80">
            © 2026 LabEval RUET
          </div>
        </div>

        {/* Form Section */}
        <div className="w-full md:w-7/12 p-8 sm:p-14 bg-white/40 dark:bg-slate-900/40">
          
          {/* Mode Switcher (Log In / Sign Up) */}
          <div className="flex justify-end mb-6">
             <div className="flex bg-white/60 dark:bg-slate-800/60 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
               <button 
                 type="button"
                 onClick={() => handleModeSwitch('login')}
                 className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${mode === 'login' ? 'bg-slate-800 dark:bg-slate-750 text-white shadow' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
               >
                 Log In
               </button>
               <button 
                 type="button"
                 onClick={() => handleModeSwitch('register')}
                 className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${mode === 'register' ? 'bg-slate-800 dark:bg-slate-750 text-white shadow' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
               >
                 Sign Up
               </button>
             </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-heading font-bold text-slate-800 dark:text-white mb-2">
              {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {mode === 'login' ? 'Please sign in to access your dashboard' : 'Register to get started with LabEval RUET'}
            </p>
          </div>

          {/* Premium Role Switcher */}
          <div className="flex p-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl mb-8 shadow-sm border border-white/60 dark:border-slate-700/50">
            <button 
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-300 ${role === 'student' ? 'bg-white dark:bg-slate-750 text-primary dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              onClick={() => handleRoleSwitch('student')}
            >
              <GraduationCap className="w-5 h-5" />
              Student Portal
            </button>
            <button 
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-300 ${role === 'teacher' ? 'bg-white dark:bg-slate-750 text-secondary dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              onClick={() => handleRoleSwitch('teacher')}
            >
              <User className="w-5 h-5" />
              Teacher Portal
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <AnimatePresence mode="popLayout">
              {mode === 'register' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                        <Type className="h-5 w-5" />
                      </div>
                      <input 
                        type="text" 
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full pl-12 pr-4 py-3 bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 dark:text-white font-medium"
                        placeholder="John Doe"
                        required={mode === 'register'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {role === 'student' && (
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Series</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                            <Hash className="h-5 w-5" />
                          </div>
                          <input 
                            type="text" 
                            name="series"
                            value={formData.series}
                            onChange={handleChange}
                            className="w-full pl-12 pr-4 py-3 bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 dark:text-white font-medium"
                            placeholder="e.g. 2022"
                            required={mode === 'register' && role === 'student'}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Contact No.</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                          <Phone className="h-5 w-5" />
                        </div>
                        <input 
                          type="text" 
                          name="contactNo"
                          value={formData.contactNo}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-3 bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 dark:text-white font-medium"
                          placeholder="e.g. 01712345678"
                          required={mode === 'register'}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence>
                {mode === 'register' && (
                  <motion.div 
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="space-y-1"
                  >
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Department</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <select 
                        name="department" 
                        value={formData.department} 
                        onChange={handleDepartmentChange} 
                        className="w-full pl-12 pr-4 py-3 bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 dark:text-white font-medium appearance-none"
                      >
                        <option value="CSE" className="dark:bg-slate-800">CSE</option>
                        <option value="EEE" className="dark:bg-slate-800">EEE</option>
                        <option value="ME" className="dark:bg-slate-800">ME</option>
                        <option value="CE" className="dark:bg-slate-800">CE</option>
                        <option value="ETE" className="dark:bg-slate-800">ETE</option>
                        <option value="ECE" className="dark:bg-slate-800">ECE</option>
                        <option value="IPE" className="dark:bg-slate-800">IPE</option>
                        <option value="MTE" className="dark:bg-slate-800">MTE</option>
                        <option value="MSE" className="dark:bg-slate-800">MSE</option>
                        <option value="CME" className="dark:bg-slate-800">CME</option>
                        <option value="BECM" className="dark:bg-slate-800">BECM</option>
                        <option value="ARCHI" className="dark:bg-slate-800">ARCHI</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={`space-y-1 ${mode === 'login' ? 'col-span-1 sm:col-span-2' : ''}`}>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                  {role === 'student' ? 'Roll Number' : 'Teacher ID'}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                    {role === 'student' ? <GraduationCap className="h-5 w-5" /> : <User className="h-5 w-5" />}
                  </div>
                  <input 
                    type="text" 
                    name={role === 'student' ? 'rollNumber' : 'teacherId'}
                    value={role === 'student' ? formData.rollNumber : formData.teacherId}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium"
                    placeholder={role === 'student' ? 'e.g. 2204001' : (formData.department + '-101')}
                    required 
                  />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {mode === 'register' && role === 'student' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between mt-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Enrolled Courses</label>
                    <button 
                      type="button" 
                      onClick={handleAddEnrolledCourse}
                      className="text-xs font-bold text-primary hover:text-primary-focus bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      + Add Course
                    </button>
                  </div>

                  {enrolledCourses.map((course, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          value={course.courseCode}
                          onChange={(e) => handleEnrolledCourseChange(index, e.target.value)}
                          className="w-full px-3 py-2.5 bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium text-slate-800 dark:text-white"
                          placeholder="Course Code (e.g. ETE-2200)"
                        />
                      </div>
                      {enrolledCourses.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveEnrolledCourse(index)}
                          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors flex-shrink-0"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {mode === 'register' && role === 'teacher' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between mt-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Allocated Courses</label>
                    <button 
                      type="button" 
                      onClick={handleAddCourse}
                      className="text-xs font-bold text-primary hover:text-primary-focus bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      + Add Course
                    </button>
                  </div>
                  
                  {allocatedCourses.map((course, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1 space-y-1">
                        <input 
                          type="text" 
                          value={course.courseCode}
                          onChange={(e) => handleCourseChange(index, 'courseCode', e.target.value)}
                          className="w-full px-3 py-2.5 bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium text-slate-800 dark:text-white"
                          placeholder="Code (e.g. ETE-2200)"
                          required
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <input 
                          type="text" 
                          value={course.series}
                          onChange={(e) => handleCourseChange(index, 'series', e.target.value)}
                          className="w-full px-3 py-2.5 bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium text-slate-800 dark:text-white"
                          placeholder="Series (e.g. 22)"
                          required
                        />
                      </div>
                      {allocatedCourses.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveCourse(index)}
                          className="mt-1 p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`grid grid-cols-1 ${mode === 'register' ? 'sm:grid-cols-2' : ''} gap-4 pb-2 pt-2`}>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Password</label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium tracking-wide"
                  placeholder="••••••••"
                  required 
                />
              </div>

              <AnimatePresence>
                {mode === 'register' && (
                  <motion.div 
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="space-y-1"
                  >
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Confirm Password</label>
                    <input 
                      type="password" 
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium tracking-wide"
                      placeholder="••••••••"
                      required={mode === 'register'} 
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button type="submit" className="w-full py-3.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-650 text-white rounded-xl font-semibold shadow-xl shadow-slate-900/20 hover:shadow-slate-900/40 transition-all flex items-center justify-center gap-2 group mt-4">
              {mode === 'login' ? 'Sign In to Portal' : 'Create Account'}
              {mode === 'login' ? <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> : <UserPlus className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
            
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
