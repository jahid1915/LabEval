import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { Building, Plus, Edit, Trash2, Users, GraduationCap, Calendar, Search, Loader2, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FacultiesPage() {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', deanName: '', description: '' });

  const fetchFaculties = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/faculties');
      setFaculties(data);
    } catch {
      toast.error('Failed to load faculties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculties();
  }, []);

  const handleOpenModal = (faculty = null) => {
    if (faculty) {
      setEditingFaculty(faculty);
      setForm({
        name: faculty.name,
        code: faculty.code,
        deanName: faculty.deanName || '',
        description: faculty.description || ''
      });
    } else {
      setEditingFaculty(null);
      setForm({ name: '', code: '', deanName: '', description: '' });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.code) return toast.error('Name and Code are required');

    setSaving(true);
    try {
      if (editingFaculty) {
        await api.put(`/faculties/${editingFaculty._id}`, form);
        toast.success('Faculty updated successfully');
      } else {
        await api.post('/faculties', form);
        toast.success('Faculty created successfully');
      }
      setShowModal(false);
      fetchFaculties();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save faculty');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Archive/Delete faculty "${name}"?`)) return;
    try {
      const { data } = await api.delete(`/faculties/${id}`);
      toast.success(data.message || 'Faculty archived');
      fetchFaculties();
    } catch {
      toast.error('Failed to delete faculty');
    }
  };

  const filtered = faculties.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.code.toLowerCase().includes(search.toLowerCase()) ||
    (f.deanName && f.deanName.toLowerCase().includes(search.toLowerCase()))
  );

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <Building className="w-8 h-8 text-primary" /> Faculty Governance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage university faculties, dean offices, and affiliated departments.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-focus text-white rounded-xl font-bold text-sm shadow-md shadow-primary/25 transition-all"
        >
          <Plus className="w-4 h-4" /> Add New Faculty
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by faculty name, code, or dean..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" /> Loading faculties...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-400">
          No faculties found. Create one to get started!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((faculty) => (
            <motion.div
              key={faculty._id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-extrabold uppercase bg-primary/10 text-primary">
                      {faculty.code}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-2 leading-tight">
                      {faculty.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenModal(faculty)}
                      className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(faculty._id, faculty.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {faculty.deanName && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Dean: <strong className="text-slate-700 dark:text-slate-200">{faculty.deanName}</strong></span>
                  </p>
                )}

                {faculty.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                    {faculty.description}
                  </p>
                )}
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">Depts</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{faculty.stats?.departmentCount || 0}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">Teachers</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{faculty.stats?.teacherCount || 0}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">Students</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{faculty.stats?.studentCount || 0}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 w-full max-w-md z-10">
              <h2 className="text-xl font-heading font-bold text-slate-800 dark:text-white mb-4">
                {editingFaculty ? 'Edit Faculty' : 'Create New Faculty'}
              </h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Faculty Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Faculty of Electrical & Computer Engineering" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Faculty Code *</label>
                  <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. ECE_FACULTY" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Dean Name</label>
                  <input value={form.deanName} onChange={e => setForm({ ...form, deanName: e.target.value })} placeholder="e.g. Prof. Dr. M. Nazrul Islam" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Faculty overview and scope..." className={inputClass} />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-6 py-2 bg-primary hover:bg-primary-focus text-white font-bold text-sm rounded-xl shadow-md shadow-primary/20 disabled:opacity-50">
                    {saving ? 'Saving...' : editingFaculty ? 'Save Changes' : 'Create Faculty'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
