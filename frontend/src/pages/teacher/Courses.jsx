import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, BookOpen, Loader2 } from 'lucide-react';

const DEPARTMENTS = ['CSE','EEE','ME','CIVIL','ETE','ECE','IPE','MSE','CME','MTE','BECM','ARCHI'];

export default function Courses() {
  const { user } = useContext(AuthContext);
  const [courses, setCourses]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm]         = useState({
    courseCode: '', courseName: '', series: '', department: user?.department || 'CSE'
  });

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/teacher/courses');
      setCourses(data);
    } catch (err) {
      toast.error('Failed to load courses');
    } finally { setLoading(false); }
  };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAdd = async e => {
    e.preventDefault();
    if (!form.courseCode || !form.courseName || !form.series) {
      return toast.error('All fields are required');
    }
    setSaving(true);
    try {
      const { data } = await api.post('/teacher/courses', form);
      setCourses(prev => [data, ...prev]);
      setForm({ courseCode: '', courseName: '', series: '', department: form.department });
      toast.success('Course added successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add course');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this course?')) return;
    setDeleting(id);
    try {
      await api.delete(`/teacher/courses/${id}`);
      setCourses(prev => prev.filter(c => c._id !== id));
      toast.success('Course removed');
    } catch (err) {
      toast.error('Failed to remove course');
    } finally { setDeleting(null); }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-extrabold text-slate-800 dark:text-white mb-1">My Courses</h1>
        <p className="text-slate-500 dark:text-slate-400">Add and manage courses you are teaching.</p>
      </div>

      {/* Add Course Form */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
        <h2 className="text-lg font-heading font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary"/> Add New Course
        </h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Course Code</label>
            <input name="courseCode" value={form.courseCode} onChange={handleChange} placeholder="e.g. ETE2200" className={inputClass}/>
          </div>
          <div className="space-y-1.5 sm:col-span-1 lg:col-span-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Course Name</label>
            <input name="courseName" value={form.courseName} onChange={handleChange} placeholder="e.g. Antenna Design" className={inputClass}/>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Series</label>
            <input name="series" value={form.series} onChange={handleChange} placeholder="e.g. 22" className={inputClass}/>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Department</label>
            <select name="department" value={form.department} onChange={handleChange} className={inputClass}>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={saving}
              className="px-8 py-2.5 bg-primary hover:bg-primary-focus text-white rounded-xl font-bold text-sm shadow-md shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}
              {saving ? 'Adding...' : 'Add Course'}
            </button>
          </div>
        </form>
      </div>

      {/* Course List */}
      <div>
        <h2 className="text-lg font-heading font-bold text-slate-800 dark:text-white mb-4">
          Your Courses <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({courses.length})</span>
        </h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner text-primary loading-lg"/>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3"/>
            <p className="text-slate-500 dark:text-slate-400 font-medium">No courses yet. Add your first course above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {courses.map((course, i) => (
                <motion.div key={course._id}
                  initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, scale:0.9 }}
                  transition={{ delay: i * 0.05 }}
                  className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-primary/30 dark:hover:border-primary/30 transition-all p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity"/>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary"/>
                    </div>
                    <button onClick={() => handleDelete(course._id)} disabled={deleting === course._id}
                      className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                      {deleting === course._id ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16}/>}
                    </button>
                  </div>
                  <h3 className="font-heading font-bold text-xl text-slate-800 dark:text-white">{course.courseCode}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mt-0.5">{course.courseName}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">Series {course.series}</span>
                    <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-full">{course.department}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
