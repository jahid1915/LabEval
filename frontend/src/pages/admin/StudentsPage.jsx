import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Pencil, Trash2, Search, X, Loader2,
  Eye, Upload, ChevronLeft, ChevronRight, RefreshCw,
  Filter, KeyRound, UserX, UserCheck, Download, CheckSquare,
  Square, Shield, AlertTriangle, FileSpreadsheet, SlidersHorizontal,
  ChevronDown, ChevronUp, MoreHorizontal, Database, TrendingUp,
  GraduationCap, BookOpen, Columns, ArrowUpDown, XCircle,
  History, BarChart3, Layers, Building2, CheckCircle2, AlertCircle, ArrowRight, Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api/axios';

const STATUS_OPTIONS = ['active', 'graduated', 'inactive', 'suspended'];
const REGULAR_STATUS_OPTIONS = ['Regular', 'Irregular'];
const SEMESTER_OPTIONS = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];

const STATUS_COLORS = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  graduated: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
  inactive: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  suspended: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
};

const CORE_COLUMNS = [
  { key: 'rollNumber', label: 'Roll Number', alwaysVisible: true },
  { key: 'name', label: 'Student Name', alwaysVisible: true },
  { key: 'email', label: 'Email' },
  { key: 'registrationNumber', label: 'Reg. No' },
  { key: 'contactNo', label: 'Phone' },
  { key: 'department', label: 'Department' },
  { key: 'series', label: 'Series' },
  { key: 'semester', label: 'Semester' },
  { key: 'session', label: 'Session' },
  { key: 'regularStatus', label: 'Regular Status' },
  { key: 'status', label: 'Status' },
  { key: 'section', label: 'Section' },
  { key: 'batch', label: 'Batch' },
  { key: 'gender', label: 'Gender' },
  { key: 'bloodGroup', label: 'Blood Group' },
  { key: 'address', label: 'Address' },
];

const emptyForm = {
  name: '', rollNumber: '', registrationNumber: '', department: '',
  series: '', semester: '', session: '', regularStatus: 'Regular',
  section: '', batch: '', contactNo: '', email: '', gender: '',
  bloodGroup: '', address: '', password: '', status: 'active'
};

export default function StudentsPage() {
  const navigate = useNavigate();

  // Navigation Hierarchy: null = Level 1 (All Departments), string (e.g. 'ETE') = Level 2 (Cohorts), selectedCohort = string = Level 3 (Students)
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedCohort, setSelectedCohort] = useState(null);

  // Level 1 Department Summary
  const [deptSummary, setDeptSummary] = useState({ departments: [], totals: { total: 0, active: 0, inactive: 0 } });
  const [deptSummaryLoading, setDeptSummaryLoading] = useState(true);
  const [deptSearch, setDeptSearch] = useState('');

  // Level 2 Cohort Summary
  const [cohortSummary, setCohortSummary] = useState([]);
  const [cohortLoading, setCohortLoading] = useState(false);
  const [cohortSearch, setCohortSearch] = useState('');

  // Data
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterSeries, setFilterSeries] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRegularStatus, setFilterRegularStatus] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [sortBy, setSortBy] = useState('rollNumber');
  const [sortOrder, setSortOrder] = useState('asc');
  const searchTimeout = useRef(null);
  const [showFilters, setShowFilters] = useState(false);

  // Column visibility
  const [visibleCols, setVisibleCols] = useState(() => {
    const defaults = {};
    CORE_COLUMNS.forEach(c => { defaults[c.key] = ['rollNumber', 'name', 'email', 'registrationNumber', 'department', 'series', 'semester', 'status'].includes(c.key); });
    return defaults;
  });
  const [showColMenu, setShowColMenu] = useState(false);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formCustomFields, setFormCustomFields] = useState({});
  const [saving, setSaving] = useState(false);

  // View details
  const [viewStudent, setViewStudent] = useState(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [bulkActionType, setBulkActionType] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSemesterVal, setBulkSemesterVal] = useState('3-1');
  const [bulkRegularVal, setBulkRegularVal] = useState('Regular');

  // Export
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Custom field keys from current data
  const customFieldKeys = useMemo(() => {
    const keys = new Set();
    students.forEach(s => {
      if (s.customFields && typeof s.customFields === 'object') {
        Object.keys(s.customFields).forEach(k => keys.add(k));
      }
    });
    return Array.from(keys);
  }, [students]);

  // ── Fetch Level 1 Department Summary ───────────────────────────────────────────
  const fetchDeptSummary = useCallback(async () => {
    setDeptSummaryLoading(true);
    try {
      const res = await api.get('/admin/students/department-summary');
      if (res.data?.success) {
        setDeptSummary({
          departments: res.data.departments || [],
          totals: res.data.totals || { total: 0, active: 0, inactive: 0 }
        });
      }
    } catch (err) {
      console.error('Failed to load student department summary:', err);
    } finally {
      setDeptSummaryLoading(false);
    }
  }, []);

  // ── Fetch Level 2 Cohort Summary for Selected Dept ────────────────────────────
  const fetchCohortSummary = useCallback(async (deptCode) => {
    if (!deptCode || deptCode === 'ALL') return;
    setCohortLoading(true);
    try {
      const res = await api.get(`/admin/students/cohort-summary?department=${deptCode}`);
      if (res.data?.success) {
        setCohortSummary(res.data.cohorts || []);
      }
    } catch (err) {
      console.error('Failed to load cohort summary:', err);
    } finally {
      setCohortLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeptSummary();
  }, [fetchDeptSummary]);

  useEffect(() => {
    if (selectedDept && selectedDept !== 'ALL') {
      fetchCohortSummary(selectedDept);
    }
  }, [selectedDept, fetchCohortSummary]);

  // ── Fetch Level 3 Students ──────────────────────────────────────────────────────
  const fetchStudents = useCallback(async (pageNum = 1, filters = {}) => {
    if (!selectedDept || !selectedCohort) return;
    setLoading(true);
    try {
      const activeDept = (selectedDept && selectedDept !== 'ALL') ? selectedDept : (filters.department || filterDept);
      const activeSeries = (selectedCohort && selectedCohort !== 'ALL') ? selectedCohort : (filters.series || filterSeries);

      const params = new URLSearchParams({
        page: pageNum,
        limit: pageSize,
        sortBy,
        sortOrder,
        ...(filters.search && { search: filters.search }),
        ...(activeDept && { department: activeDept }),
        ...(activeSeries && { series: activeSeries }),
        ...(filters.semester && { semester: filters.semester }),
        ...(filters.status && { status: filters.status }),
        ...(filters.regularStatus && { regularStatus: filters.regularStatus }),
        ...(filters.section && { section: filters.section })
      });
      const res = await api.get(`/admin/students?${params}`);
      setStudents(res.data.students || []);
      setPagination(res.data.pagination || { page: pageNum, limit: pageSize, total: 0, totalPages: 0 });
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder, pageSize, selectedDept, selectedCohort, filterDept, filterSeries]);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const [dRes, srRes] = await Promise.all([
        api.get('/departments'),
        api.get('/academic/series')
      ]);
      setDepartments(dRes.data.departments || dRes.data?.data || dRes.data || []);
      setSeriesList(srRes.data?.data || srRes.data || []);
    } catch { /* non-critical */ }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.get('/admin/students/stats');
      if (res.data?.success) {
        setStats(res.data.stats);
      }
    } catch { /* non-critical */ }
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => {
    fetchFilterOptions();
    fetchStats();
  }, [fetchFilterOptions, fetchStats]);

  useEffect(() => {
    if (selectedDept && selectedCohort) {
      fetchStudents(1, {
        search, department: filterDept, series: filterSeries,
        semester: filterSemester, status: filterStatus,
        regularStatus: filterRegularStatus, section: filterSection
      });
    }
  }, [fetchStudents, selectedDept, selectedCohort, filterDept, filterSeries, filterSemester, filterStatus, filterRegularStatus, filterSection, sortBy, sortOrder]);

  // Debounced search
  const handleSearch = (val) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchStudents(1, {
        search: val, department: filterDept, series: filterSeries,
        semester: filterSemester, status: filterStatus,
        regularStatus: filterRegularStatus, section: filterSection
      });
    }, 400);
  };

  const changePage = (p) => {
    fetchStudents(p, {
      search, department: filterDept, series: filterSeries,
      semester: filterSemester, status: filterStatus,
      regularStatus: filterRegularStatus, section: filterSection
    });
  };

  const clearFilters = () => {
    setSearch(''); setFilterDept(''); setFilterSeries('');
    setFilterSemester(''); setFilterStatus(''); setFilterRegularStatus('');
    setFilterSection('');
  };

  const hasActiveFilters = search || filterDept || filterSeries || filterSemester || filterStatus || filterRegularStatus || filterSection;

  // ── Sorting ────────────────────────────────────────────────────────────
  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  // ── Selection ──────────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map(s => s._id));
    }
  };

  // ── CRUD ────────────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditId(null);
    setForm({
      ...emptyForm,
      department: selectedDept && selectedDept !== 'ALL' ? selectedDept : (departments[0]?.code || 'ETE'),
      series: selectedCohort && selectedCohort !== 'ALL' ? selectedCohort : '22',
      semester: filterSemester || '1-1'
    });
    setFormCustomFields({});
    setShowModal(true);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Roll Number': '2204001',
        'Student Name': 'Sample Student',
        'Registration Number': '2204001',
        'Department': selectedDept && selectedDept !== 'ALL' ? selectedDept : 'ETE',
        'Series': selectedCohort && selectedCohort !== 'ALL' ? selectedCohort : '22',
        'Semester': '3-1',
        'Session': '2022-2023',
        'Regular Status': 'Regular',
        'Section': 'A',
        'Email': 'student2204001@student.ruet.ac.bd',
        'Phone': '01700000000',
        'Password': 'password123'
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students_Template');
    XLSX.writeFile(workbook, 'RUET_Student_Import_Template.xlsx');
    toast.info('Sample student import template downloaded');
  };

  const openEditModal = (student) => {
    setEditId(student._id);
    setForm({
      name: student.name || '',
      rollNumber: student.rollNumber || '',
      registrationNumber: student.registrationNumber || '',
      department: student.department || '',
      series: student.series || '',
      semester: student.semester || '',
      session: student.session || '',
      regularStatus: student.regularStatus || 'Regular',
      section: student.section || '',
      batch: student.batch || '',
      contactNo: student.contactNo || '',
      email: student.email || '',
      gender: student.gender || '',
      bloodGroup: student.bloodGroup || '',
      address: student.address || '',
      status: student.status || 'active',
      password: ''
    });
    setFormCustomFields(student.customFields || {});
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.rollNumber.trim()) {
      toast.error('Name and Roll Number are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (Object.keys(formCustomFields).length > 0) {
        payload.customFields = formCustomFields;
      }
      if (!payload.password) delete payload.password;

      if (editId) {
        await api.put(`/admin/students/${editId}`, payload);
        toast.success('Student updated successfully');
      } else {
        await api.post('/admin/students', payload);
        toast.success('Student created successfully');
      }
      setShowModal(false);
      fetchStudents(pagination.page, {
        search, department: filterDept, series: filterSeries,
        semester: filterSemester, status: filterStatus,
        regularStatus: filterRegularStatus, section: filterSection
      });
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/admin/students/${deleteTarget._id}`);
      toast.success(`Deleted ${deleteTarget.name}`);
      setDeleteTarget(null);
      fetchStudents(pagination.page, {
        search, department: filterDept, series: filterSeries,
        semester: filterSemester, status: filterStatus,
        regularStatus: filterRegularStatus, section: filterSection
      });
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    try {
      await api.post(`/admin/students/${resetTarget._id}/reset-password`);
      toast.success(`Password reset to roll number for ${resetTarget.name}`);
      setResetTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    }
  };

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) return;
    try {
      const payload = { studentIds: selectedIds, action: bulkActionType };
      if (bulkActionType === 'update_semester') payload.payload = { semester: bulkSemesterVal };
      if (bulkActionType === 'update_regular_status') payload.payload = { regularStatus: bulkRegularVal };
      const res = await api.post('/admin/students/bulk-action', payload);
      toast.success(res.data.message || 'Bulk action completed');
      setShowBulkModal(false);
      setSelectedIds([]);
      fetchStudents(pagination.page, {
        search, department: filterDept, series: filterSeries,
        semester: filterSemester, status: filterStatus,
        regularStatus: filterRegularStatus, section: filterSection
      });
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk action failed');
    }
  };

  // ── Export ──────────────────────────────────────────────────────────────
  const handleExport = async (mode) => {
    setExporting(true);
    setShowExportMenu(false);
    try {
      const params = new URLSearchParams();
      if (mode === 'filtered' || mode === 'all') {
        if (mode === 'filtered') {
          if (filterDept) params.set('department', filterDept);
          if (filterSeries) params.set('series', filterSeries);
          if (filterSemester) params.set('semester', filterSemester);
          if (filterStatus) params.set('status', filterStatus);
          if (filterRegularStatus) params.set('regularStatus', filterRegularStatus);
          if (filterSection) params.set('section', filterSection);
          if (search) params.set('search', search);
        }
      } else if (mode === 'selected' && selectedIds.length > 0) {
        params.set('ids', selectedIds.join(','));
      }

      // Selected visible columns
      const cols = Object.entries(visibleCols).filter(([, v]) => v).map(([k]) => k);
      if (cols.length > 0) params.set('columns', cols.join(','));

      const res = await api.get(`/import/students/export?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `RUET_Students_${mode}_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const getVal = (student, key) => {
    if (customFieldKeys.includes(key)) {
      return student.customFields?.[key] || '';
    }
    return student[key] ?? '';
  };

  // All visible column keys (core + custom)
  const allVisibleColumns = useMemo(() => {
    const cols = CORE_COLUMNS.filter(c => visibleCols[c.key]);
    customFieldKeys.forEach(k => {
      if (visibleCols[k]) {
        cols.push({ key: k, label: k });
      }
    });
    return cols;
  }, [visibleCols, customFieldKeys]);

  // ── Stats cards ─────────────────────────────────────────────────────
  const statCards = useMemo(() => {
    if (!stats) return [];
    const cards = [
      { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' },
      { label: 'Active', value: stats.activeStudents, icon: UserCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
      { label: 'Regular', value: stats.regularStudents, icon: GraduationCap, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40' },
      { label: 'Current Semester', value: stats.currentSemester, icon: BookOpen, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/40' },
    ];
    // Add series distribution as cards
    stats.seriesDistribution?.slice(0, 3).forEach(s => {
      cards.push({
        label: `${s.series} Series`,
        value: s.count,
        icon: Layers,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/40'
      });
    });
    return cards;
  }, [stats]);

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-12">
      {/* ── TOP BREADCRUMB & HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <button
              onClick={() => { setSelectedDept(null); setSelectedCohort(null); }}
              className="hover:text-blue-600 dark:hover:text-blue-400 font-medium transition"
            >
              Student Governance
            </button>
            {selectedDept && (
              <>
                <span>/</span>
                <button
                  onClick={() => setSelectedCohort(null)}
                  className="hover:text-blue-600 dark:hover:text-blue-400 font-medium transition"
                >
                  {selectedDept === 'ALL' ? 'All Departments' : `${selectedDept} Department`}
                </button>
              </>
            )}
            {selectedCohort && (
              <>
                <span>/</span>
                <span className="font-semibold text-slate-800 dark:text-white">
                  {selectedCohort === 'ALL' ? 'All Series Roster' : `${selectedCohort} Series Cohort`}
                </span>
              </>
            )}
            {!selectedDept && (
              <>
                <span>/</span>
                <span className="font-semibold text-slate-800 dark:text-white">Department Overview</span>
              </>
            )}
          </nav>

          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <Database size={20} />
            </div>
            {!selectedDept
              ? 'Student Database Governance'
              : !selectedCohort
              ? `${selectedDept === 'ALL' ? 'All' : selectedDept} Academic Cohorts & Series`
              : `${selectedDept} — ${selectedCohort === 'ALL' ? 'Complete Student Roster' : `${selectedCohort} Series Cohort`}`}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {!selectedDept
              ? 'Department-first cohort management across all 18 RUET academic departments.'
              : !selectedCohort
              ? `Select an academic series or session cohort in ${selectedDept} to view students.`
              : `Viewing students in ${selectedDept} department (${pagination.total.toLocaleString()} records).`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {selectedCohort && (
            <button
              onClick={() => setSelectedCohort(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft size={16} /> Back to Cohorts
            </button>
          )}

          {selectedDept && !selectedCohort && (
            <button
              onClick={() => setSelectedDept(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft size={16} /> Back to Departments
            </button>
          )}

          <button
            onClick={() => navigate('/admin/import')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Upload size={16} /> Import Excel
          </button>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Export
              <ChevronDown size={14} />
            </button>
            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-12 w-56 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 overflow-hidden"
                >
                  <button onClick={() => handleExport('all')} className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2.5">
                    <FileSpreadsheet size={15} className="text-emerald-500" /> Export All Students
                  </button>
                  {hasActiveFilters && (
                    <button onClick={() => handleExport('filtered')} className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2.5">
                      <Filter size={15} className="text-blue-500" /> Export Filtered Data
                    </button>
                  )}
                  {selectedIds.length > 0 && (
                    <button onClick={() => handleExport('selected')} className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2.5">
                      <CheckSquare size={15} className="text-violet-500" /> Export Selected ({selectedIds.length})
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-white transition-colors"
          >
            <Plus size={16} /> Add Student
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          LEVEL 1: ALL DEPARTMENTS
      ══════════════════════════════════════════════════════════════════════════ */}
      {!selectedDept && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-white/90 dark:bg-[#0f172a]/90 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Total Students</span>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center">
                  <Users size={16} />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                {deptSummaryLoading ? '...' : (deptSummary.totals?.total || 0).toLocaleString()}
              </div>
              <span className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Persisted In Database
              </span>
            </div>

            <div className="bg-white/90 dark:bg-[#0f172a]/90 border border-emerald-200/80 dark:border-emerald-900/40 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Active Students</span>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                {deptSummaryLoading ? '...' : (deptSummary.totals?.active || 0).toLocaleString()}
              </div>
              <span className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Currently Enrolled
              </span>
            </div>

            <div className="bg-white/90 dark:bg-[#0f172a]/90 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Inactive / Graduated</span>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center">
                  <AlertCircle size={16} />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                {deptSummaryLoading ? '...' : (deptSummary.totals?.inactive || 0).toLocaleString()}
              </div>
              <span className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60">
                Graduated / Inactive
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
                {deptSummaryLoading ? '...' : (deptSummary.departments?.length || 18)}
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
                onClick={() => { setSelectedDept('ALL'); setSelectedCohort('ALL'); setPagination(p => ({ ...p, page: 1 })); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-[#28384f] transition"
              >
                View Universal Directory ({deptSummary.totals?.total || 0}) <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Department Cards Grid */}
          {deptSummaryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 rounded-2xl border border-slate-200 dark:border-[#243244] bg-white dark:bg-[#111827] animate-pulse p-5" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(deptSummary.departments || []).filter(d =>
                d.code?.toLowerCase().includes(deptSearch.toLowerCase()) ||
                d.name?.toLowerCase().includes(deptSearch.toLowerCase()) ||
                d.facultyName?.toLowerCase().includes(deptSearch.toLowerCase())
              ).map((d) => (
                <div
                  key={d._id}
                  onClick={() => { setSelectedDept(d.code); setSelectedCohort(null); }}
                  className="group relative cursor-pointer bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-[#243244] hover:border-blue-400 dark:hover:border-blue-600 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-xs overflow-hidden flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                          {d.code}
                        </span>
                        {d.facultyName && (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[150px]">
                            {d.facultyName}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                        {d.name}
                      </h3>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-[#172033] border border-slate-100 dark:border-[#243244] flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 transition-all shrink-0">
                      <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-[#1e293b]">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Total Enrolled</span>
                      <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white">
                        {d.totalStudents} <span className="text-xs font-normal text-slate-400">students</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-semibold pt-1">
                      <div className="py-1 px-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50">
                        {d.activeStudents} Active
                      </div>
                      <div className="py-1 px-1.5 rounded-lg bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/50">
                        {d.inactiveStudents} Inactive
                      </div>
                      <div className="py-1 px-1.5 rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200/50">
                        {d.cohortCount} Cohort{d.cohortCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          LEVEL 2: ACADEMIC COHORTS & SERIES CARDS
      ══════════════════════════════════════════════════════════════════════════ */}
      {selectedDept && !selectedCohort && (
        <div className="space-y-6">
          {/* Header Banner for Department */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-transparent p-5 rounded-2xl border border-blue-200/60 dark:border-blue-900/30">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/30">
                {selectedDept}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedDept} Academic Series & Cohorts
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a series cohort to manage student enrollment, academic records, and profiles.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSelectedCohort('ALL'); setPagination(p => ({ ...p, page: 1 })); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm transition"
              >
                View All {selectedDept} Students <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Cohort Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] p-3.5 rounded-2xl shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={cohortSearch}
                onChange={e => setCohortSearch(e.target.value)}
                placeholder="Search cohort by series, session, semester..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Found {(cohortSummary || []).filter(c =>
                String(c.series || '').toLowerCase().includes(cohortSearch.toLowerCase()) ||
                String(c.session || '').toLowerCase().includes(cohortSearch.toLowerCase()) ||
                String(c.semester || '').toLowerCase().includes(cohortSearch.toLowerCase())
              ).length} academic cohort(s) in {selectedDept}
            </p>
          </div>

          {/* Cohorts Grid */}
          {cohortLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-44 rounded-2xl border border-slate-200 dark:border-[#243244] bg-white dark:bg-[#111827] animate-pulse p-5" />
              ))}
            </div>
          ) : (cohortSummary || []).filter(c =>
            String(c.series || '').toLowerCase().includes(cohortSearch.toLowerCase()) ||
            String(c.session || '').toLowerCase().includes(cohortSearch.toLowerCase()) ||
            String(c.semester || '').toLowerCase().includes(cohortSearch.toLowerCase())
          ).length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Layers size={28} className="text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No Cohorts Found in {selectedDept}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                No students are registered in {selectedDept} yet. You can add a student or import student records via Excel.
              </p>
              <div className="flex items-center justify-center gap-3 mt-5">
                <button
                  onClick={openCreateModal}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                >
                  <Plus size={14} className="inline mr-1" /> Add First Student
                </button>
                <button
                  onClick={() => navigate('/admin/import')}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <Upload size={14} className="inline mr-1" /> Import Excel
                </button>
                <button
                  onClick={() => setSelectedDept(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Back to Departments
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(cohortSummary || []).filter(c =>
                String(c.series || '').toLowerCase().includes(cohortSearch.toLowerCase()) ||
                String(c.session || '').toLowerCase().includes(cohortSearch.toLowerCase()) ||
                String(c.semester || '').toLowerCase().includes(cohortSearch.toLowerCase())
              ).map((c, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setSelectedCohort(c.series);
                    setFilterSemester(c.semester !== 'N/A' ? c.semester : '');
                    setPagination(p => ({ ...p, page: 1 }));
                  }}
                  className="group relative cursor-pointer bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-[#243244] hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-xs overflow-hidden flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                          {c.series} Series
                        </span>
                        {c.session && c.session !== 'Unassigned' && (
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {c.session}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Semester {c.semester} Cohort
                      </h3>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-[#172033] border border-slate-100 dark:border-[#243244] flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all shrink-0">
                      <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-[#1e293b]">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Cohort Size</span>
                      <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white">
                        {c.totalStudents} <span className="text-xs font-normal text-slate-400">students</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-center text-[11px] font-semibold pt-1">
                      <div className="py-1 px-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50">
                        {c.activeStudents} Active
                      </div>
                      <div className="py-1 px-1.5 rounded-lg bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/50">
                        {c.inactiveStudents} Inactive
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          LEVEL 3: COHORT STUDENT DIRECTORY
      ══════════════════════════════════════════════════════════════════════════ */}
      {selectedDept && selectedCohort && (
        <div className="space-y-5">
          {/* ── Search + Filter Bar ────────────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search by name, roll, email, registration..."
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                {search && (
                  <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Quick Filter Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${showFilters
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <SlidersHorizontal size={15} /> Filters
                  {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                </button>

                {/* Column Visibility */}
                <div className="relative">
                  <button
                    onClick={() => setShowColMenu(!showColMenu)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Columns size={15} /> Columns
                  </button>
                  <AnimatePresence>
                    {showColMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute right-0 top-12 w-60 max-h-[400px] overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 p-2"
                      >
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2 py-1.5 uppercase tracking-wider">Core Fields</p>
                        {CORE_COLUMNS.map(col => (
                          <label key={col.key} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={!!visibleCols[col.key]}
                              onChange={() => setVisibleCols(prev => ({ ...prev, [col.key]: !prev[col.key] }))}
                              disabled={col.alwaysVisible}
                              className="accent-blue-600 rounded"
                            />
                            <span className="text-slate-700 dark:text-slate-300">{col.label}</span>
                          </label>
                        ))}
                        {customFieldKeys.length > 0 && (
                          <>
                            <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2 py-1.5 uppercase tracking-wider">Custom Fields</p>
                            {customFieldKeys.map(k => (
                              <label key={k} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm">
                                <input
                                  type="checkbox"
                                  checked={!!visibleCols[k]}
                                  onChange={() => setVisibleCols(prev => ({ ...prev, [k]: !prev[k] }))}
                                  className="accent-violet-600 rounded"
                                />
                                <span className="text-slate-700 dark:text-slate-300">{k}</span>
                              </label>
                            ))}
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <XCircle size={15} /> Clear
                  </button>
                )}

                <button
                  onClick={() => {
                    fetchStudents(1, { search, department: filterDept, series: filterSeries, semester: filterSemester, status: filterStatus, regularStatus: filterRegularStatus, section: filterSection });
                    fetchStats();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>

            {/* ── Expanded Filters ─────────────────────────────────────────── */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-3">
                    <select
                      value={filterSemester}
                      onChange={e => setFilterSemester(e.target.value)}
                      className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Semesters</option>
                      {SEMESTER_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Status</option>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <select
                      value={filterRegularStatus}
                      onChange={e => setFilterRegularStatus(e.target.value)}
                      className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Regular / Irregular</option>
                      {REGULAR_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input
                      type="text"
                      value={filterSection}
                      onChange={e => setFilterSection(e.target.value)}
                      placeholder="Section (A, B...)"
                      className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Rows:</span>
                      <select
                        value={pageSize}
                        onChange={e => {
                          const newSize = Number(e.target.value);
                          setPageSize(newSize);
                          setPagination(p => ({ ...p, page: 1, limit: newSize }));
                        }}
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                        <option value={200}>200 per page</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Bulk Actions Bar ───────────────────────────────────────────── */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center justify-between gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl px-5 py-3"
              >
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                  <CheckSquare size={15} className="inline mr-1.5" />
                  {selectedIds.length} student{selectedIds.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { action: 'delete', label: 'Delete', icon: Trash2, cls: 'text-rose-600 border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-800' },
                    { action: 'activate', label: 'Activate', icon: UserCheck, cls: 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800' },
                    { action: 'deactivate', label: 'Deactivate', icon: UserX, cls: 'text-amber-600 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800' },
                    { action: 'update_semester', label: 'Update Semester', icon: BookOpen, cls: 'text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800' },
                  ].map(({ action, label, icon: Icon, cls }) => (
                    <button
                      key={action}
                      onClick={() => { setBulkActionType(action); setShowBulkModal(true); }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${cls}`}
                    >
                      <Icon size={13} /> {label}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedIds([])}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 ml-1"
                  >
                    Clear
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Data Table ──────────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                    <th className="w-10 px-3 py-3.5">
                      <button onClick={toggleSelectAll} className="text-slate-400 hover:text-blue-600 transition-colors">
                        {selectedIds.length === students.length && students.length > 0 ? (
                          <CheckSquare size={16} className="text-blue-600" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </th>
                    <th className="w-10 px-2 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">#</th>
                    {allVisibleColumns.map(col => (
                      <th
                        key={col.key}
                        className="px-3 py-3.5 text-left cursor-pointer group select-none"
                        onClick={() => handleSort(col.key)}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          <span className="truncate">{col.label}</span>
                          {sortBy === col.key ? (
                            sortOrder === 'asc' ? <ChevronUp size={13} className="text-blue-500" /> : <ChevronDown size={13} className="text-blue-500" />
                          ) : (
                            <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={allVisibleColumns.length + 3} className="px-4 py-4">
                          <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={allVisibleColumns.length + 3} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Users size={28} className="text-slate-400" />
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 font-medium">
                            {hasActiveFilters ? 'No students match your filters' : 'No students registered in this cohort'}
                          </p>
                          {hasActiveFilters ? (
                            <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline">Clear all filters</button>
                          ) : (
                            <button onClick={() => navigate('/admin/import')} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                              <Upload size={14} /> Import from Excel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    students.map((student, idx) => (
                      <tr
                        key={student._id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${selectedIds.includes(student._id) ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                      >
                        <td className="px-3 py-3">
                          <button onClick={() => toggleSelect(student._id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                            {selectedIds.includes(student._id) ? (
                              <CheckSquare size={16} className="text-blue-600" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </td>
                        <td className="px-2 py-3 text-xs text-slate-400 font-mono">
                          {(pagination.page - 1) * pagination.limit + idx + 1}
                        </td>
                        {allVisibleColumns.map(col => (
                          <td key={col.key} className="px-3 py-3 max-w-[200px]">
                            {col.key === 'status' ? (
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[student.status] || STATUS_COLORS.active}`}>
                                {student.status?.charAt(0).toUpperCase() + student.status?.slice(1)}
                              </span>
                            ) : col.key === 'regularStatus' ? (
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${student.regularStatus === 'Regular'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                                : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800'}`}>
                                {student.regularStatus || 'Regular'}
                              </span>
                            ) : col.key === 'name' ? (
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                  {student.name?.charAt(0) || '?'}
                                </div>
                                <span className="font-medium text-slate-900 dark:text-white truncate">{student.name}</span>
                              </div>
                            ) : (
                              <span className="text-slate-700 dark:text-slate-300 truncate block">
                                {getVal(student, col.key) || <span className="text-slate-300 dark:text-slate-600">—</span>}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setViewStudent(student)}
                              title="View"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => openEditModal(student)}
                              title="Edit"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(student)}
                              title="Delete"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                            <button
                              onClick={() => setResetTarget(student)}
                              title="Reset Password"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
                            >
                              <KeyRound size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ───────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {pagination.total > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()} students
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>Page Size:</span>
                  <select
                    value={pageSize}
                    onChange={e => {
                      const newSize = Number(e.target.value);
                      setPageSize(newSize);
                      setPagination(p => ({ ...p, page: 1, limit: newSize }));
                      fetchStudents(1, { search, department: filterDept, series: filterSeries, semester: filterSemester, status: filterStatus, regularStatus: filterRegularStatus, section: filterSection });
                    }}
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => changePage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {/* Page numbers */}
                  {(() => {
                    const pages = [];
                    const total = pagination.totalPages;
                    const current = pagination.page;
                    let start = Math.max(1, current - 2);
                    let end = Math.min(total, start + 4);
                    if (end - start < 4) start = Math.max(1, end - 4);
                    for (let i = start; i <= end; i++) pages.push(i);
                    return pages.map(p => (
                      <button
                        key={p}
                        onClick={() => changePage(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${p === current
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                      >
                        {p}
                      </button>
                    ));
                  })()}
                  <button
                    onClick={() => changePage(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MODALS ══════════════ */}

      {/* ── View Student Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {viewStudent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setViewStudent(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
                    {viewStudent.name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-white">{viewStudent.name}</h3>
                    <p className="text-sm text-slate-500">{viewStudent.rollNumber} · {viewStudent.department}</p>
                  </div>
                </div>
                <button onClick={() => setViewStudent(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                {[
                  { label: 'Roll Number', value: viewStudent.rollNumber },
                  { label: 'Registration No', value: viewStudent.registrationNumber },
                  { label: 'Email', value: viewStudent.email },
                  { label: 'Phone', value: viewStudent.contactNo },
                  { label: 'Department', value: viewStudent.department },
                  { label: 'Series', value: viewStudent.series },
                  { label: 'Semester', value: viewStudent.semester },
                  { label: 'Session', value: viewStudent.session },
                  { label: 'Section', value: viewStudent.section },
                  { label: 'Batch', value: viewStudent.batch },
                  { label: 'Gender', value: viewStudent.gender },
                  { label: 'Blood Group', value: viewStudent.bloodGroup },
                  { label: 'Regular Status', value: viewStudent.regularStatus },
                  { label: 'Status', value: viewStudent.status },
                  { label: 'Address', value: viewStudent.address },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{value || '—'}</p>
                  </div>
                ))}
              </div>
              {viewStudent.customFields && Object.keys(viewStudent.customFields).length > 0 && (
                <div className="px-6 pb-6">
                  <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-3">Custom Fields</p>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(viewStudent.customFields).map(([k, v]) => (
                      <div key={k}>
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">{k}</p>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{v || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="px-6 pb-6 flex gap-2">
                <button onClick={() => { openEditModal(viewStudent); setViewStudent(null); }}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                  <Pencil size={14} /> Edit
                </button>
                <button onClick={() => setViewStudent(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create / Edit Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-white">
                  {editId ? 'Edit Student' : 'Add New Student'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'rollNumber', label: 'Roll Number *', disabled: !!editId },
                    { key: 'name', label: 'Student Name *' },
                    { key: 'email', label: 'Email' },
                    { key: 'registrationNumber', label: 'Registration No' },
                    { key: 'contactNo', label: 'Phone' },
                    { key: 'department', label: 'Department', type: 'select', options: (Array.isArray(departments) ? departments : []).map(d => d.code || d.departmentCode || d) },
                    { key: 'series', label: 'Series' },
                    { key: 'semester', label: 'Semester', type: 'select', options: SEMESTER_OPTIONS },
                    { key: 'session', label: 'Academic Session' },
                    { key: 'regularStatus', label: 'Regular Status', type: 'select', options: REGULAR_STATUS_OPTIONS },
                    { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
                    { key: 'section', label: 'Section' },
                    { key: 'batch', label: 'Batch' },
                    { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
                    { key: 'bloodGroup', label: 'Blood Group', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
                    { key: 'address', label: 'Address' },
                    { key: 'password', label: editId ? 'New Password (leave blank to keep)' : 'Password', type: 'password' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">{field.label}</label>
                      {field.type === 'select' ? (
                        <select value={form[field.key]} onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                          className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Select...</option>
                          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={field.type || 'text'} value={form[field.key]}
                          onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                          disabled={field.disabled}
                          className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Custom Fields */}
                {editId && Object.keys(formCustomFields).length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-3">Custom Fields</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(formCustomFields).map(([k, v]) => (
                        <div key={k}>
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">{k}</label>
                          <input type="text" value={v || ''}
                            onChange={e => setFormCustomFields(prev => ({ ...prev, [k]: e.target.value }))}
                            className="w-full px-3 py-2.5 text-sm rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 pb-6 flex gap-3">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editId ? 'Save Changes' : 'Create Student'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation ────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDeleteTarget(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-rose-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Student</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-white">{deleteTarget.name}</span>?
              </p>
              <p className="text-xs text-slate-500 mb-5">Roll: {deleteTarget.rollNumber} · This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reset Password Confirmation ───────────────────────────────── */}
      <AnimatePresence>
        {resetTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setResetTarget(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center">
                  <KeyRound size={20} className="text-violet-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reset Password</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                Reset password for <span className="font-semibold text-slate-900 dark:text-white">{resetTarget.name}</span> ({resetTarget.rollNumber}) to their roll number?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setResetTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button onClick={handleResetPassword}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
                  Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bulk Action Confirmation ──────────────────────────────────── */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowBulkModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
                  <Shield size={20} className="text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bulk Action</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Apply <span className="font-bold text-slate-900 dark:text-white">{bulkActionType.replace(/_/g, ' ')}</span> to {selectedIds.length} student{selectedIds.length !== 1 ? 's' : ''}?
              </p>
              {bulkActionType === 'update_semester' && (
                <select value={bulkSemesterVal} onChange={e => setBulkSemesterVal(e.target.value)}
                  className="w-full px-3 py-2.5 mb-4 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none">
                  {SEMESTER_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              {bulkActionType === 'update_regular_status' && (
                <select value={bulkRegularVal} onChange={e => setBulkRegularVal(e.target.value)}
                  className="w-full px-3 py-2.5 mb-4 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none">
                  {REGULAR_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              {bulkActionType === 'delete' && (
                <p className="text-xs text-rose-500 dark:text-rose-400 mb-4">⚠️ This action cannot be undone. All selected students will be permanently removed.</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowBulkModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button onClick={handleBulkAction}
                  className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors ${bulkActionType === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-blue-600 hover:bg-blue-700'}`}>
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click-away listeners */}
      {(showExportMenu || showColMenu) && (
        <div className="fixed inset-0 z-30" onClick={() => { setShowExportMenu(false); setShowColMenu(false); }} />
      )}
    </div>
  );
}
