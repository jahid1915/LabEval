import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Plus, Pencil, Trash2, Search, X, Loader2,
  Building2, Phone, Mail, Shield, Eye, EyeOff, Upload, Download,
  FileSpreadsheet, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
  ArrowRight, Users, BookOpen, Layers, RefreshCw, Power, Award
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api/axios';

const emptyForm = {
  name: '',
  teacherId: '',
  contactNo: '',
  department: '',
  designation: 'Lecturer',
  email: '',
  specialization: '',
  password: '',
  dutyStatus: 'ON_DUTY'
};

const DESIGNATION_OPTIONS = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Lecturer'
];

export default function TeachersPage() {
  // Navigation Hierarchy: null = Level 1 (All Departments), string (e.g. 'EEE' or 'ALL') = Level 2 (Directory)
  const [selectedDept, setSelectedDept] = useState(null);

  // Level 1 Data (Department Summaries)
  const [summaryData, setSummaryData] = useState({ departments: [], totals: { total: 0, active: 0, inactive: 0, incomplete: 0 } });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [deptSearch, setDeptSearch] = useState('');

  // Level 2 Data (Teachers in selected department)
  const [teachers, setTeachers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [designationFilter, setDesignationFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Departments list for dropdowns
  const [departmentsList, setDepartmentsList] = useState([]);

  // Modals & Drawers
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Level 3 Profile Drawer
  const [viewTeacherId, setViewTeacherId] = useState(null);
  const [teacherDetails, setTeacherDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Bulk Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [importFile, setImportFile] = useState(null);
  const fileInputRef = useRef(null);

  // ── Fetch Level 1 Department Summary ───────────────────────────────────────────
  const fetchDepartmentSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get('/admin/teachers/department-summary');
      if (res.data?.success) {
        setSummaryData({
          departments: res.data.departments || [],
          totals: res.data.totals || { total: 0, active: 0, inactive: 0, incomplete: 0 }
        });
      }
    } catch (err) {
      console.error('Failed to load teacher summary:', err);
      toast.error('Could not load department teacher statistics');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Fetch departments dropdown list
  const fetchDepartmentsList = useCallback(async () => {
    try {
      const res = await api.get('/departments');
      const list = res.data?.departments || res.data || [];
      setDepartmentsList(list);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchDepartmentSummary();
    fetchDepartmentsList();
  }, [fetchDepartmentSummary, fetchDepartmentsList]);

  // ── Fetch Level 2 Teachers for Selected Department ────────────────────────────
  const fetchTeachers = useCallback(async () => {
    if (!selectedDept) return;
    setTeachersLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDept !== 'ALL') {
        params.append('department', selectedDept);
      }
      params.append('page', currentPage);
      params.append('limit', pageSize);
      if (teacherSearch.trim()) params.append('search', teacherSearch.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (designationFilter !== 'ALL') params.append('designation', designationFilter);

      const res = await api.get(`/admin/teachers?${params.toString()}`);
      if (res.data?.success || Array.isArray(res.data?.teachers)) {
        setTeachers(res.data.teachers || []);
        setPagination(res.data.pagination || { page: currentPage, limit: pageSize, total: res.data.teachers?.length || 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to load teachers:', err);
      toast.error('Could not load faculty directory');
    } finally {
      setTeachersLoading(false);
    }
  }, [selectedDept, currentPage, pageSize, teacherSearch, statusFilter, designationFilter]);

  useEffect(() => {
    if (selectedDept) {
      fetchTeachers();
    }
  }, [selectedDept, fetchTeachers]);

  // Handle Search Debounce for Teachers
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedDept) {
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [teacherSearch, selectedDept]);

  // ── Level 3: Fetch Teacher Details ─────────────────────────────────────────────
  const openTeacherDetails = async (teacherId) => {
    setViewTeacherId(teacherId);
    setDetailsLoading(true);
    try {
      const res = await api.get(`/admin/teachers/${teacherId}`);
      if (res.data?.success) {
        setTeacherDetails(res.data.teacher);
      }
    } catch (err) {
      toast.error('Failed to load teacher profile details');
      setViewTeacherId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  // ── CRUD Operations ────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditId(null);
    setForm({
      ...emptyForm,
      department: selectedDept && selectedDept !== 'ALL' ? selectedDept : (departmentsList[0]?.code || 'ETE')
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditId(t._id);
    setForm({
      name: t.name || '',
      teacherId: t.teacherId || '',
      contactNo: t.contactNo || '',
      department: t.department || (selectedDept !== 'ALL' ? selectedDept : 'ETE'),
      designation: t.designation || 'Lecturer',
      email: t.email || '',
      specialization: t.specialization || '',
      password: '',
      dutyStatus: t.dutyStatus || 'ON_DUTY'
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.teacherId.trim() || (!editId && !form.password)) {
      return toast.warning('Name, Teacher ID, and Password are required');
    }

    setSaving(true);
    try {
      const payload = { ...form };
      if (editId && !payload.password) delete payload.password;

      if (editId) {
        await api.put(`/admin/teachers/${editId}`, payload);
        toast.success('Teacher record updated successfully');
      } else {
        await api.post('/admin/teachers', payload);
        toast.success(`Teacher ${form.name} registered successfully`);
      }
      setShowModal(false);
      fetchTeachers();
      fetchDepartmentSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Status Toggle (Active / Archived)
  const handleToggleStatus = async (teacher) => {
    try {
      const res = await api.post(`/admin/teachers/${teacher._id}/toggle-status`);
      if (res.data?.success) {
        toast.success(`Teacher status set to ${res.data.teacher.status}`);
        fetchTeachers();
        fetchDepartmentSummary();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Delete Teacher (with dependency check)
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/admin/teachers/${deleteTarget._id}`);
      toast.success(res.data?.message || 'Teacher removed');
      setDeleteTarget(null);
      fetchTeachers();
      fetchDepartmentSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete teacher');
    } finally {
      setDeleting(false);
    }
  };

  // ── Export to Excel ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      toast.info('Preparing faculty dataset export...');
      const params = new URLSearchParams();
      if (selectedDept && selectedDept !== 'ALL') {
        params.append('department', selectedDept);
      }
      params.append('limit', 'all');
      if (teacherSearch.trim()) params.append('search', teacherSearch.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (designationFilter !== 'ALL') params.append('designation', designationFilter);

      const res = await api.get(`/admin/teachers?${params.toString()}`);
      const exportList = res.data?.teachers || [];

      if (exportList.length === 0) {
        return toast.warning('No matching teacher records found to export');
      }

      const rows = exportList.map(t => ({
        'Teacher ID': t.teacherId,
        'Name': t.name,
        'Department': t.department,
        'Designation': t.designation || 'Lecturer',
        'Email': t.email || '',
        'Contact No': t.contactNo || '',
        'Duty Status': t.dutyStatus || 'ON_DUTY',
        'Account Status': t.status || 'active',
        'Active Courses Assigned': t.assignedCoursesCount || 0
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      const sheetName = selectedDept && selectedDept !== 'ALL' ? `${selectedDept}_Teachers` : 'All_Teachers';
      XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
      XLSX.writeFile(wb, `RUET_Teachers_${sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`Exported ${exportList.length} teacher record(s)`);
    } catch (err) {
      toast.error('Failed to export teachers');
    }
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Teacher ID': 'EEE-101',
        'Full Name': 'Dr. Test Professor',
        'Department': 'EEE',
        'Designation': 'Professor',
        'Email': 'prof.eee@ruet.ac.bd',
        'Contact No': '01711000001',
        'Password': 'password123'
      },
      {
        'Teacher ID': 'CSE-102',
        'Full Name': 'Md. Lecturer Rahman',
        'Department': 'CSE',
        'Designation': 'Lecturer',
        'Email': 'lecturer.cse@ruet.ac.bd',
        'Contact No': '01711000002',
        'Password': 'password123'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Teachers_Template');
    XLSX.writeFile(workbook, 'RUET_Teacher_Import_Template.xlsx');
    toast.info('Sample import template downloaded');
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
          toast.warning('The file appears to be empty');
          setParsedRows([]);
          return;
        }

        const mapped = rawJson.map((row) => ({
          teacherId: String(row['Teacher ID'] || row['teacherId'] || row['ID'] || row['Id'] || '').trim().toUpperCase(),
          name: String(row['Full Name'] || row['Name'] || row['name'] || '').trim(),
          department: String(row['Department'] || row['Dept'] || row['department'] || (selectedDept && selectedDept !== 'ALL' ? selectedDept : '')).trim().toUpperCase(),
          designation: String(row['Designation'] || row['designation'] || 'Lecturer').trim(),
          email: String(row['Email'] || row['email'] || '').trim().toLowerCase(),
          contactNo: String(row['Contact No'] || row['Phone'] || row['contactNo'] || '').trim(),
          password: String(row['Password'] || row['password'] || 'password123').trim()
        })).filter(r => r.teacherId && r.name);

        setParsedRows(mapped);
        toast.success(`Successfully parsed ${mapped.length} row(s) from ${file.name}`);
      } catch (err) {
        toast.error(`Error reading spreadsheet: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Commit Bulk Import
  const handleCommitImport = async () => {
    if (parsedRows.length === 0) {
      return toast.warning('No valid rows available to import');
    }
    setImporting(true);
    try {
      const res = await api.post('/admin/import/teachers', { teachers: parsedRows });
      toast.success(res.data?.message || `Successfully imported ${parsedRows.length} teachers`);
      setShowImportModal(false);
      setParsedRows([]);
      setImportFile(null);
      fetchDepartmentSummary();
      if (selectedDept) fetchTeachers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import operation failed');
    } finally {
      setImporting(false);
    }
  };

  // Filtered department cards for Level 1
  const filteredDepts = summaryData.departments.filter(d =>
    d.code?.toLowerCase().includes(deptSearch.toLowerCase()) ||
    d.name?.toLowerCase().includes(deptSearch.toLowerCase()) ||
    d.facultyName?.toLowerCase().includes(deptSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-16">
      
      {/* ── TOP BREADCRUMB & HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <button 
              onClick={() => setSelectedDept(null)}
              className="hover:text-blue-600 dark:hover:text-blue-400 font-medium transition"
            >
              Faculty Governance
            </button>
            <span>/</span>
            <span className="font-semibold text-slate-800 dark:text-white">
              {selectedDept ? (selectedDept === 'ALL' ? 'All Departments' : `${selectedDept} Department`) : 'Department Directory'}
            </span>
          </nav>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
              <GraduationCap size={22} />
            </div>
            {selectedDept ? `${selectedDept === 'ALL' ? 'University' : selectedDept} Faculty Directory` : 'Faculty Management System'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {selectedDept 
              ? `Authorized faculty roster and teaching assignments for ${selectedDept} department.`
              : 'Department-first faculty directory across all 18 RUET academic departments.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          {selectedDept && (
            <button
              onClick={() => setSelectedDept(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#243244] bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#172033] transition"
            >
              <ChevronLeft size={14} /> Back to Departments
            </button>
          )}

          <button
            onClick={() => { setParsedRows([]); setImportFile(null); setShowImportModal(true); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#243244] bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#172033] shadow-xs transition"
          >
            <Upload size={14} className="text-indigo-500" /> Import
          </button>

          {selectedDept && (
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#243244] bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#172033] shadow-xs transition"
            >
              <Download size={14} className="text-emerald-500" /> Export Excel
            </button>
          )}

          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold shadow-md shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition"
          >
            <Plus size={15} /> Add Teacher
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          LEVEL 1: ALL DEPARTMENTS CARDS
      ══════════════════════════════════════════════════════════════════════════ */}
      {!selectedDept && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-white/90 dark:bg-[#0f172a]/90 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Total Faculty</span>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center">
                  <Users size={16} />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                {summaryLoading ? '...' : summaryData.totals.total}
              </div>
              <span className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Persisted In Database
              </span>
            </div>

            <div className="bg-white/90 dark:bg-[#0f172a]/90 border border-emerald-200/80 dark:border-emerald-900/40 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Active Teachers</span>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                {summaryLoading ? '...' : summaryData.totals.active}
              </div>
              <span className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> On Active Duty
              </span>
            </div>

            <div className="bg-white/90 dark:bg-[#0f172a]/90 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">On Leave / Archived</span>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center">
                  <AlertCircle size={16} />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                {summaryLoading ? '...' : summaryData.totals.inactive}
              </div>
              <span className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60">
                Study / Deputation / Inactive
              </span>
            </div>

            <div className="bg-white/90 dark:bg-[#0f172a]/90 border border-purple-200/80 dark:border-purple-900/40 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Academic Depts</span>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center">
                  <Building2 size={16} />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                {summaryLoading ? '...' : summaryData.departments.length}
              </div>
              <span className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60">
                18 Distinct Depts
              </span>
            </div>
          </div>

          {/* Department Filter & Universal Access */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] p-3.5 rounded-2xl shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={deptSearch}
                onChange={e => setDeptSearch(e.target.value)}
                placeholder="Search department by code or name..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#243244] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#172033] transition"
              >
                <FileSpreadsheet size={13} className="text-emerald-500" /> Download Sample
              </button>
              <button
                onClick={() => { setSelectedDept('ALL'); setCurrentPage(1); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-[#28384f] transition"
              >
                View Universal Directory ({summaryData.totals.total}) <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Department Cards Grid */}
          {summaryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 rounded-2xl border border-slate-200 dark:border-[#243244] bg-white dark:bg-[#111827] animate-pulse p-5" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDepts.map((d) => (
                <div
                  key={d._id}
                  onClick={() => { setSelectedDept(d.code); setCurrentPage(1); }}
                  className="group relative cursor-pointer bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-[#243244] hover:border-blue-400 dark:hover:border-blue-600 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-xs overflow-hidden flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                          {d.code}
                        </span>
                        {d.facultyName && (
                          <span className="text-[11px] font-medium text-slate-400 truncate max-w-[150px]">
                            {d.facultyName}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                        {d.name}
                      </h3>
                    </div>

                    <div className="text-right">
                      <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                        {d.totalTeachers}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Teachers</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-[#1e293b] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {d.activeTeachers} Active
                      </span>
                      {d.inactiveTeachers > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          &bull; {d.inactiveTeachers} On Leave
                        </span>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                      Explore Roster <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          LEVEL 2: DEPARTMENT TEACHER DIRECTORY
      ══════════════════════════════════════════════════════════════════════════ */}
      {selectedDept && (
        <div className="space-y-4">
          
          {/* Department Banner & Controls */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-2xl p-4.5 shadow-xs space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs font-extrabold rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                    {selectedDept}
                  </span>
                  {selectedDept === 'ALL' ? 'Complete University Faculty' : `${selectedDept} Department Directory`}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Showing actual persisted faculty records. Use live search & filters across all records.
                </p>
              </div>

              {/* Total count badge */}
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-[#1e293b] text-slate-700 dark:text-slate-300">
                  Total Records: <strong className="text-slate-900 dark:text-white font-mono">{pagination.total}</strong>
                </span>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 dark:border-[#1e293b]">
              
              {/* Search input */}
              <div className="relative lg:col-span-2">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={teacherSearch}
                  onChange={e => setTeacherSearch(e.target.value)}
                  placeholder="Search by name, teacher ID, email, designation..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="active">Active On Duty</option>
                  <option value="archived">Archived / On Leave</option>
                </select>
              </div>

              {/* Designation Filter */}
              <div>
                <select
                  value={designationFilter}
                  onChange={e => { setDesignationFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Designations</option>
                  {DESIGNATION_OPTIONS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Page Size Selector */}
              <div>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                >
                  <option value={25}>Show 25 / page</option>
                  <option value={50}>Show 50 / page</option>
                  <option value={100}>Show 100 / page</option>
                  <option value={200}>Show 200 / page</option>
                </select>
              </div>

            </div>
          </div>

          {/* Teacher Table */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50/80 dark:bg-[#172033]/80 border-b border-slate-200 dark:border-[#243244] uppercase tracking-wider text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Teacher ID</th>
                    <th className="py-3 px-4">Faculty Name</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigned Courses</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1e293b]">
                  {teachersLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={8} className="py-3.5 px-4">
                          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                        </td>
                      </tr>
                    ))
                  ) : teachers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <GraduationCap size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-semibold">No teachers found matching criteria</p>
                        <p className="text-xs text-slate-400 mt-1">Try resetting the search or filter</p>
                      </td>
                    </tr>
                  ) : (
                    teachers.map((t) => (
                      <tr 
                        key={t._id}
                        className="hover:bg-slate-50/60 dark:hover:bg-[#172033]/50 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {t.teacherId}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {t.name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-[#1e293b] text-slate-700 dark:text-slate-300">
                            {t.designation || 'Lecturer'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">
                          {t.department}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-[11px]">
                            {t.email ? (
                              <div className="text-slate-600 dark:text-slate-300 truncate max-w-[180px]">{t.email}</div>
                            ) : (
                              <span className="text-slate-400 italic">No email</span>
                            )}
                            {t.contactNo && t.contactNo !== 'N/A' && (
                              <div className="text-slate-400 text-[10px]">{t.contactNo}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            t.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {t.status === 'active' ? 'Active' : 'Archived'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {t.assignedCoursesCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/50">
                              {t.assignedCoursesCount} assigned
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openTeacherDetails(t._id)}
                              title="View full profile"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => openEdit(t)}
                              title="Edit teacher"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(t)}
                              title={t.status === 'active' ? 'Archive/Pause teacher' : 'Activate teacher'}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition"
                            >
                              <Power size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(t)}
                              title="Delete teacher"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 dark:border-[#1e293b] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Showing{' '}
                <strong className="text-slate-800 dark:text-white font-mono">
                  {pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-800 dark:text-white font-mono">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </strong>{' '}
                of <strong className="text-slate-800 dark:text-white font-mono">{pagination.total}</strong> teachers
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || teachersLoading}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#243244] bg-white dark:bg-[#111827] disabled:opacity-40 hover:bg-slate-50 transition"
                >
                  <ChevronLeft size={14} />
                </button>

                <span className="px-3 py-1 font-semibold text-slate-700 dark:text-slate-200">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage >= pagination.totalPages || teachersLoading}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#243244] bg-white dark:bg-[#111827] disabled:opacity-40 hover:bg-slate-50 transition"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          LEVEL 3: TEACHER DETAILS PROFILE DRAWER / MODAL
      ══════════════════════════════════════════════════════════════════════════ */}
      {viewTeacherId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#1e293b] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 font-mono">
                    {teacherDetails?.teacherId || '...'}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">{teacherDetails?.department}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {teacherDetails?.name || 'Faculty Profile'}
                </h3>
                <p className="text-xs text-slate-500">{teacherDetails?.designation || 'Lecturer'}</p>
              </div>

              <button
                onClick={() => { setViewTeacherId(null); setTeacherDetails(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {detailsLoading ? (
              <div className="py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-blue-600" /></div>
            ) : teacherDetails && (
              <div className="space-y-4 text-xs">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#172033]/50 border border-slate-100 dark:border-[#243244]">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Email Address</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{teacherDetails.email || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Contact Number</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{teacherDetails.contactNo || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Account Status</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{teacherDetails.status || 'Active'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Specialization</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{teacherDetails.specialization || 'General'}</p>
                  </div>
                </div>

                {/* Course Assignments */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Current & Historical Course Assignments ({teacherDetails.assignments?.length || 0})
                  </h4>
                  {(!teacherDetails.assignments || teacherDetails.assignments.length === 0) ? (
                    <p className="p-3 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      No course offerings currently assigned to this teacher.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {teacherDetails.assignments.map(a => (
                        <div key={a._id} className="p-2.5 rounded-xl border border-slate-100 dark:border-[#243244] bg-slate-50/50 dark:bg-[#172033]/40 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-blue-600 font-mono">{a.courseOffering?.courseCode || 'Course'}</span>
                            <span className="ml-2 font-medium text-slate-800 dark:text-slate-200">{a.courseOffering?.courseName}</span>
                            <div className="text-[10px] text-slate-400">
                              Series: {a.courseOffering?.seriesName} &bull; Semester: {a.courseOffering?.semesterName || 'N/A'}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                            {a.role || 'Teacher'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-[#1e293b] flex items-center justify-end gap-2">
                  <button
                    onClick={() => { setViewTeacherId(null); openEdit(teacherDetails); }}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                  >
                    Edit Record
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1e293b] pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap size={18} className="text-blue-600" />
                {editId ? 'Edit Teacher Record' : 'Register New Teacher'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Teacher ID *</label>
                  <input
                    type="text"
                    required
                    value={form.teacherId}
                    onChange={e => setForm({ ...form, teacherId: e.target.value.toUpperCase() })}
                    placeholder="e.g. EEE-101"
                    disabled={!!editId}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Dr. Full Name"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Department *</label>
                  <select
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100"
                  >
                    {departmentsList.map(d => (
                      <option key={d.code} value={d.code}>{d.code} — {d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Designation</label>
                  <select
                    value={form.designation}
                    onChange={e => setForm({ ...form, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100"
                  >
                    {DESIGNATION_OPTIONS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="teacher@ruet.ac.bd"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.contactNo}
                    onChange={e => setForm({ ...form, contactNo: e.target.value })}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {editId ? 'Change Password (leave empty to keep unchanged)' : 'Initial Account Password *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editId}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder={editId ? 'Enter new password or leave blank' : 'Min 6 characters'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#1e293b] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#243244] text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 transition"
                >
                  {saving ? 'Saving...' : (editId ? 'Save Changes' : 'Register Teacher')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── BULK IMPORT MODAL ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1e293b] pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload size={18} className="text-indigo-600" />
                Bulk Import Teachers (Excel / CSV)
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500">
                Upload your faculty spreadsheet. Supported columns: <strong>Teacher ID, Full Name, Department, Designation, Email, Contact No, Password</strong>.
              </p>

              <div className="p-4 border-2 border-dashed border-slate-200 dark:border-[#243244] rounded-xl text-center space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold border border-indigo-200"
                >
                  Select File ({importFile ? importFile.name : 'Choose Spreadsheet'})
                </button>
                <div className="text-[11px] text-slate-400">
                  Accepts .xlsx, .xls, and .csv files with unlimited rows.
                </div>
              </div>

              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Parsed Rows Preview ({parsedRows.length} teachers):</span>
                    <span className="text-emerald-600">✓ Validation passed</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-[#243244] p-2 bg-slate-50 dark:bg-[#0f172a] font-mono text-[11px] space-y-1">
                    {parsedRows.slice(0, 10).map((r, i) => (
                      <div key={i} className="truncate">
                        {r.teacherId} &bull; {r.name} &bull; {r.department} &bull; {r.designation}
                      </div>
                    ))}
                    {parsedRows.length > 10 && (
                      <div className="text-slate-400 italic">...and {parsedRows.length - 10} more rows</div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-[#1e293b] flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Download Sample Template
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#243244] font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={importing || parsedRows.length === 0}
                    onClick={handleCommitImport}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 transition"
                  >
                    {importing ? 'Importing Rows...' : `Import ${parsedRows.length} Teachers`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Teacher Record</h3>
                <p className="text-xs text-slate-500">Referential integrity check will be performed.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to remove <strong>{deleteTarget.name}</strong> ({deleteTarget.teacherId})?
              If this teacher has active course assignments, the system will safely archive/deactivate the account to preserve academic history.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#1e293b]">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#243244] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-60 transition"
              >
                {deleting ? 'Checking Dependencies...' : 'Confirm Delete / Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
