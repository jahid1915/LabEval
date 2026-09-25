import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Pencil, Trash2, Search, X, Loader2,
  Eye, EyeOff, Upload, ChevronLeft, ChevronRight, RefreshCw,
  Filter, Hash
} from 'lucide-react';
import api from '../../api/axios';

const emptyForm = {
  name: '', rollNumber: '', department: '', series: '',
  section: '', contactNo: '', email: '', password: '', status: 'active'
};

const STATUS_OPTIONS = ['active', 'graduated', 'inactive', 'suspended'];

export default function StudentsPage() {
  const navigate = useNavigate();

  // Data state
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  // Server-side filter state
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterSeries, setFilterSeries] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const searchTimeout = useRef(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // ── Fetch students (server-side) ──────────────────────────────────────────
  const fetchStudents = useCallback(async (pageNum = 1, filters = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum,
        limit: 25,
        ...(filters.search && { search: filters.search }),
        ...(filters.department && { department: filters.department }),
        ...(filters.series && { series: filters.series }),
        ...(filters.status && { status: filters.status })
      });
      const res = await api.get(`/admin/students?${params}`);
      setStudents(res.data.students || []);
      setPagination(res.data.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 });
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch filter options (departments + series) ───────────────────────────
  const fetchFilterOptions = useCallback(async () => {
    try {
      const [dRes, srRes] = await Promise.all([
        api.get('/departments'),
        api.get('/academic/series')
      ]);
      setDepartments(dRes.data.departments || dRes.data || []);
      setSeriesList(srRes.data || []);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    fetchFilterOptions();
    fetchStudents(1, {});
  }, [fetchStudents, fetchFilterOptions]);

  // ── Debounced search ──────────────────────────────────────────────────────
  const handleSearchChange = (value) => {
    setSearch(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchStudents(1, { search: value, department: filterDept, series: filterSeries, status: filterStatus });
    }, 400);
  };

  const applyFilters = (overrides = {}) => {
    const filters = {
      search,
      department: filterDept,
      series: filterSeries,
      status: filterStatus,
      ...overrides
    };
    fetchStudents(1, filters);
  };

  const handleFilterChange = (field, value) => {
    const setters = { department: setFilterDept, series: setFilterSeries, status: setFilterStatus };
    setters[field]?.(value);
    applyFilters({ [field]: value });
  };

  const clearFilters = () => {
    setSearch('');
    setFilterDept('');
    setFilterSeries('');
    setFilterStatus('');
    fetchStudents(1, {});
  };

  const goToPage = (p) => {
    fetchStudents(p, { search, department: filterDept, series: filterSeries, status: filterStatus });
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const openAdd = () => { setEditId(null); setForm(emptyForm); setShowPassword(false); setShowModal(true); };
  const openEdit = (s) => {
    setEditId(s._id);
    setForm({
      name: s.name || '', rollNumber: s.rollNumber || '', department: s.department || '',
      series: s.series || '', section: s.section || '', contactNo: s.contactNo || '',
      email: s.email || '', password: '', status: s.status || 'active'
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form };
      if (editId && !data.password) delete data.password;
      if (editId) {
        await api.put(`/admin/students/${editId}`, data);
        toast.success('Student updated');
      } else {
        await api.post('/admin/students', data);
        toast.success('Student registered');
      }
      setShowModal(false);
      fetchStudents(pagination.page, { search, department: filterDept, series: filterSeries, status: filterStatus });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/admin/students/${deleteId}`);
      toast.success('Student removed');
      setDeleteId(null);
      fetchStudents(pagination.page, { search, department: filterDept, series: filterSeries, status: filterStatus });
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const uniqueSeries = [...new Set(seriesList.map(s => s.name || s).filter(Boolean))].sort().reverse();
  const hasActiveFilters = search || filterDept || filterSeries || filterStatus;

  const STATUS_BADGE = {
    active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    graduated: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    inactive: 'bg-slate-100 dark:bg-slate-800 text-slate-500',
    suspended: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Users size={20} className="text-white" />
            </div>
            Students
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {pagination.total > 0 ? `${pagination.total} students total` : 'Manage enrolled students'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/admin/import')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 text-sm font-semibold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
          >
            <Upload size={16} /> Import XLSX
          </button>
          <button onClick={openAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <Plus size={18} /> Add Student
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search name, roll, registration, email…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
        <select value={filterDept} onChange={e => handleFilterChange('department', e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none">
          <option value="">All Depts</option>
          {departments.map(d => <option key={d._id || d.code} value={d.code || d}>{d.code || d}</option>)}
        </select>
        <select value={filterSeries} onChange={e => handleFilterChange('series', e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none">
          <option value="">All Series</option>
          {uniqueSeries.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterStatus} onChange={e => handleFilterChange('status', e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none">
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        {hasActiveFilters && (
          <button onClick={clearFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
            <X size={14} /> Clear
          </button>
        )}
        <button onClick={() => fetchStudents(1, { search, department: filterDept, series: filterSeries, status: filterStatus })}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
      ) : students.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users size={48} className="mx-auto mb-3 opacity-40" />
          <p className="font-semibold">No students found</p>
          {hasActiveFilters && <p className="text-sm mt-1">Try clearing the filters</p>}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Name</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Roll Number</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Department</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Series</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Section</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((s, i) => (
                  <motion.tr key={s._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {s.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-white">{s.name}</span>
                          {s.email && <p className="text-xs text-slate-400">{s.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{s.rollNumber}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{s.department || '—'}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{s.series || '—'}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{s.section || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[s.status] || STATUS_BADGE.active}`}>
                        {s.status || 'active'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-500 transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => setDeleteId(s._id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => goToPage(1)} disabled={pagination.page <= 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              «
            </button>
            <button onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={16} />
            </button>
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let p;
              if (pagination.totalPages <= 5) p = i + 1;
              else if (pagination.page <= 3) p = i + 1;
              else if (pagination.page >= pagination.totalPages - 2) p = pagination.totalPages - 4 + i;
              else p = pagination.page - 2 + i;
              return (
                <button key={p} onClick={() => goToPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                    p === pagination.page
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => goToPage(pagination.totalPages)} disabled={pagination.page >= pagination.totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              »
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                <h2 className="font-heading font-bold text-lg text-slate-800 dark:text-white">{editId ? 'Edit Student' : 'Register Student'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X size={18} /></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Full Name *</label>
                    <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Roll Number *</label>
                    <input required value={form.rollNumber} onChange={e => setForm({ ...form, rollNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Department</label>
                    <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                      <option value="">Select</option>
                      {departments.map(d => <option key={d._id || d.code} value={d.code || d}>{d.code || d} — {d.name || ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Series</label>
                    <input value={form.series} onChange={e => setForm({ ...form, series: e.target.value })} placeholder="e.g. 22"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Section</label>
                    <input value={form.section} onChange={e => setForm({ ...form, section: e.target.value.toUpperCase() })} placeholder="e.g. A"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Contact</label>
                    <input value={form.contactNo} onChange={e => setForm({ ...form, contactNo: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Email</label>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Password {editId ? '(blank = keep current)' : '*'}</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} required={!editId} value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-all flex items-center gap-2">
                    {saving && <Loader2 size={16} className="animate-spin" />} {editId ? 'Update' : 'Register'}
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 text-center">
              <Trash2 size={40} className="mx-auto text-rose-500 mb-3" />
              <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">Remove Student?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">This action cannot be undone.</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setDeleteId(null)}
                  className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <button onClick={handleDelete}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all">Remove</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
