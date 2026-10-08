import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { GraduationCap, Search, RefreshCw, Mail, Phone, Shield } from 'lucide-react';

export default function HeadTeachersPage() {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');

  const deptCode = user?.departmentCode || user?.department || 'ETE';

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/head/teachers');
      if (res.data?.success) {
        setTeachers(res.data.teachers || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load department faculty');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const filteredTeachers = teachers.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.teacherId?.toLowerCase().includes(search.toLowerCase()) ||
    t.designation?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-1">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Department Faculty • {deptCode}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Department Teachers & Faculty
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Active faculty instructors belonging to {deptCode} department.
          </p>
        </div>

        <button
          onClick={fetchTeachers}
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
          placeholder="Filter faculty by name, designation, teacher ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Teacher ID</th>
                <th className="px-4 py-3">Faculty Name</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Duty Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-slate-400">
                    Loading faculty roster...
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-slate-400">
                    No faculty found.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher, idx) => (
                  <tr key={teacher._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {teacher.teacherId}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">
                      {teacher.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {teacher.designation || 'Lecturer'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {teacher.contactNo || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {teacher.email || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {teacher.dutyStatus || 'ON_DUTY'}
                      </span>
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
