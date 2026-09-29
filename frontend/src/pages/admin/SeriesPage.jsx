import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Pencil, Trash2, Search, X, Loader2,
  Building2, Hash, ArrowUpRight, ExternalLink, Mail,
  Phone, CheckCircle2, Sparkles, GraduationCap
} from 'lucide-react';
import api from '../../api/axios';

const emptyForm = { name: '', department: '', year: '', section: '' };

export default function SeriesPage() {
  const navigate = useNavigate();
  const [series, setSeries] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Series Students Modal State
  const [selectedSeriesForStudents, setSelectedSeriesForStudents] = useState(null);
  const [seriesStudentsModal, setSeriesStudentsModal] = useState(false);
  const [seriesStudents, setSeriesStudents] = useState([]);
  const [seriesStudentsLoading, setSeriesStudentsLoading] = useState(false);
  const [seriesStudentsSearch, setSeriesStudentsSearch] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, dRes] = await Promise.all([
        api.get('/academic/series'),
        api.get('/departments')
      ]);
      setSeries(Array.isArray(sRes.data) ? sRes.data : (sRes.data?.series || []));
      setDepartments(Array.isArray(dRes.data) ? dRes.data : (dRes.data?.departments || []));
    } catch {
      toast.error('Failed to load series');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const safeSeries = Array.isArray(series) ? series : [];
  const filtered = safeSeries.filter(s => {
    if (!s) return false;
    const name = (s.name || '').toLowerCase();
    const section = (s.section || '').toLowerCase();
    const q = search.toLowerCase();
    return !search || name.includes(q) || section.includes(q);
  });

  const openAdd = () => { setEditId(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (s) => {
    setEditId(s._id);
    setForm({
      name: s.name || '',
      department: s.department?._id || s.department || '',
      year: s.year || '',
      section: s.section || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/academic/series/${editId}`, form);
        toast.success('Series updated');
      } else {
        await api.post('/academic/series', form);
        toast.success('Series created');
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/academic/series/${deleteId}`);
      toast.success('Series deleted');
      setDeleteId(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const getDeptName = (s) => {
    if (s.department?.name) return s.department.name;
    const d = departments.find(d => d._id === (s.department?._id || s.department));
    return d?.name || (typeof s.department === 'string' ? s.department : '—');
  };

  // Open Series Students Roster Table
  const handleOpenSeriesStudents = async (s) => {
    setSelectedSeriesForStudents(s);
    setSeriesStudentsModal(true);
    setSeriesStudentsLoading(true);
    setSeriesStudentsSearch('');

    try {
      const cleanSeries = s.name.replace(/[^0-9]/g, '') || s.name;
      const res = await api.get('/admin/students', {
        params: { series: cleanSeries, limit: 200 }
      });
      setSeriesStudents(Array.isArray(res.data?.students) ? res.data.students : (Array.isArray(res.data) ? res.data : []));
    } catch {
      toast.error('Failed to load students for this series');
      setSeriesStudents([]);
    } finally {
      setSeriesStudentsLoading(false);
    }
  };

  // Filter students inside modal
  const filteredSeriesStudents = useMemo(() => {
    const list = Array.isArray(seriesStudents) ? seriesStudents : [];
    if (!seriesStudentsSearch.trim()) return list;
    const q = seriesStudentsSearch.toLowerCase();
    return list.filter(stu =>
      stu.name?.toLowerCase().includes(q) ||
      stu.rollNumber?.toLowerCase().includes(q) ||
      stu.email?.toLowerCase().includes(q) ||
      stu.registrationNumber?.toLowerCase().includes(q) ||
      stu.contactNo?.toLowerCase().includes(q)
    );
  }, [seriesStudents, seriesStudentsSearch]);

  const cleanSelectedSeries = selectedSeriesForStudents
    ? (selectedSeriesForStudents.name.replace(/[^0-9]/g, '') || selectedSeriesForStudents.name)
    : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Users size={20} className="text-white" />
            </div>
            Series / Batches
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Click on any series card to inspect its full student roster in a tabular format
          </p>
        </div>
        <button onClick={openAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <Plus size={18} /> Add Series
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search series..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all" />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-cyan-500" size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <Users size={48} className="mx-auto mb-3 opacity-40" />
          <p className="font-semibold">No series found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((s, i) => (
            <motion.div
              key={s._id}
              onClick={() => handleOpenSeriesStudents(s)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 hover:shadow-xl hover:border-cyan-300 dark:hover:border-cyan-700 transition-all cursor-pointer relative hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-lg group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {s.name}
                  </h3>
                  {s.section && (
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold">
                      Section {s.section}
                    </span>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-cyan-500 transition-colors"
                    title="Edit Series"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteId(s._id); }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Delete Series"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4">
                <div className="flex items-center gap-2"><Building2 size={13} className="text-slate-400" /> {getDeptName(s)}</div>
                {s.year && <div className="flex items-center gap-2"><Hash size={13} className="text-slate-400" /> Year: {s.year}</div>}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                <span className="flex items-center gap-1.5">
                  <Users size={13} /> View Student Table
                </span>
                <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Modal: Series Students Tabular View ──────────────────────── */}
      <AnimatePresence>
        {seriesStudentsModal && selectedSeriesForStudents && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                    <GraduationCap size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-heading font-black text-slate-900 dark:text-white">
                        {selectedSeriesForStudents.name} — Student Roster
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                        {filteredSeriesStudents.length} Students
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-3">
                      <span>Department: <strong>{getDeptName(selectedSeriesForStudents)}</strong></span>
                      {selectedSeriesForStudents.year && <span>Year: <strong>{selectedSeriesForStudents.year}</strong></span>}
                      {selectedSeriesForStudents.section && <span>Section: <strong>{selectedSeriesForStudents.section}</strong></span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSeriesStudentsModal(false);
                      navigate(`/admin/students?series=${cleanSelectedSeries}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 transition-colors"
                  >
                    <span>Manage in Students</span>
                    <ExternalLink size={13} />
                  </button>
                  <button
                    onClick={() => setSeriesStudentsModal(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Search Bar */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={seriesStudentsSearch}
                    onChange={(e) => setSeriesStudentsSearch(e.target.value)}
                    placeholder="Search by Roll Number, Name, Email or Registration..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Modal Table Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {seriesStudentsLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <Loader2 size={36} className="animate-spin text-cyan-500" />
                    <p className="text-sm font-medium text-slate-500">Loading series student roster...</p>
                  </div>
                ) : filteredSeriesStudents.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">
                    <Users size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-base text-slate-700 dark:text-slate-300">No students found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {seriesStudentsSearch
                        ? 'Try modifying your search query'
                        : `No student records are currently enrolled in Series ${selectedSeriesForStudents.name}.`}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3.5 w-12 text-center">#</th>
                          <th className="px-4 py-3.5">Roll Number</th>
                          <th className="px-4 py-3.5">Student Name</th>
                          <th className="px-4 py-3.5">Email</th>
                          <th className="px-4 py-3.5">Phone</th>
                          <th className="px-4 py-3.5">Reg. No</th>
                          <th className="px-4 py-3.5">Semester</th>
                          <th className="px-4 py-3.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {filteredSeriesStudents.map((stu, idx) => (
                          <tr key={stu._id} className="hover:bg-cyan-50/30 dark:hover:bg-cyan-950/20 transition-colors">
                            <td className="px-4 py-3 text-center text-xs text-slate-400 font-mono">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                              {stu.rollNumber}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                  {stu.name?.charAt(0) || 'S'}
                                </div>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {stu.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                              {stu.email || '—'}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                              {stu.contactNo || '—'}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-slate-500 dark:text-slate-400">
                              {stu.registrationNumber || '—'}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                              {stu.semester || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                                stu.status === 'active'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${stu.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                {stu.status || 'active'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-500">
                <span>Showing {filteredSeriesStudents.length} of {seriesStudents.length} students</span>
                <button
                  onClick={() => setSeriesStudentsModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit / Create Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="font-heading font-bold text-lg text-slate-800 dark:text-white">{editId ? 'Edit Series' : 'New Series'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X size={18} /></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Series Name *</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. 21 Series"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Department *</label>
                  <select required value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none">
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Year</label>
                    <input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} placeholder="e.g. 2021" type="number"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Section</label>
                    <input value={form.section} onChange={e => setForm({ ...form, section: e.target.value.toUpperCase() })} placeholder="e.g. A"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none uppercase" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-sm font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl disabled:opacity-50 transition-all flex items-center gap-2">
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
              <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">Delete Series?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">This action cannot be undone.</p>
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
