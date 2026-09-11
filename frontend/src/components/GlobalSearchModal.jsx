import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Search, X, Users, BookOpen, GraduationCap, Building2, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ teachers: [], students: [], courses: [], offerings: [], departments: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ teachers: [], students: [], courses: [], offerings: [], departments: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ teachers: [], students: [], courses: [], offerings: [], departments: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(query.trim())}`);
        setResults(data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (url) => {
    onClose();
    navigate(url);
  };

  if (!isOpen) return null;

  const totalResults = results.teachers.length + results.students.length + results.courses.length + results.offerings.length + results.departments.length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[80vh]"
        >
          {/* Search Input Bar */}
          <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 gap-3">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teachers, students, course codes (e.g. ETE 3201), departments..."
              className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none text-base"
            />
            {loading ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
            ) : query ? (
              <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            ) : (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">ESC</span>
            )}
          </div>

          {/* Search Results Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!query && (
              <div className="text-center py-10 text-slate-400 text-sm">
                Type 2 or more characters to search across all faculties, departments, courses, teachers, and students.
              </div>
            )}

            {query && totalResults === 0 && !loading && (
              <div className="text-center py-10 text-slate-400 text-sm">
                No matching academic records found for "<span className="font-semibold text-slate-600 dark:text-slate-300">{query}</span>"
              </div>
            )}

            {/* Course Offerings Results */}
            {results.offerings.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Active Course Offerings
                </p>
                <div className="space-y-1">
                  {results.offerings.map((o) => (
                    <button
                      key={o._id}
                      onClick={() => handleSelect(`/admin/offerings`)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 text-left transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-primary">
                          {o.courseCode} — {o.courseName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {o.departmentCode} Dept • Series {o.seriesName} • {o.sessionName}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Master Courses Results */}
            {results.courses.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Master Course Catalog
                </p>
                <div className="space-y-1">
                  {results.courses.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => handleSelect(`/admin/courses`)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 text-left transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-indigo-500">
                          {c.courseCode}: {c.courseName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {c.departmentCode} • {c.credit} Credits • {c.courseType}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Teachers Results */}
            {results.teachers.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-500" /> Faculty & Teachers
                </p>
                <div className="space-y-1">
                  {results.teachers.map((t) => (
                    <button
                      key={t._id}
                      onClick={() => handleSelect(`/admin/teachers`)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 text-left transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-emerald-500">
                          {t.name} ({t.teacherId})
                        </p>
                        <p className="text-xs text-slate-400">
                          {t.designation || 'Lecturer'} • {t.department} Dept • {t.dutyStatus || 'ON_DUTY'}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Students Results */}
            {results.students.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-amber-500" /> Students
                </p>
                <div className="space-y-1">
                  {results.students.map((s) => (
                    <button
                      key={s._id}
                      onClick={() => handleSelect(`/admin/students`)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 text-left transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-amber-500">
                          {s.name} (Roll: {s.rollNumber})
                        </p>
                        <p className="text-xs text-slate-400">
                          {s.department} Dept • Series {s.series} • {s.status}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Departments Results */}
            {results.departments.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-sky-500" /> Departments
                </p>
                <div className="space-y-1">
                  {results.departments.map((d) => (
                    <button
                      key={d._id}
                      onClick={() => handleSelect(`/admin/departments`)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 text-left transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-sky-500">
                          {d.name} ({d.code})
                        </p>
                        <p className="text-xs text-slate-400">Head: {d.headName || 'N/A'}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Navigation: Click an item to open</span>
            <span className="flex items-center gap-1 font-mono">
              <span>Press</span> <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-xs">ESC</kbd> <span>to close</span>
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
