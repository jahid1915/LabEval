import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, Plus, Pencil, Trash2, Search, X, Loader2,
  BookOpen, Users, Calendar, GraduationCap, CheckCircle
} from 'lucide-react';
import API from '../../utils/api';

const emptyForm = { course: '', teacher: '', session: '', semester: '', series: '', section: '', isActive: true };

export default function CourseOfferingsPage() {
  const [offerings, setOfferings] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, cRes, tRes, sRes, srRes] = await Promise.all([
        API.get('/courses/offerings'),
        API.get('/courses/catalog'),
        API.get('/admin/teachers'),
        API.get('/academic/sessions'),
        API.get('/admin/series')
      ]);
      setOfferings(oRes.data.offerings || oRes.data || []);
      setCourses(cRes.data.courses || cRes.data || []);
      setTeachers(tRes.data.teachers || tRes.data || []);
      setSessions(sRes.data.sessions || sRes.data || []);
      setSeriesList(srRes.data.series || srRes.data || []);
    } catch { toast.error('Failed to load offerings'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getCourseName = (o) => {
    if (o.course?.courseTitle) return `${o.course.courseCode} — ${o.course.courseTitle}`;
    const c = courses.find(c => c._id === o.course);
    return c ? `${c.courseCode} — ${c.courseTitle}` : o.course || '—';
  };

  const getTeacherName = (o) => {
    if (o.teacher?.name) return o.teacher.name;
    const t = teachers.find(t => t._id === o.teacher);
    return t?.name || '—';
  };

  const getSessionName = (o) => {
    if (o.session?.name) return o.session.name;
    const s = sessions.find(s => s._id === o.session);
    return s?.name || '—';
  };

  const filtered = offerings.filter(o =>
    !search || getCourseName(o).toLowerCase().includes(search.toLowerCase()) ||
    getTeacherName(o).toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditId(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (o) => {
    setEditId(o._id);
    setForm({
      course: o.course?._id || o.course || '',
      teacher: o.teacher?._id || o.teacher || '',
      session: o.session?._id || o.session || '',
      semester: o.semester || '',
      series: o.series || '',
      section: o.section || '',
      isActive: o.isActive !== false
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await API.put(`/courses/offerings/${editId}`, form);
        toast.success('Offering updated');
      } else {
        await API.post('/courses/offerings', form);
        toast.success('Offering created');
      }
      setShowModal(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`/courses/offerings/${deleteId}`);
      toast.success('Offering deleted');
      setDeleteId(null);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
              <Layers size={20} className="text-white" />
            </div>
            Course Offerings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Assign courses to teachers, sessions & series</p>
        </div>
        <button onClick={openAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <Plus size={18} /> Create Offering
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search course or teacher..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-sky-500" size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><Layers size={48} className="mx-auto mb-3 opacity-40" /><p className="font-semibold">No offerings found</p></div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Course</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Teacher</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Session</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Series</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((o, i) => (
                  <motion.tr key={o._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-white">{getCourseName(o)}</p>
                        {o.semester && <p className="text-xs text-slate-400">Semester: {o.semester}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {getTeacherName(o).charAt(0)}
                        </div>
                        <span className="text-slate-700 dark:text-slate-300">{getTeacherName(o)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{getSessionName(o)}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{o.series || '—'} {o.section ? `(${o.section})` : ''}</td>
                    <td className="px-5 py-3">
                      {o.isActive !== false ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 w-fit"><CheckCircle size={12} /> Active</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold">Inactive</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(o)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-sky-500 transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => setDeleteId(o._id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                <h2 className="font-heading font-bold text-lg text-slate-800 dark:text-white">{editId ? 'Edit Offering' : 'New Offering'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X size={18} /></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Course *</label>
                  <select required value={form.course} onChange={e => setForm({ ...form, course: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none">
                    <option value="">Select Course</option>
                    {courses.map(c => <option key={c._id} value={c._id}>{c.courseCode} — {c.courseTitle}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Teacher *</label>
                  <select required value={form.teacher} onChange={e => setForm({ ...form, teacher: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none">
                    <option value="">Select Teacher</option>
                    {teachers.map(t => <option key={t._id} value={t._id}>{t.name} ({t.teacherId})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Session</label>
                    <select value={form.session} onChange={e => setForm({ ...form, session: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none">
                      <option value="">Select</option>
                      {sessions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Semester</label>
                    <input value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} placeholder="e.g. 5th"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Series</label>
                    <input value={form.series} onChange={e => setForm({ ...form, series: e.target.value })} placeholder="e.g. 21"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Section</label>
                    <input value={form.section} onChange={e => setForm({ ...form, section: e.target.value.toUpperCase() })} placeholder="A"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none uppercase" />
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Active Offering</span>
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 disabled:opacity-50 transition-all flex items-center gap-2">
                    {saving && <Loader2 size={16} className="animate-spin" />} {editId ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 text-center">
              <Trash2 size={40} className="mx-auto text-rose-500 mb-3" />
              <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">Delete Offering?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Associated data will be preserved.</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setDeleteId(null)} className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <button onClick={handleDelete} className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
