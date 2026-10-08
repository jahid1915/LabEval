import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { BookOpen, Search, RefreshCw } from 'lucide-react';

export default function HeadCoursesPage() {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');

  const deptCode = user?.departmentCode || user?.department || 'ETE';

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/head/courses');
      if (res.data?.success) {
        setCourses(res.data.courses || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load department courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const filteredCourses = courses.filter(c =>
    c.courseCode?.toLowerCase().includes(search.toLowerCase()) ||
    c.courseTitle?.toLowerCase().includes(search.toLowerCase()) ||
    c.semesterLevel?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Curriculum & Catalog • {deptCode}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Department Course Catalog
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official courses belonging to {deptCode} department.
          </p>
        </div>

        <button
          onClick={fetchCourses}
          disabled={loading}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter courses by code (e.g. ETE 3200), title, semester..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Course Code</th>
                <th className="px-4 py-3">Course Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Credit</th>
                <th className="px-4 py-3">Semester</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-slate-400">
                    Loading course catalog...
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-slate-400">
                    No courses found.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course, idx) => (
                  <tr key={course._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {course.courseCode}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">
                      {course.courseTitle}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        course.isSessional
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {course.isSessional ? 'Sessional' : 'Theory'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {course.credit || 3.0}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {course.semesterLevel || course.semester || 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
