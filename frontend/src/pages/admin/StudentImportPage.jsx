import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight,
  ArrowLeft, Download, Play, Eye, RefreshCw, X, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  Users, AlertTriangle, Info, Loader2, FileCheck, History,
  SkipForward, Pencil, Search, Filter, SlidersHorizontal, Save, Bookmark,
  CheckSquare, Square, Layers, Sparkles, Database, ShieldAlert, Trash2,
  Columns, XCircle, Link2, Unlink, Plus, Cloud, CloudUpload, Sheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api/axios';

// ── Core DB Fields ────────────────────────────────────────────────────────
const DB_FIELDS = [
  { value: '', label: '— Ignore this column —', key: null },
  { value: 'rollNumber', label: 'Roll Number * (Unique ID)', required: true, core: true },
  { value: 'name', label: 'Student Name *', required: true, core: true },
  { value: 'department', label: 'Department *', core: true },
  { value: 'series', label: 'Series *', core: true },
  { value: 'registrationNumber', label: 'Registration Number', core: true },
  { value: 'email', label: 'Student Email', core: true },
  { value: 'contactNo', label: 'Phone / Contact No', core: true },
  { value: 'semester', label: 'Current Semester', core: true },
  { value: 'session', label: 'Academic Session', core: true },
  { value: 'regularStatus', label: 'Regular / Irregular', core: true },
  { value: 'status', label: 'Account Status', core: true },
  { value: 'batch', label: 'Batch / Group', core: true },
  { value: 'section', label: 'Section', core: true },
  // Common Demographic & Profile Fields
  { value: 'nameBangla', label: 'Student Name (Bangla)' },
  { value: 'fatherName', label: "Father's Name" },
  { value: 'motherName', label: "Mother's Name" },
  { value: 'gender', label: 'Gender' },
  { value: 'bloodGroup', label: 'Blood Group' },
  { value: 'dob', label: 'Date of Birth' },
  { value: 'nationality', label: 'Nationality' },
  { value: 'admissionDate', label: 'Admission Date' },
  { value: 'city', label: 'City / District' },
  { value: 'country', label: 'Country' },
  { value: 'year', label: 'Academic Year / Level' },
  { value: 'address', label: 'Address' },
];

const IMPORT_MODES = [
  { id: 'upsert', label: 'Add + Update (Recommended)', desc: 'Insert new students and update existing records', icon: '🔄', color: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' },
  { id: 'add_new', label: 'Add New Only', desc: 'Only insert students that do not already exist', icon: '➕', color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
  { id: 'update_existing', label: 'Update Existing Only', desc: 'Only update records already in the database', icon: '✏️', color: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' },
];

const STEPS = ['Upload', 'Preview', 'Column Mapping', 'Validation', 'Import'];

export default function StudentImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Wizard
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Step 1: Upload
  const [file, setFile] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [sheetsInfo, setSheetsInfo] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [headers, setHeaders] = useState([]);
  const [allRawRows, setAllRawRows] = useState([]);
  const [fileStats, setFileStats] = useState({ fileName: '', fileSize: 0, totalRows: 0, totalCols: 0 });
  const [availableDepartments, setAvailableDepartments] = useState(['ETE', 'CSE', 'EEE', 'CE', 'ME', 'IPE']);

  // Overrides
  const [detectedSeries, setDetectedSeries] = useState('');
  const [overrideSeries, setOverrideSeries] = useState('');
  const [overrideDept, setOverrideDept] = useState('');
  const [overrideSession, setOverrideSession] = useState('');

  // Step 2: Preview & Dynamic Editing
  const [previewSearch, setPreviewSearch] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRowIndices, setSelectedRowIndices] = useState(new Set());
  const [detectedHeaderRow, setDetectedHeaderRow] = useState(1);
  const [candidateHeaderRows, setCandidateHeaderRows] = useState([]);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const tableContainerRef = useRef(null);

  // Step 3: Mapping
  const [mapping, setMapping] = useState({});
  const [customFieldMappings, setCustomFieldMappings] = useState({});
  const [newCustomFieldName, setNewCustomFieldName] = useState('');
  const [duplicateKey, setDuplicateKey] = useState('rollNumber');
  const [duplicateAction, setDuplicateAction] = useState('skip');
  const [importMode, setImportMode] = useState('upsert');

  // Templates
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [saveTemplateModal, setSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // Step 4: Validation/Preview Summary
  const [previewSummary, setPreviewSummary] = useState(null);

  // Step 5: Result
  const [executeResult, setExecuteResult] = useState(null);
  const [importProgress, setImportProgress] = useState(0);

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadMappingTemplates();
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const res = await api.get('/departments');
      const data = res.data?.data || res.data?.departments || res.data || [];
      if (Array.isArray(data)) {
        setAvailableDepartments(data.map(d => d.code || d.departmentCode || d).filter(Boolean));
      }
    } catch { /* fallback defaults */ }
  };

  const loadMappingTemplates = async () => {
    try {
      const res = await api.get('/import/mapping-templates');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setSavedTemplates(res.data.data);
      }
    } catch { /* silent */ }
  };

  // ── File Handling ───────────────────────────────────────────────────────
  const processFile = async (selected) => {
    if (!selected) return;
    const ext = selected.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      toast.error('Only .xlsx and .xls files are supported');
      return;
    }
    if (selected.size > 20 * 1024 * 1024) {
      toast.error('File size exceeds 20 MB limit');
      return;
    }

    setFile(selected);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selected);
      const res = await api.post('/import/students/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        const d = res.data.data;
        setFileStats({ fileName: d.fileName, fileSize: d.fileSize, totalRows: d.totalRows, totalCols: d.totalColumns });
        setSheetNames(d.sheetNames || ['Sheet1']);
        setSheetsInfo(d.sheetsInfo || []);
        setSelectedSheet(d.selectedSheet || d.sheetNames[0]);
        setHeaders(d.headers || []);
        setAllRawRows(d.allRows || []);
        setSelectedRowIndices(new Set((d.allRows || []).map(r => r._rowIndex)));
        setMapping(d.autoMapping || {});
        setDetectedHeaderRow(d.detectedHeaderRow || 1);
        setCandidateHeaderRows(d.candidateHeaderRows || []);
        setHeaderRowIndex(d.detectedHeaderRow ? d.detectedHeaderRow - 1 : 0);
        if (d.detectedSeries) {
          setDetectedSeries(d.detectedSeries);
          setOverrideSeries(d.detectedSeries);
          setOverrideSession(d.detectedSession || '');
        }
        if (d.availableDepartments?.length > 0) {
          setAvailableDepartments(d.availableDepartments);
        }
        setStep(1);
        toast.success(`Parsed: ${d.totalRows} rows, ${d.headers.length} columns (Header at Row #${d.detectedHeaderRow || 1})`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to parse Excel file');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    processFile(e.target.files?.[0]);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Sheet change
  const handleSheetChange = async (sheetName) => {
    setSelectedSheet(sheetName);
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheetName', sheetName);
      if (headerRowIndex !== null && headerRowIndex !== undefined) {
        formData.append('headerRowIndex', headerRowIndex);
      }
      const res = await api.post('/import/students/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        const d = res.data.data;
        setHeaders(d.headers || []);
        setAllRawRows(d.allRows || []);
        setFileStats(prev => ({ ...prev, totalRows: d.totalRows, totalCols: d.totalColumns }));
        setSelectedRowIndices(new Set((d.allRows || []).map(r => r._rowIndex)));
        setMapping(d.autoMapping || {});
        setDetectedHeaderRow(d.detectedHeaderRow || 1);
        setCandidateHeaderRows(d.candidateHeaderRows || []);
        toast.info(`Switched to "${sheetName}" (${d.totalRows} rows, ${d.totalColumns} columns)`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load sheet');
    } finally {
      setLoading(false);
    }
  };

  // Header Row Change
  const handleHeaderRowChange = async (rowIdx) => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheetName', selectedSheet);
      formData.append('headerRowIndex', rowIdx);
      const res = await api.post('/import/students/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        const d = res.data.data;
        setHeaderRowIndex(rowIdx);
        setDetectedHeaderRow(d.detectedHeaderRow || (rowIdx + 1));
        setHeaders(d.headers || []);
        setAllRawRows(d.allRows || []);
        setFileStats(prev => ({ ...prev, totalRows: d.totalRows, totalCols: d.totalColumns }));
        setSelectedRowIndices(new Set((d.allRows || []).map(r => r._rowIndex)));
        setMapping(d.autoMapping || {});
        setPage(1);
        toast.info(`Switched to Header Row #${rowIdx + 1} (${d.totalColumns} columns detected)`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to switch header row');
    } finally {
      setLoading(false);
    }
  };

  // ── Dynamic In-place Editing Helpers ─────────────────────────────────────
  const handleCellChange = (rowIndex, colName, value) => {
    setAllRawRows(prev => prev.map(r => {
      if (r._rowIndex === rowIndex) {
        return { ...r, [colName]: value };
      }
      return r;
    }));
  };

  const handleAddRow = () => {
    const newIdx = allRawRows.length > 0 ? Math.max(...allRawRows.map(r => r._rowIndex)) + 1 : 1;
    const newRow = { _rowIndex: newIdx };
    headers.forEach(h => { newRow[h] = ''; });
    setAllRawRows(prev => [newRow, ...prev]);
    setSelectedRowIndices(prev => new Set([newIdx, ...prev]));
    setFileStats(prev => ({ ...prev, totalRows: prev.totalRows + 1 }));
    setPage(1);
    toast.success('New editable row added at the top');
  };

  const handleDeleteRow = (rowIndex) => {
    setAllRawRows(prev => prev.filter(r => r._rowIndex !== rowIndex));
    setSelectedRowIndices(prev => {
      const next = new Set(prev);
      next.delete(rowIndex);
      return next;
    });
    setFileStats(prev => ({ ...prev, totalRows: Math.max(0, prev.totalRows - 1) }));
    toast.info(`Removed row #${rowIndex}`);
  };

  const scrollTable = (direction) => {
    if (!tableContainerRef.current) return;
    const offset = direction === 'left' ? -380 : 380;
    tableContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  // ── Preview Computed ────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let rows = [...allRawRows];
    if (previewSearch.trim()) {
      const q = previewSearch.toLowerCase();
      rows = rows.filter(row => headers.some(h => String(row[h] || '').toLowerCase().includes(q)));
    }
    if (sortCol) {
      rows.sort((a, b) => {
        const va = String(a[sortCol] || '');
        const vb = String(b[sortCol] || '');
        const cmp = va.localeCompare(vb, undefined, { numeric: true });
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [allRawRows, previewSearch, sortCol, sortOrder, headers]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  // ── Data Analysis ───────────────────────────────────────────────────────
  const dataAnalysis = useMemo(() => {
    const emptyCells = allRawRows.reduce((count, row) => {
      return count + headers.filter(h => !row[h] || String(row[h]).trim() === '').length;
    }, 0);

    const rollHeader = Object.keys(mapping).find(k => mapping[k] === 'rollNumber');
    const duplicateRows = new Set();
    if (rollHeader) {
      const seen = new Map();
      allRawRows.forEach(r => {
        const val = r[rollHeader];
        if (val && seen.has(val)) { duplicateRows.add(r._rowIndex); duplicateRows.add(seen.get(val)); }
        else if (val) seen.set(val, r._rowIndex);
      });
    }

    return {
      totalRows: allRawRows.length,
      totalCols: headers.length,
      emptyCells,
      duplicateRows: duplicateRows.size,
      selectedRows: selectedRowIndices.size
    };
  }, [allRawRows, headers, mapping, selectedRowIndices]);

  // ── Combined Mapping (core + custom) ────────────────────────────────────
  const fullMapping = useMemo(() => {
    const combined = { ...mapping };
    Object.entries(customFieldMappings).forEach(([excelCol, customName]) => {
      if (customName) combined[excelCol] = customName;
    });
    return combined;
  }, [mapping, customFieldMappings]);

  const selectedFields = useMemo(() => {
    return [...new Set(Object.values(fullMapping).filter(Boolean))];
  }, [fullMapping]);

  // ── Template ────────────────────────────────────────────────────────────
  const handleApplyTemplate = (tplId) => {
    const found = savedTemplates.find(t => t._id === tplId);
    if (found?.columnMapping) {
      setMapping(found.columnMapping);
      toast.success(`Applied template: "${found.templateName}"`);
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) { toast.error('Template name required'); return; }
    try {
      await api.post('/import/mapping-templates', {
        templateName: newTemplateName.trim(),
        columnMapping: fullMapping,
        selectedFields,
        department: overrideDept || undefined,
        series: overrideSeries || undefined
      });
      toast.success('Template saved!');
      setSaveTemplateModal(false);
      setNewTemplateName('');
      loadMappingTemplates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save template');
    }
  };

  // ── Validate & Preview ──────────────────────────────────────────────────
  const handleValidate = async () => {
    const mappedVals = Object.values(fullMapping).filter(Boolean);
    if (!mappedVals.includes('rollNumber')) {
      toast.error('Roll Number mapping is mandatory');
      return;
    }
    if (selectedRowIndices.size === 0) {
      toast.error('Select at least one row');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post('/import/students/preview', {
        rows: allRawRows,
        mapping: fullMapping,
        selectedFields,
        duplicateMatchingField: duplicateKey,
        duplicateAction,
        importMode,
        overrides: {
          series: overrideSeries.trim(),
          department: overrideDept.trim(),
          session: overrideSession.trim()
        },
        selectedRowIndices: Array.from(selectedRowIndices)
      });
      if (res.data.success) {
        setPreviewSummary(res.data.data);
        setStep(3);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Validation failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Execute Import ──────────────────────────────────────────────────────
  const handleExecuteImport = async () => {
    setActionLoading(true);
    setImportProgress(0);

    // Simulate progress for UX
    const progressInterval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      const res = await api.post('/import/students/execute', {
        fileName: fileStats.fileName,
        fileSize: fileStats.fileSize,
        sheetName: selectedSheet,
        rows: allRawRows,
        mapping: fullMapping,
        selectedFields,
        duplicateMatchingField: duplicateKey,
        duplicateAction,
        importMode,
        overrides: {
          series: overrideSeries.trim(),
          department: overrideDept.trim(),
          session: overrideSession.trim()
        },
        selectedRowIndices: Array.from(selectedRowIndices)
      });

      clearInterval(progressInterval);
      setImportProgress(100);

      if (res.data.success) {
        setExecuteResult(res.data);
        setStep(4);
        toast.success(res.data.message || 'Import completed!');
      }
    } catch (err) {
      clearInterval(progressInterval);
      setImportProgress(0);
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setActionLoading(false);
    }
  };

  const resetAll = () => {
    setStep(0); setFile(null); setAllRawRows([]); setHeaders([]);
    setFileStats({ fileName: '', fileSize: 0, totalRows: 0, totalCols: 0 });
    setSelectedRowIndices(new Set()); setMapping({}); setCustomFieldMappings({});
    setPreviewSummary(null); setExecuteResult(null); setImportProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto pb-12">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <CloudUpload className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 dark:text-white">
              Excel Import Wizard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Dynamic column mapping · Validation · Bulk import to MongoDB
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate('/admin/import-history')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <History size={16} /> Import History
          </button>
          <button onClick={() => navigate('/admin/students')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-white transition-colors">
            <Database size={16} /> Student Database
          </button>
        </div>
      </div>

      {/* ── Step Indicator ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex items-center justify-between max-w-4xl mx-auto gap-2 py-1 overflow-x-auto">
          {STEPS.map((sName, idx) => {
            const isCompleted = idx < step;
            const isCurrent = idx === step;
            return (
              <div key={sName} className="flex items-center gap-3">
                <button type="button" disabled={idx > step}
                  onClick={() => { if (idx < step) setStep(idx); }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isCurrent ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-300 dark:ring-indigo-800'
                    : isCompleted ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 cursor-pointer'
                    : 'text-slate-400 bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    isCurrent ? 'bg-white text-indigo-600'
                    : isCompleted ? 'bg-emerald-500 text-white'
                    : 'bg-slate-300 dark:bg-slate-700 text-slate-600'}`}>
                    {isCompleted ? '✓' : idx + 1}
                  </span>
                  <span className="hidden sm:inline">{sName}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`w-8 sm:w-16 h-0.5 ${idx < step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════ STEP 0: Upload ══════════════ */}
      {step === 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={48} className="text-indigo-500 animate-spin" />
                <p className="text-slate-600 dark:text-slate-400 font-medium">Parsing Excel file...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center">
                  <FileSpreadsheet size={36} className="text-indigo-500" />
                </div>
                <div>
                  <p className="text-lg font-heading font-bold text-slate-900 dark:text-white mb-1">
                    {isDragging ? 'Drop your file here' : 'Drag & drop your Excel file'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    or <span className="text-indigo-600 dark:text-indigo-400 font-semibold">click to browse</span> · Supports .xlsx and .xls
                  </p>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span>Max 20 MB</span>
                  <span>·</span>
                  <span>Multiple sheets supported</span>
                </div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
          </div>

          {/* Download Template */}
          <div className="mt-6 flex items-center justify-center">
            <a href="#" onClick={async (e) => {
              e.preventDefault();
              try {
                const res = await api.get('/import/template', { responseType: 'blob' });
                const url = URL.createObjectURL(new Blob([res.data]));
                const a = document.createElement('a'); a.href = url;
                a.download = 'LabEval_Student_Import_Template.xlsx'; a.click();
                URL.revokeObjectURL(url);
              } catch { toast.error('Failed to download template'); }
            }} className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
              <Download size={15} /> Download import template
            </a>
          </div>
        </motion.div>
      )}

      {/* ══════════════ STEP 1: Excel Preview ══════════════ */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* File Info + Sheet Selector */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                  <FileCheck size={24} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-heading font-bold text-slate-900 dark:text-white">{fileStats.fileName}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <span>{formatBytes(fileStats.fileSize)}</span>
                    <span>·</span>
                    <span>{fileStats.totalRows} rows</span>
                    <span>·</span>
                    <span>{fileStats.totalCols} columns</span>
                    <span>·</span>
                    <span>{sheetNames.length} sheet{sheetNames.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              {sheetNames.length > 1 && (
                <div className="flex items-center gap-2">
                  <Sheet size={15} className="text-slate-400" />
                  <select value={selectedSheet} onChange={e => handleSheetChange(e.target.value)}
                    className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                    {sheetNames.map(s => {
                      const info = sheetsInfo?.find(si => si.name === s);
                      return <option key={s} value={s}>{s} {info ? `(${info.rowCount} rows)` : ''}</option>;
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* Candidate Header Row Switcher Banner */}
            {candidateHeaderRows.length > 1 && (
              <div className="mt-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-bold text-[11px] tracking-wide">
                    Header Row
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">
                    Active column titles from <strong>Row #{detectedHeaderRow}</strong> ({headers.length} columns). Switch if needed:
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {candidateHeaderRows.map(cand => (
                    <button
                      key={cand.rowIndex}
                      type="button"
                      onClick={() => handleHeaderRowChange(cand.rowIndex)}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                        (headerRowIndex === cand.rowIndex)
                          ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-700'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      Row {cand.rowNumber} ({cand.cellCount || cand.nonBlankCount} columns)
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Data Quality Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
              {[
                { label: 'Total Rows', value: dataAnalysis.totalRows, color: 'text-blue-600' },
                { label: 'Total Columns', value: headers.length, color: 'text-indigo-600' },
                { label: 'Selected Rows', value: dataAnalysis.selectedRows, color: 'text-emerald-600' },
                { label: 'Empty Cells', value: dataAnalysis.emptyCells, color: dataAnalysis.emptyCells > 0 ? 'text-amber-600' : 'text-slate-400' },
                { label: 'Duplicate Rows', value: dataAnalysis.duplicateRows, color: dataAnalysis.duplicateRows > 0 ? 'text-rose-600' : 'text-slate-400' },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
                  <p className={`text-lg font-heading font-extrabold ${item.color}`}>{item.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Preview & Dynamic Editing Table Container */}
          <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all ${
            isFullscreen ? 'fixed inset-4 z-50 rounded-2xl flex flex-col p-6 shadow-2xl bg-white dark:bg-slate-900' : 'rounded-2xl overflow-hidden'
          }`}>
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900">
              <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={previewSearch}
                    onChange={e => { setPreviewSearch(e.target.value); setPage(1); }}
                    placeholder="Search across all columns..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  Selected: <strong className="text-indigo-600 dark:text-indigo-400">{selectedRowIndices.size}</strong> of {allRawRows.length}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Dynamic Edit Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setIsEditMode(prev => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isEditMode
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400'
                      : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Pencil size={13} />
                  {isEditMode ? '✓ Editing Mode ON' : '✏️ Enable Edit Mode'}
                </button>

                {/* Add Row Button */}
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Plus size={13} /> Add Row
                </button>

                {/* Fast Horizontal Scroll Controls */}
                <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                  <button
                    type="button"
                    title="Scroll Left"
                    onClick={() => scrollTable('left')}
                    className="px-2.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1 text-xs font-medium"
                  >
                    <ChevronLeft size={14} /> <span>Left</span>
                  </button>
                  <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700" />
                  <button
                    type="button"
                    title="Scroll Right"
                    onClick={() => scrollTable('right')}
                    className="px-2.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1 text-xs font-medium"
                  >
                    <span>Right</span> <ChevronRight size={14} />
                  </button>
                </div>

                {/* Rows per page */}
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <span>Show:</span>
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
                  >
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={10000}>All ({allRawRows.length})</option>
                  </select>
                </div>

                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={() => setIsFullscreen(prev => !prev)}
                  title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
              </div>
            </div>

            {/* Scrollable Table Area with Both Left-Right and Up-Down Scrollbars */}
            <div
              ref={tableContainerRef}
              className={`overflow-x-auto overflow-y-auto border-t border-slate-200 dark:border-slate-800 ${
                isFullscreen ? 'flex-1 max-h-none' : 'max-h-[560px]'
              }`}
              style={{ scrollbarWidth: 'thin' }}
            >
              <table className="min-w-max w-full text-xs text-left border-separate border-spacing-0 bg-white dark:bg-slate-900">
                <thead className="sticky top-0 z-20 shadow-sm">
                  <tr>
                    {/* Unified Sticky Frozen Row Selector Column (Checkbox + #) */}
                    <th className="sticky left-0 top-0 z-30 bg-slate-100 dark:bg-slate-800 px-3 py-3 text-center w-[74px] min-w-[74px] max-w-[74px] border-b border-r-2 border-slate-300 dark:border-slate-700 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedRowIndices.size === allRawRows.length) setSelectedRowIndices(new Set());
                            else setSelectedRowIndices(new Set(allRawRows.map(r => r._rowIndex)));
                          }}
                          className="text-slate-500 hover:text-indigo-600"
                        >
                          {selectedRowIndices.size === allRawRows.length ? (
                            <CheckSquare size={15} className="text-indigo-600" />
                          ) : (
                            <Square size={15} />
                          )}
                        </button>
                        <span className="font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px]">#</span>
                      </div>
                    </th>

                    {/* All Dynamic Excel Columns */}
                    {headers.map((h, colIdx) => (
                      <th
                        key={h + colIdx}
                        className="sticky top-0 z-20 px-3.5 py-3 text-left cursor-pointer group select-none whitespace-nowrap min-w-[210px] border-b border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition-colors"
                        onClick={() => {
                          setSortCol(sortCol === h && sortOrder === 'desc' ? null : h);
                          setSortOrder(sortCol === h && sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                            <span>{h}</span>
                            {sortCol === h && (
                              sortOrder === 'asc' ? <ChevronUp size={13} className="text-indigo-500" /> : <ChevronDown size={13} className="text-indigo-500" />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono font-normal">C{colIdx + 1}</span>
                        </div>
                        {mapping[h] && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-800">
                            → {mapping[h]}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="bg-white dark:bg-slate-900">
                  {paginatedRows.map(row => {
                    const isSelected = selectedRowIndices.has(row._rowIndex);
                    return (
                      <tr
                        key={row._rowIndex}
                        className={`transition-colors group ${
                          isSelected
                            ? 'hover:bg-indigo-50/40 dark:hover:bg-indigo-950/25'
                            : 'opacity-40 hover:opacity-75 bg-slate-50/50 dark:bg-slate-900/50'
                        }`}
                      >
                        {/* Unified Sticky Frozen Row Selector Column (Checkbox + # + Delete) */}
                        <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-850 px-2.5 py-2 text-center w-[74px] min-w-[74px] max-w-[74px] border-b border-r-2 border-slate-200 dark:border-slate-800 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)]">
                          <div className="flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const next = new Set(selectedRowIndices);
                                next.has(row._rowIndex) ? next.delete(row._rowIndex) : next.add(row._rowIndex);
                                setSelectedRowIndices(next);
                              }}
                              className="text-slate-400 hover:text-indigo-600 shrink-0"
                            >
                              {isSelected ? <CheckSquare size={14} className="text-indigo-600" /> : <Square size={14} />}
                            </button>

                            <span className="font-mono text-xs text-slate-600 dark:text-slate-400 font-semibold flex-1 text-center">
                              {row._rowIndex}
                            </span>

                            <button
                              type="button"
                              title="Delete row"
                              onClick={() => handleDeleteRow(row._rowIndex)}
                              className="text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded shrink-0"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>

                        {/* Editable or Display Cells with Solid Background */}
                        {headers.map(h => {
                          const cellVal = row[h] ?? '';
                          return (
                            <td
                              key={h}
                              className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-slate-800 min-w-[210px] bg-white dark:bg-slate-900 group-hover:bg-slate-50/70 dark:group-hover:bg-slate-850/70"
                            >
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={cellVal}
                                  onChange={e => handleCellChange(row._rowIndex, h, e.target.value)}
                                  className="w-full px-2 py-1 text-xs rounded border border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                                />
                              ) : (
                                <div
                                  onDoubleClick={() => setIsEditMode(true)}
                                  title="Double-click to edit cell"
                                  className="truncate max-w-[240px] text-slate-800 dark:text-slate-200 font-medium py-0.5 cursor-pointer hover:text-indigo-600"
                                >
                                  {cellVal !== '' ? String(cellVal) : <span className="text-slate-300 dark:text-slate-600 italic">empty</span>}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Bar: Column count indicator & Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>↔️ Showing all <strong>{headers.length}</strong> columns</span>
                <span>·</span>
                <span>{filteredRows.length} total rows</span>
                <span>·</span>
                <span className="italic text-slate-400">Scroll right to view more columns</span>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep(0)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all"
            >
              Next: Column Mapping <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      )}

      {/* ══════════════ STEP 2: Column Mapping ══════════════ */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Override Settings */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <h3 className="text-sm font-heading font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-indigo-500" /> Import Settings & Overrides
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Department Override</label>
                <select value={overrideDept} onChange={e => setOverrideDept(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none">
                  <option value="">Auto-detect from data</option>
                  {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Series Override</label>
                <input type="text" value={overrideSeries} onChange={e => setOverrideSeries(e.target.value)} placeholder="e.g. 22, 25"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Duplicate Matching</label>
                <select value={duplicateKey} onChange={e => setDuplicateKey(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none">
                  <option value="rollNumber">Roll Number</option>
                  <option value="registrationNumber">Registration Number</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Import Mode</label>
                <select value={importMode} onChange={e => setImportMode(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none">
                  {IMPORT_MODES.map(m => <option key={m.id} value={m.id}>{m.icon} {m.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Mapping Templates */}
          {savedTemplates.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Bookmark size={15} className="text-amber-500" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Saved Templates</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {savedTemplates.map(t => (
                  <button key={t._id} onClick={() => handleApplyTemplate(t._id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors">
                    {t.templateName || t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Column Mapping Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Link2 size={16} className="text-indigo-500" /> Column Mapping
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setSaveTemplateModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <Save size={13} /> Save Template
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60">
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Excel Column</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-8">→</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Database Field</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Sample Values</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {headers.map(h => {
                    const currentMapping = mapping[h] || '';
                    const isCustom = !!customFieldMappings[h];
                    const samples = allRawRows.slice(0, 3).map(r => r[h]).filter(Boolean);
                    return (
                      <tr key={h} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet size={14} className="text-emerald-500 shrink-0" />
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{h}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {(currentMapping || isCustom) ? <Link2 size={14} className="text-indigo-500" /> : <Unlink size={14} />}
                        </td>
                        <td className="px-4 py-3">
                          {isCustom ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 text-xs font-semibold border border-violet-200 dark:border-violet-800">
                                Custom: {customFieldMappings[h]}
                              </span>
                              <button onClick={() => {
                                const next = { ...customFieldMappings };
                                delete next[h];
                                setCustomFieldMappings(next);
                              }} className="text-slate-400 hover:text-rose-500">
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <select value={currentMapping}
                                onChange={e => setMapping(prev => ({ ...prev, [h]: e.target.value }))}
                                className={`flex-1 px-3 py-2 text-sm rounded-xl border outline-none transition-colors ${
                                  currentMapping
                                    ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300'
                                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                } focus:ring-2 focus:ring-indigo-500`}>
                                {DB_FIELDS.map(f => (
                                  <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                              </select>
                              <button onClick={() => {
                                const name = prompt('Enter custom field name (e.g., fatherName, city)');
                                if (name && name.trim()) {
                                  setMapping(prev => { const next = { ...prev }; delete next[h]; return next; });
                                  setCustomFieldMappings(prev => ({ ...prev, [h]: name.trim() }));
                                }
                              }} className="px-2 py-2 rounded-lg border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors" title="Map to Custom Field">
                                <Plus size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {samples.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                                {String(s).slice(0, 25)}
                              </span>
                            ))}
                            {samples.length === 0 && <span className="text-xs text-slate-400 italic">No data</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={handleValidate} disabled={actionLoading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50">
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Validate & Preview <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      )}

      {/* ══════════════ STEP 3: Validation Summary ══════════════ */}
      {step === 3 && previewSummary && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Valid Records', value: previewSummary.summary?.validRows || 0, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', icon: CheckCircle2 },
              { label: 'New Students', value: previewSummary.summary?.newStudents || 0, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40', icon: Plus },
              { label: 'Existing', value: previewSummary.summary?.existingStudents || 0, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40', icon: Users },
              { label: 'Invalid Rows', value: previewSummary.summary?.invalidRows || 0, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/40', icon: XCircle },
              { label: 'File Duplicates', value: previewSummary.summary?.fileDuplicates || 0, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/40', icon: AlertTriangle },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className={`rounded-xl border border-slate-200 dark:border-slate-800 p-4 ${item.bg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} className={item.color} />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{item.label}</span>
                  </div>
                  <p className={`text-2xl font-heading font-extrabold ${item.color}`}>{item.value.toLocaleString()}</p>
                </div>
              );
            })}
          </div>

          {/* Import Action Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-sm font-heading font-bold text-slate-900 dark:text-white mb-4">Import Action Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm text-slate-600 dark:text-slate-400">Will Be Added</span>
                <span className="font-bold text-emerald-600">{previewSummary.summary?.willBeAdded || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm text-slate-600 dark:text-slate-400">Will Be Updated</span>
                <span className="font-bold text-blue-600">{previewSummary.summary?.willBeUpdated || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm text-slate-600 dark:text-slate-400">Will Be Skipped</span>
                <span className="font-bold text-amber-600">{previewSummary.summary?.willBeSkipped || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">Import Mode</span>
                <span className="font-bold text-slate-900 dark:text-white">{IMPORT_MODES.find(m => m.id === importMode)?.label || importMode}</span>
              </div>
            </div>
          </div>

          {/* Error Details */}
          {previewSummary.rowErrors && previewSummary.rowErrors.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-800 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-heading font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle size={16} /> Validation Errors ({previewSummary.totalErrors || previewSummary.rowErrors.length})
                </h3>
                <button
                  onClick={async () => {
                    try {
                      const res = await api.post('/import/download-error-report', {
                        errors: previewSummary.rowErrors
                      }, { responseType: 'blob' });
                      const url = URL.createObjectURL(new Blob([res.data]));
                      const a = document.createElement('a'); a.href = url;
                      a.download = `Import_Errors_${Date.now()}.xlsx`; a.click();
                      URL.revokeObjectURL(url);
                      toast.success('Downloaded error report');
                    } catch {
                      toast.error('Failed to download error report');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 transition-colors w-fit"
                >
                  <Download size={13} /> Download Error Report (.xlsx)
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {previewSummary.rowErrors.slice(0, 50).map((err, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 px-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-sm">
                    <span className="text-rose-500 font-mono text-xs shrink-0 mt-0.5">Row {err.row}</span>
                    {err.field && <span className="text-rose-600 font-semibold text-xs shrink-0">{err.field}</span>}
                    <span className="text-rose-700 dark:text-rose-400">{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <button onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              <ArrowLeft size={16} /> Back to Mapping
            </button>
            <button onClick={handleExecuteImport} disabled={actionLoading || (previewSummary.summary?.validRows === 0)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50">
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              Confirm Import
            </button>
          </div>
        </motion.div>
      )}

      {/* ══════════════ STEP 4: Import Result ══════════════ */}
      {step === 4 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center">
          {actionLoading ? (
            <div className="space-y-6">
              <Loader2 size={48} className="text-indigo-500 animate-spin mx-auto" />
              <div>
                <p className="text-lg font-heading font-bold text-slate-900 dark:text-white mb-2">Importing Students...</p>
                <div className="max-w-md mx-auto">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
                      animate={{ width: `${Math.min(importProgress, 100)}%` }} transition={{ duration: 0.3 }} />
                  </div>
                  <p className="text-sm text-slate-500 mt-2">{Math.round(importProgress)}% complete</p>
                </div>
              </div>
            </div>
          ) : executeResult ? (
            <div className="space-y-6">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center mx-auto">
                <CheckCircle2 size={40} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white mb-1">Import Completed</h2>
                <p className="text-sm text-slate-500">{executeResult.message}</p>
              </div>

              {executeResult.stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
                  {[
                    { label: 'Inserted', value: executeResult.stats.inserted, color: 'text-emerald-600' },
                    { label: 'Updated', value: executeResult.stats.updated, color: 'text-blue-600' },
                    { label: 'Skipped', value: executeResult.stats.skipped, color: 'text-amber-600' },
                    { label: 'Failed', value: executeResult.stats.failed, color: 'text-rose-600' },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                      <p className={`text-2xl font-heading font-extrabold ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-4">
                <button onClick={() => navigate('/admin/students')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all">
                  <Database size={16} /> View Student Database
                </button>
                <button onClick={resetAll}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <RefreshCw size={16} /> Import Another
                </button>
                <button onClick={() => navigate('/admin/import-history')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <History size={16} /> Import History
                </button>
              </div>
            </div>
          ) : null}
        </motion.div>
      )}

      {/* ── Save Template Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {saveTemplateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSaveTemplateModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Bookmark size={18} className="text-amber-500" /> Save Mapping Template
              </h3>
              <input type="text" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)}
                placeholder="Template name..."
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 mb-4" />
              <div className="flex gap-3">
                <button onClick={() => setSaveTemplateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                  Cancel
                </button>
                <button onClick={handleSaveTemplate}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600">
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
