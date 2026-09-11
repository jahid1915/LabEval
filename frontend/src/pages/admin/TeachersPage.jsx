import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Plus, Pencil, Trash2, Search, X, Loader2,
  Building2, Phone, Mail, Shield, Eye, EyeOff, Upload, Download,
  FileSpreadsheet, CheckCircle2, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api/axios';

const emptyForm = { name: '', teacherId: '', contactNo: '', department: '', designation: '', password: '' };

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Bulk Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [importFile, setImportFile] = useState(null);
  const fileInputRef = useRef(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, dRes] = await Promise.all([
        api.get('/admin/teachers'),
        api.get('/departments')
      ]);
      setTeachers(tRes.data.teachers || tRes.data || []);
      setDepartments(dRes.data.departments || dRes.data || []);
    } catch { 
      toast.error('Failed to load teachers or departments'); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = teachers.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.teacherId?.toLowerCase().includes(search.toLowerCase()) ||
    t.department?.toLowerCase().includes(search.toLowerCase()) ||
    t.designation?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { 
    setEditId(null); 
    setForm(emptyForm); 
    setShowPassword(false); 
    setShowModal(true); 
  };

  const openEdit = (t) => {
    setEditId(t._id);
    setForm({
      name: t.name || '',
      teacherId: t.teacherId || '',
      contactNo: t.contactNo || '',
      department: t.department || '',
      designation: t.designation || '',
      password: ''
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form };
      if (editId && !data.password) delete data.password;
      if (editId) {
        await api.put(`/admin/teachers/${editId}`, data);
        toast.success('Teacher updated successfully');
      } else {
        await api.post('/admin/teachers', data);
        toast.success('Teacher registered successfully');
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
      await api.delete(`/admin/teachers/${deleteId}`);
      toast.success('Teacher removed');
      setDeleteId(null);
      fetchAll();
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Delete failed'); 
    }
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Teacher ID': 'T-101',
        'Full Name': 'Dr. Test Teacher',
        'Department': 'CSE',
        'Designation': 'Professor',
        'Email': 'teacher1@ruet.ac.bd',
        'Contact No': '01700000000',
        'Password': 'password123'
      },
      {
        'Teacher ID': 'T-102',
        'Full Name': 'Md. Al-Mamun',
        'Department': 'ETE',
        'Designation': 'Assistant Professor',
        'Email': 'mamun@ruet.ac.bd',
        'Contact No': '01711111111',
        'Password': 'password123'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Teachers');
    XLSX.writeFile(workbook, 'Teachers_Import_Template.xlsx');
    toast.info('Template downloaded. Fill and upload it.');
  };

  // Parse Uploaded File
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson = XLSX.utils.sheet_to_json(ws);

        if (!rawJson || rawJson.length === 0) {
          toast.warning('The file appears to be empty.');
          setParsedRows([]);
          return;
        }

        // Map column variations to canonical fields
        const mapped = rawJson.map((row) => ({
          teacherId: String(row['Teacher ID'] || row['teacherId'] || row['ID'] || row['Id'] || '').trim().toUpperCase(),
          name: String(row['Full Name'] || row['Name'] || row['name'] || '').trim(),
          department: String(row['Department'] || row['Dept'] || row['department'] || '').trim().toUpperCase(),
          designation: String(row['Designation'] || row['designation'] || 'Lecturer').trim(),
          email: String(row['Email'] || row['email'] || '').trim().toLowerCase(),
          contactNo: String(row['Contact No'] || row['Phone'] || row['contactNo'] || '').trim(),
          password: String(row['Password'] || row['password'] || 'password123').trim()
        })).filter(r => r.teacherId && r.name);

        setParsedRows(mapped);
        toast.success(`Parsed ${mapped.length} teacher record(s)`);
      } catch (err) {
        toast.error(`Error reading file: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Submit Bulk Import
  const handleCommitImport = async () => {
    if (parsedRows.length === 0) {
      return toast.warning('No valid rows to import.');
    }
    setImporting(true);
    try {
      const res = await api.post('/admin/import/teachers', { teachers: parsedRows });
      toast.success(res.data.message || `Successfully imported ${parsedRows.length} teachers`);
      setShowImportModal(false);
      setParsedRows([]);
      setImportFile(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const designationColors = {
    'Professor': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300',
    'Associate Professor': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300',
    'Assistant Professor': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300',
    'Lecturer': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <GraduationCap size={20} className="text-white" />
            </div>
            Teachers
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage faculty directory, bulk import & credentials</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setParsedRows([]); setImportFile(null); setShowImportModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all"
          >
            <Upload size={17} className="text-indigo-500" /> Import (CSV / Excel)
          </button>
          <button 
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <Plus size={18} /> Add Teacher
          </button>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search by name, ID, or department..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" 
          />
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">
          {filtered.length} teacher{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Teachers Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <GraduationCap size={48} className="mx-auto mb-3 opacity-40 text-indigo-400" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">No teachers found</p>
          <p className="text-xs text-slate-400 mt-1">Add a teacher or import via Excel/CSV to populate the directory.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-400">Teacher</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-400">Teacher ID</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-400">Department</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-400">Designation</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-400">Contact / Email</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((t, i) => (
                  <motion.tr key={t._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm shadow-indigo-500/20">
                          {t.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-white">{t.name}</div>
                          <div className="text-xs text-slate-400">{t.email || 'No email provided'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{t.teacherId}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300">
                        {t.department || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {t.designation ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${designationColors[t.designation] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200'}`}>
                          {t.designation}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5"><Phone size={13} className="text-slate-400" /> {t.contactNo || '—'}</div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(t)} title="Edit" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => setDeleteId(t._id)} title="Delete" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Add / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="font-heading font-bold text-lg text-slate-800 dark:text-white">{editId ? 'Edit Teacher' : 'Register Teacher'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X size={18} /></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Full Name *</label>
                    <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dr. Jane Smith"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Teacher ID *</label>
                    <input required value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })} placeholder="e.g. T-102"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Department *</label>
                    <select required value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="">Select Department</option>
                      {departments.map(d => (
                        <option key={d._id} value={d.code || d.name}>
                          {d.code ? `${d.code} - ${d.name}` : d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Designation</label>
                    <select value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="">Select Designation</option>
                      <option>Professor</option>
                      <option>Associate Professor</option>
                      <option>Assistant Professor</option>
                      <option>Lecturer</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Contact No.</label>
                  <input value={form.contactNo} onChange={e => setForm({ ...form, contactNo: e.target.value })} placeholder="+8801..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Password {editId ? '(leave blank to keep current)' : '*'}
                  </label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} required={!editId} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                      className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl disabled:opacity-50 transition-all flex items-center gap-2">
                    {saving && <Loader2 size={16} className="animate-spin" />} {editId ? 'Update' : 'Register'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <FileSpreadsheet size={22} />
                  </div>
                  <div>
                    <h2 className="font-heading font-bold text-lg text-slate-800 dark:text-white">Import Teachers from Excel / CSV</h2>
                    <p className="text-xs text-slate-400">Bulk create or update faculty members in seconds</p>
                  </div>
                </div>
                <button onClick={() => setShowImportModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Step 1: Download Template */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Step 1: Get the format</div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">Download Sample Excel Template</div>
                    <p className="text-xs text-slate-400 mt-0.5">Includes columns: Teacher ID, Full Name, Department, Designation, Email, Contact No</p>
                  </div>
                  <button 
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-600 transition-all shadow-sm"
                  >
                    <Download size={15} /> Download Template
                  </button>
                </div>

                {/* Step 2: Upload File */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Step 2: Upload your file</div>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-indigo-50/20 dark:bg-indigo-950/10"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept=".xlsx, .xls, .csv" 
                      className="hidden" 
                    />
                    <Upload size={32} className="mx-auto text-indigo-500 mb-2" />
                    <div className="text-sm font-bold text-slate-800 dark:text-white">
                      {importFile ? importFile.name : 'Click or Drag & Drop Excel (.xlsx, .xls) or CSV'}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Automatic mapping for Teacher ID, Name, Department & Designation</p>
                  </div>
                </div>

                {/* Step 3: Preview */}
                {parsedRows.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 size={15} /> Ready to import: {parsedRows.length} teachers
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-400 font-bold">ID</th>
                            <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-400 font-bold">Name</th>
                            <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-400 font-bold">Dept</th>
                            <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-400 font-bold">Designation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {parsedRows.slice(0, 10).map((row, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-1.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{row.teacherId}</td>
                              <td className="px-3 py-1.5 font-semibold text-slate-800 dark:text-white">{row.name}</td>
                              <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">{row.department}</td>
                              <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400">{row.designation}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {parsedRows.length > 10 && (
                        <div className="px-3 py-2 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                          + {parsedRows.length - 10} more rows
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <button 
                  type="button" 
                  onClick={() => setShowImportModal(false)} 
                  className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCommitImport} 
                  disabled={parsedRows.length === 0 || importing}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {importing && <Loader2 size={16} className="animate-spin" />}
                  {importing ? 'Importing...' : `Import ${parsedRows.length} Teachers`}
                </button>
              </div>

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
              <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">Remove Teacher?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">This will also remove all their course assignments.</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setDeleteId(null)} className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <button onClick={handleDelete} className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all">Remove</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
