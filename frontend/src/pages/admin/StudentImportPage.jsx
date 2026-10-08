import { useState, useCallback, useRef, useEffect, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight,
  ArrowLeft, Download, Play, RefreshCw, X, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  Users, AlertTriangle, Info, Loader2, FileCheck, History,
  Pencil, Search, Filter, SlidersHorizontal, Save, Bookmark,
  CheckSquare, Square, Database, Plus, CloudUpload, Sheet,
  KeyRound, ShieldCheck, Check, Sparkles
} from 'lucide-react';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

// ── Core DB Fields Definition ────────────────────────────────────────────────
const DB_FIELDS = [
  { value: '', label: '— Ignore this column —', key: null },
  { value: 'rollNumber', label: 'Student ID / Roll Number *', required: true, core: true },
  { value: 'name', label: 'Student Name *', required: true, core: true },
  { value: 'registrationNumber', label: 'Registration Number', core: true },
  { value: 'email', label: 'Student Email', core: true },
  { value: 'department', label: 'Department *', core: true },
  { value: 'series', label: 'Series *', core: true },
  { value: 'semester', label: 'Current Semester', core: true },
  { value: 'session', label: 'Academic Session', core: true },
  { value: 'contactNo', label: 'Phone / Contact No', core: true },
  { value: 'regularStatus', label: 'Regular / Irregular', core: true },
  { value: 'status', label: 'Account Status', core: true },
  { value: 'batch', label: 'Batch / Group', core: true },
  { value: 'section', label: 'Section', core: true },
  // Demographic / Profile Fields
  { value: 'nameBangla', label: 'Student Name (Bangla)' },
  { value: 'fatherName', label: "Father's Name" },
  { value: 'motherName', label: "Mother's Name" },
  { value: 'gender', label: 'Gender' },
  { value: 'bloodGroup', label: 'Blood Group' },
  { value: 'dob', label: 'Date of Birth' },
  { value: 'address', label: 'Address' },
];

const IMPORT_MODES = [
  { id: 'upsert', label: 'Add + Update (Recommended)', desc: 'Insert new students, update existing info (never resets password)' },
  { id: 'add_new', label: 'Add New Only', desc: 'Only insert students that do not already exist' },
  { id: 'update_existing', label: 'Update Existing Only', desc: 'Only update existing student records' },
];

export default function StudentImportPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const defaultUserDept = user?.departmentCode || user?.department || '';
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const tableContainerRef = useRef(null);

  // ── High-Level Step State: 0 = Upload, 1 = Review & Correct, 2 = Completed ──
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // ── Import Session & File Data ───────────────────────────────────────────
  const [file, setFile] = useState(null);
  const [importSessionId, setImportSessionId] = useState('');
  const [fileStats, setFileStats] = useState({ fileName: '', fileSize: 0, totalRows: 0, totalCols: 0 });
  const [sheetNames, setSheetNames] = useState([]);
  const [sheetsInfo, setSheetsInfo] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [headers, setHeaders] = useState([]);
  const [allRawRows, setAllRawRows] = useState([]); // COMPLETE dataset: all 61, 500, or 5000 rows!
  const [availableDepartments, setAvailableDepartments] = useState(['ETE', 'CSE', 'EEE', 'CE', 'ME', 'IPE']);

  // Overrides & Defaults
  const [overrideDept, setOverrideDept] = useState(defaultUserDept);
  const [overrideSeries, setOverrideSeries] = useState('');
  const [overrideSession, setOverrideSession] = useState('');

  // ── One-Time Mapping Modal State ─────────────────────────────────────────
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [mapping, setMapping] = useState({});
  const [customFieldMappings, setCustomFieldMappings] = useState({});
  const [duplicateKey, setDuplicateKey] = useState('rollNumber');
  const [duplicateAction, setDuplicateAction] = useState('skip');
  const [importMode, setImportMode] = useState('upsert');

  // ── Student Login Credentials Configuration (Requirements 23, 24, 25) ─────
  const [credentialConfig, setCredentialConfig] = useState({
    usernameField: 'rollNumber',
    passwordField: 'registrationNumber'
  });

  // ── Inline Corrections: { [rowIndex]: { [field]: value } } ───────────────
  const [corrections, setCorrections] = useState({});
  const [editingCell, setEditingCell] = useState(null); // { rowIndex, field }
  const [cellEditValue, setCellEditValue] = useState('');

  // ── Search, Filters, Sorting & Pagination ────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterSeries, setFilterSeries] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'valid' | 'invalid' | 'edited'
  const [sortCol, setSortCol] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Backend Preview & Validation Cache ───────────────────────────────────
  const [backendSummary, setBackendSummary] = useState(null);
  const [executeResult, setExecuteResult] = useState(null);
  const [importProgress, setImportProgress] = useState(0);

  // Sync default user department
  useEffect(() => {
    if (!overrideDept && defaultUserDept) {
      setOverrideDept(defaultUserDept);
    }
  }, [defaultUserDept]);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const res = await api.get('/departments');
      const data = res.data?.data || res.data?.departments || res.data || [];
      if (Array.isArray(data)) {
        setAvailableDepartments(data.map(d => d.code || d.departmentCode || d).filter(Boolean));
      }
    } catch { /* fallback */ }
  };

  // ── Combined Effective Mapping ───────────────────────────────────────────
  const fullMapping = useMemo(() => {
    const combined = { ...mapping };
    Object.entries(customFieldMappings).forEach(([h, customName]) => {
      if (customName) combined[h] = customName;
    });
    return combined;
  }, [mapping, customFieldMappings]);

  // Available options for Credential Field Selection
  const credentialFieldOptions = useMemo(() => {
    const list = [];
    const addedKeys = new Set();

    Object.entries(fullMapping).forEach(([excelH, dbF]) => {
      if (dbF && !addedKeys.has(dbF)) {
        addedKeys.add(dbF);
        const def = DB_FIELDS.find(f => f.value === dbF);
        list.push({
          value: dbF,
          label: `${def?.label || dbF} (from "${excelH}")`
        });
      }
    });

    if (!addedKeys.has('rollNumber')) {
      list.unshift({ value: 'rollNumber', label: 'Student ID / Roll Number (Mandatory ID)' });
    }
    return list;
  }, [fullMapping]);

  // ── File Upload & Complete Parse (Section 1 & 2) ─────────────────────────
  const processFile = async (selected) => {
    if (!selected) return;
    const ext = selected.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      toast.error('Only .xlsx and .xls files are supported');
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
        // Exact rows from backend — NEVER truncated
        const parsedRows = (d.allRows || []).map((r, idx) => ({
          ...r,
          _rowIndex: r._rowIndex || idx + 1
        }));

        setFileStats({
          fileName: d.fileName,
          fileSize: d.fileSize,
          totalRows: d.totalRows || parsedRows.length,
          totalCols: d.totalColumns || (d.headers || []).length
        });
        setSheetNames(d.sheetNames || ['Sheet1']);
        setSheetsInfo(d.sheetsInfo || []);
        setSelectedSheet(d.selectedSheet || d.sheetNames?.[0] || 'Sheet1');
        setHeaders(d.headers || []);
        setImportSessionId(d.importSessionId || '');
        setAllRawRows(parsedRows);
        setCorrections({});

        const detectedMap = d.autoMapping || {};
        setMapping(detectedMap);

        if (d.detectedSeries) {
          setOverrideSeries(d.detectedSeries);
          setOverrideSession(d.detectedSession || '');
        }
        if (d.detectedDepartment) {
          setOverrideDept(d.detectedDepartment);
        } else if (!overrideDept && defaultUserDept) {
          setOverrideDept(defaultUserDept);
        }
        if (d.availableDepartments?.length > 0) {
          setAvailableDepartments(d.availableDepartments);
        }

        // Setup credentials default
        const cred = d.credentialConfig || {
          usernameField: 'rollNumber',
          passwordField: 'registrationNumber'
        };
        setCredentialConfig(cred);

        // Move to Review Step & Open Column Mapping Modal for one-time review
        setStep(1);
        setIsMappingModalOpen(true);
        toast.success(`Excel loaded: Recognized ${d.totalRows || parsedRows.length} total rows & ${(d.headers || []).length} columns.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to parse Excel file');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Mapping Modal Close / Apply Behavior (Sections 7, 8, 9, 43, 44) ──────
  // Clicking "Apply Mapping" OR clicking "✕" / Close button:
  // MUST NOT reset import, MUST NOT delete session, MUST NOT make admin map again.
  // It simply saves the current mapping to state & backend session, closes the modal,
  // and reveals the Mapped / Edited Student Table!
  const handleCloseOrApplyMapping = async () => {
    setIsMappingModalOpen(false);

    // Persist mapping to backend session in background
    if (importSessionId) {
      try {
        await api.patch(`/import/session/${importSessionId}/mapping`, {
          mapping: fullMapping
        });
      } catch { /* non-blocking */ }
    }

    // Trigger authoritative backend preview validation
    triggerAuthoritativeValidation();
  };

  // ── Authoritative Validation Pipeline (Sections 20, 21, 47) ──────────────
  const triggerAuthoritativeValidation = async () => {
    if (!importSessionId && allRawRows.length === 0) return;
    setActionLoading(true);

    try {
      const res = await api.post('/import/students/preview', {
        importSessionId,
        rows: allRawRows,
        mapping: fullMapping,
        credentialConfig,
        corrections,
        duplicateMatchingField: duplicateKey,
        duplicateAction,
        importMode,
        overrides: {
          series: overrideSeries.trim(),
          department: (overrideDept || defaultUserDept || '').trim(),
          session: overrideSession.trim()
        }
      });

      if (res.data.success) {
        setBackendSummary(res.data.data);
      }
    } catch (err) {
      console.warn('Preview validation notice:', err.response?.data?.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Re-run validation whenever credentialConfig or mapping changes
  useEffect(() => {
    if (step === 1 && importSessionId) {
      const timer = setTimeout(() => {
        triggerAuthoritativeValidation();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [credentialConfig.usernameField, credentialConfig.passwordField, overrideDept, overrideSeries]);

  // ── Inline Cell Correction (Sections 17, 18, 19, 20) ─────────────────────
  const startCellEdit = (rowIndex, field, currentVal) => {
    setEditingCell({ rowIndex, field });
    setCellEditValue(currentVal !== undefined && currentVal !== null ? String(currentVal) : '');
  };

  const saveCellEdit = async () => {
    if (!editingCell) return;
    const { rowIndex, field } = editingCell;
    const trimmedVal = cellEditValue.trim();

    // Check if changed
    const originalRow = allRawRows.find(r => r._rowIndex === rowIndex);
    const existingVal = corrections[rowIndex]?.[field] !== undefined
      ? corrections[rowIndex][field]
      : (originalRow?.[field] ?? '');

    if (String(existingVal) !== trimmedVal) {
      // Update local state
      const nextCorrections = {
        ...corrections,
        [rowIndex]: {
          ...(corrections[rowIndex] || {}),
          [field]: trimmedVal
        }
      };
      setCorrections(nextCorrections);

      // Persist correction to backend session (Section 18)
      if (importSessionId) {
        api.patch(`/import/session/${importSessionId}/correction`, {
          rowIndex,
          field,
          value: trimmedVal
        }).catch(() => {});
      }

      toast.info(`Updated row #${rowIndex} [${field}]: "${trimmedVal}"`, { autoClose: 1800 });
      // Re-trigger live validation
      setTimeout(() => triggerAuthoritativeValidation(), 200);
    }

    setEditingCell(null);
  };

  const handleCellKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveCellEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // ── Delete Row (✕ Cross Icon) ────────────────────────────────────────────
  const handleDeleteRow = (rowIndex) => {
    const updated = allRawRows.filter(r => r._rowIndex !== rowIndex);
    // Keep sequential numbering
    const reindexed = updated.map((r, idx) => ({ ...r, _rowIndex: idx + 1 }));
    setAllRawRows(reindexed);
    setFileStats(prev => ({ ...prev, totalRows: Math.max(0, prev.totalRows - 1) }));

    // Clean up corrections for this row
    const nextCorr = { ...corrections };
    delete nextCorr[rowIndex];
    setCorrections(nextCorr);

    toast.info(`Removed row #${rowIndex}`);
    setTimeout(() => triggerAuthoritativeValidation(), 200);
  };

  // ── Add New Row at Top ───────────────────────────────────────────────────
  const handleAddNewRow = () => {
    const newRow = { _rowIndex: 1 };
    headers.forEach(h => { newRow[h] = ''; });
    const updated = [newRow, ...allRawRows].map((r, idx) => ({ ...r, _rowIndex: idx + 1 }));
    setAllRawRows(updated);
    setFileStats(prev => ({ ...prev, totalRows: prev.totalRows + 1 }));
    setPage(1);
    toast.success('Added new editable row at position #1');
    setTimeout(() => triggerAuthoritativeValidation(), 200);
  };

  // ── Effective Row Computations & Validation ──────────────────────────────
  // Resolves: Original Excel value + Manual correction = Final Display value
  const mappedRecords = useMemo(() => {
    const rollHeader = Object.keys(fullMapping).find(k => fullMapping[k] === 'rollNumber') || 'rollNumber';
    const nameHeader = Object.keys(fullMapping).find(k => fullMapping[k] === 'name') || 'name';
    const regHeader = Object.keys(fullMapping).find(k => fullMapping[k] === 'registrationNumber') || 'registrationNumber';
    const emailHeader = Object.keys(fullMapping).find(k => fullMapping[k] === 'email') || 'email';
    const deptHeader = Object.keys(fullMapping).find(k => fullMapping[k] === 'department') || 'department';
    const seriesHeader = Object.keys(fullMapping).find(k => fullMapping[k] === 'series') || 'series';
    const semHeader = Object.keys(fullMapping).find(k => fullMapping[k] === 'semester') || 'semester';

    const backendErrorMap = new Map();
    if (backendSummary?.rowErrors) {
      backendSummary.rowErrors.forEach(err => {
        if (!backendErrorMap.has(err.row)) backendErrorMap.set(err.row, []);
        backendErrorMap.get(err.row).push(err.message || `${err.field} error`);
      });
    }

    return allRawRows.map(row => {
      const rowCorr = corrections[row._rowIndex] || {};
      const getVal = (colKey, fallback = '') => {
        if (rowCorr[colKey] !== undefined) return rowCorr[colKey];
        if (row[colKey] !== undefined && row[colKey] !== null) return String(row[colKey]).trim();
        return fallback;
      };

      const rollVal = getVal(rollHeader, row.rollNumber || '');
      const nameVal = getVal(nameHeader, row.name || '');
      const regVal = getVal(regHeader, row.registrationNumber || '');
      const emailVal = getVal(emailHeader, row.email || '');
      const deptVal = getVal(deptHeader, overrideDept || row.department || defaultUserDept || '');
      const seriesVal = getVal(seriesHeader, overrideSeries || row.series || '');
      const semVal = getVal(semHeader, row.semester || '');

      // Password preview: reads from configured password field
      let passwordRaw = '';
      if (credentialConfig.passwordField === 'registrationNumber') passwordRaw = regVal;
      else if (credentialConfig.passwordField === 'rollNumber') passwordRaw = rollVal;
      else passwordRaw = getVal(credentialConfig.passwordField, '');

      // Local validation checks
      const localErrors = [];
      if (!rollVal) localErrors.push('Missing Student ID / Roll');
      if (!nameVal) localErrors.push('Missing Student Name');
      if (!deptVal) localErrors.push('Missing Department');
      if (!seriesVal) localErrors.push('Missing Series');
      if (!passwordRaw) localErrors.push(`Missing password value from "${credentialConfig.passwordField}"`);
      if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        localErrors.push('Invalid email format');
      }

      // Backend errors override/augment
      const beErrors = backendErrorMap.get(row._rowIndex) || [];
      const combinedErrors = Array.from(new Set([...localErrors, ...beErrors]));

      const isEdited = Object.keys(rowCorr).length > 0;

      return {
        _rowIndex: row._rowIndex,
        rollNumber: rollVal,
        name: nameVal,
        registrationNumber: regVal,
        email: emailVal,
        department: deptVal,
        series: seriesVal,
        semester: semVal,
        passwordPreview: passwordRaw,
        isValid: combinedErrors.length === 0,
        errors: combinedErrors,
        isEdited,
        rawHeaders: {
          rollHeader, nameHeader, regHeader, emailHeader, deptHeader, seriesHeader, semHeader
        }
      };
    });
  }, [allRawRows, fullMapping, corrections, credentialConfig, overrideDept, overrideSeries, defaultUserDept, backendSummary]);

  // ── Import Summary Calculation (Section 22) ──────────────────────────────
  const summaryStats = useMemo(() => {
    const total = mappedRecords.length;
    let valid = 0;
    let invalid = 0;
    let edited = 0;

    // Check duplicate student IDs inside mapped records
    const seenRolls = new Map();
    let duplicateCount = 0;

    mappedRecords.forEach(r => {
      if (r.isEdited) edited++;
      if (r.rollNumber) {
        if (seenRolls.has(r.rollNumber)) {
          duplicateCount++;
        } else {
          seenRolls.set(r.rollNumber, r._rowIndex);
        }
      }
      if (r.isValid) valid++;
      else invalid++;
    });

    const isReady = total > 0 && invalid === 0 && duplicateCount === 0;

    return {
      total,
      valid,
      invalid,
      duplicates: duplicateCount,
      edited,
      status: isReady ? 'Ready to Import' : 'Needs Correction'
    };
  }, [mappedRecords]);

  // ── Search, Filter & Sort ────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    let result = [...mappedRecords];

    // Search (Section 14)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r =>
        r.rollNumber.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.registrationNumber.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.series.toLowerCase().includes(q) ||
        r.semester.toLowerCase().includes(q)
      );
    }

    // Filter by Department (Section 15)
    if (filterDept !== 'all') {
      result = result.filter(r => r.department?.toUpperCase() === filterDept.toUpperCase());
    }

    // Filter by Series (Section 15)
    if (filterSeries !== 'all') {
      result = result.filter(r => r.series === filterSeries);
    }

    // Filter by Validation Status (Section 15)
    if (filterStatus === 'valid') {
      result = result.filter(r => r.isValid);
    } else if (filterStatus === 'invalid') {
      result = result.filter(r => !r.isValid);
    } else if (filterStatus === 'edited') {
      result = result.filter(r => r.isEdited);
    }

    // Sorting (Section 16)
    if (sortCol) {
      result.sort((a, b) => {
        const valA = String(a[sortCol] || '');
        const valB = String(b[sortCol] || '');
        const cmp = valA.localeCompare(valB, undefined, { numeric: true });
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [mappedRecords, searchQuery, filterDept, filterSeries, filterStatus, sortCol, sortOrder]);

  // Pagination (Section 12 & 13: Virtualized/Paged rendering without dropping data)
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    if (pageSize >= 10000) return filteredRecords;
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  // Unique series list for filter dropdown
  const uniqueSeriesList = useMemo(() => {
    const set = new Set();
    mappedRecords.forEach(r => { if (r.series) set.add(r.series); });
    return Array.from(set).sort();
  }, [mappedRecords]);

  // ── Final Confirm Import Execution (Sections 29, 30, 48) ─────────────────
  const handleConfirmImport = async () => {
    if (summaryStats.invalid > 0) {
      toast.error(`Please correct all ${summaryStats.invalid} invalid rows before confirming.`);
      return;
    }
    if (summaryStats.total === 0) {
      toast.error('No students found to import');
      return;
    }

    setActionLoading(true);
    setImportProgress(10);

    const progressTimer = setInterval(() => {
      setImportProgress(prev => (prev >= 90 ? 90 : prev + Math.floor(Math.random() * 15) + 5));
    }, 250);

    try {
      const res = await api.post('/import/students/execute', {
        importSessionId,
        fileName: fileStats.fileName,
        fileSize: fileStats.fileSize,
        sheetName: selectedSheet,
        rows: allRawRows,
        mapping: fullMapping,
        credentialConfig,
        corrections,
        duplicateMatchingField: duplicateKey,
        duplicateAction,
        importMode,
        overrides: {
          series: overrideSeries.trim(),
          department: (overrideDept || defaultUserDept || '').trim(),
          session: overrideSession.trim()
        }
      });

      clearInterval(progressTimer);
      setImportProgress(100);

      if (res.data.success) {
        setExecuteResult(res.data);
        setStep(2);
        toast.success(res.data.message || 'Students imported successfully!');
      }
    } catch (err) {
      clearInterval(progressTimer);
      setImportProgress(0);
      toast.error(err.response?.data?.message || 'Import failed. Check server logs.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Cancel Import Session (Section 44) ───────────────────────────────────
  const handleCancelImport = async () => {
    if (!window.confirm('Are you sure you want to cancel and abandon this import session?')) return;
    if (importSessionId) {
      api.delete(`/import/session/${importSessionId}`).catch(() => {});
    }
    setStep(0);
    setFile(null);
    setImportSessionId('');
    setAllRawRows([]);
    setHeaders([]);
    setCorrections({});
    setFileStats({ fileName: '', fileSize: 0, totalRows: 0, totalCols: 0 });
    setBackendSummary(null);
    setExecuteResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.info('Import session cancelled.');
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto pb-12">
      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <CloudUpload className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 dark:text-white">
              Student Excel Import
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Exact XLSX preservation · Persistent column mapping · Inline correction · Credential assignment
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate('/admin/import-history')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <History size={15} /> Import History
          </button>
          <button onClick={() => navigate('/admin/students')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-white transition-colors">
            <Database size={15} /> Student Database
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 0: UPLOAD XLSX FILE (Sections 1, 2, 3)
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <div
            ref={dropZoneRef}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={46} className="text-indigo-600 animate-spin" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Parsing complete Excel workbook & staging session...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/60 dark:to-purple-950/60 flex items-center justify-center">
                  <FileSpreadsheet size={36} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-lg font-heading font-bold text-slate-900 dark:text-white mb-1">
                    {isDragging ? 'Drop your Excel file here' : 'Upload Student Excel File'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Drag and drop or <span className="text-indigo-600 dark:text-indigo-400 font-semibold underline">browse file</span> (.xlsx, .xls)
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>Supports complete datasets (60+, 500, 5000+ students)</span>
                  <span>·</span>
                  <span>Zero truncation</span>
                </div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={(e) => processFile(e.target.files?.[0])} className="hidden" />
          </div>

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
            }} className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              <Download size={14} /> Download official student import template (.xlsx)
            </a>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 1: MAPPED & EDITABLE STUDENT TABLE (Sections 4, 11-23, 45)
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          
          {/* ── 1. Import Summary Header Bar (Section 22) ───────────────────── */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                  <FileCheck size={22} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{fileStats.fileName || 'students.xlsx'}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {formatBytes(fileStats.fileSize)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Session: <span className="font-mono text-indigo-500 font-semibold">{importSessionId.slice(0, 13)}...</span> · Complete dataset staged on server
                  </p>
                </div>
              </div>

              {/* Status Badge & Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                  summaryStats.status === 'Ready to Import'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                }`}>
                  {summaryStats.status === 'Ready to Import' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  Status: {summaryStats.status}
                </span>

                <button
                  type="button"
                  onClick={() => setIsMappingModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition-colors"
                >
                  <SlidersHorizontal size={14} /> Map Columns
                </button>

                <button
                  type="button"
                  onClick={handleCancelImport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                >
                  <X size={14} /> Cancel Import
                </button>
              </div>
            </div>

            {/* Quick Metrics Grid (Section 22) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Rows</p>
                <p className="text-xl font-heading font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {summaryStats.total}
                </p>
                <span className="text-[10px] text-slate-400">100% Recognized</span>
              </div>
              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl p-3 text-center border border-emerald-100 dark:border-emerald-900/40">
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Valid Rows</p>
                <p className="text-xl font-heading font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {summaryStats.valid}
                </p>
                <span className="text-[10px] text-emerald-600">Ready to persist</span>
              </div>
              <div className={`rounded-xl p-3 text-center border ${
                summaryStats.invalid > 0
                  ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-600'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-400'
              }`}>
                <p className="text-[11px] font-semibold uppercase tracking-wider">Invalid Rows</p>
                <p className="text-xl font-heading font-extrabold mt-0.5">{summaryStats.invalid}</p>
                <span className="text-[10px]">{summaryStats.invalid > 0 ? 'Click cell to correct' : 'Zero errors'}</span>
              </div>
              <div className={`rounded-xl p-3 text-center border ${
                summaryStats.duplicates > 0
                  ? 'bg-orange-50/70 dark:bg-orange-950/30 border-orange-200 text-orange-600'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-400'
              }`}>
                <p className="text-[11px] font-semibold uppercase tracking-wider">Duplicates</p>
                <p className="text-xl font-heading font-extrabold mt-0.5">{summaryStats.duplicates}</p>
                <span className="text-[10px]">{summaryStats.duplicates > 0 ? 'Duplicate in file' : 'None detected'}</span>
              </div>
              <div className="bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl p-3 text-center border border-indigo-100 dark:border-indigo-900/40">
                <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Edited Cells</p>
                <p className="text-xl font-heading font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {summaryStats.edited}
                </p>
                <span className="text-[10px] text-indigo-500">✎ Manual overrides</span>
              </div>
            </div>
          </div>

          {/* ── 2. Student Login Credential Assignment (Sections 23, 24, 25, 49) ── */}
          <div className="bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-slate-50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <KeyRound size={17} className="text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-heading font-bold text-slate-900 dark:text-white">
                    Student Login Credential Configuration
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                    Authoritative
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
                  Choose which imported Excel column serves as the Student Username (immutable) and which field sets their initial password. Passwords are securely hashed with bcrypt.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Username Field Dropdown */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Username Field:
                  </label>
                  <select
                    value={credentialConfig.usernameField}
                    onChange={(e) => setCredentialConfig(prev => ({ ...prev, usernameField: e.target.value }))}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {credentialFieldOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Password Field Dropdown */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Initial Password Field:
                  </label>
                  <select
                    value={credentialConfig.passwordField}
                    onChange={(e) => setCredentialConfig(prev => ({ ...prev, passwordField: e.target.value }))}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {credentialFieldOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── 3. Table Toolbar (Search, Filters, Rows Per Page, Add Row) ───── */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search Box (Section 14) */}
              <div className="relative flex-1 min-w-[260px] max-w-md">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  placeholder="Search Student ID, Name, Reg No, Email, Dept, Series..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Filtering Controls (Section 15) */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Department Filter */}
                <select
                  value={filterDept}
                  onChange={(e) => { setFilterDept(e.target.value); setPage(1); }}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Depts</option>
                  {availableDepartments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                {/* Series Filter */}
                {uniqueSeriesList.length > 0 && (
                  <select
                    value={filterSeries}
                    onChange={(e) => { setFilterSeries(e.target.value); setPage(1); }}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="all">All Series</option>
                    {uniqueSeriesList.map(s => (
                      <option key={s} value={s}>Series '{s}</option>
                    ))}
                  </select>
                )}

                {/* Validation Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Status</option>
                  <option value="valid">Valid Only ({summaryStats.valid})</option>
                  <option value="invalid">Invalid Only ({summaryStats.invalid})</option>
                  <option value="edited">Edited Only ({summaryStats.edited})</option>
                </select>

                {/* Page Size Selector */}
                <div className="flex items-center gap-1 text-xs text-slate-500 pl-2 border-l border-slate-200 dark:border-slate-700">
                  <span>Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={10000}>All ({mappedRecords.length})</option>
                  </select>
                </div>

                {/* Add Row Button */}
                <button
                  type="button"
                  onClick={handleAddNewRow}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
                >
                  <Plus size={13} /> Add Row
                </button>

                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={() => setIsFullscreen(prev => !prev)}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>
                Showing <strong>{paginatedRecords.length}</strong> of <strong>{filteredRecords.length}</strong> matching rows ({mappedRecords.length} total in import session)
              </span>
              <span className="italic text-slate-400">
                💡 Double-click any cell to edit · Press Enter to save correction
              </span>
            </div>
          </div>

          {/* ── 4. Complete Mapped & Editable Student Table (Sections 11-13, 17-21) ── */}
          <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all ${
            isFullscreen ? 'fixed inset-4 z-50 rounded-2xl flex flex-col p-6 shadow-2xl bg-white dark:bg-slate-900' : 'rounded-2xl overflow-hidden'
          }`}>
            <div
              ref={tableContainerRef}
              className={`overflow-x-auto overflow-y-auto ${isFullscreen ? 'flex-1 max-h-none' : 'max-h-[580px]'}`}
              style={{ scrollbarWidth: 'thin' }}
            >
              <table className="min-w-max w-full text-xs text-left border-separate border-spacing-0 bg-white dark:bg-slate-900">
                <thead className="sticky top-0 z-20 shadow-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <tr className="border-b border-slate-200 dark:border-slate-700 uppercase font-bold text-[10px] tracking-wider select-none">
                    <th className="sticky left-0 top-0 z-30 bg-slate-100 dark:bg-slate-800 px-3 py-3 text-center w-12 border-b border-r border-slate-200 dark:border-slate-700">
                      #
                    </th>
                    <th
                      onClick={() => { setSortCol('rollNumber'); setSortOrder(sortCol === 'rollNumber' && sortOrder === 'asc' ? 'desc' : 'asc'); }}
                      className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors border-b border-r border-slate-200 dark:border-slate-700 min-w-[130px]"
                    >
                      <div className="flex items-center justify-between">
                        <span>Student ID / Roll *</span>
                        {sortCol === 'rollNumber' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th
                      onClick={() => { setSortCol('name'); setSortOrder(sortCol === 'name' && sortOrder === 'asc' ? 'desc' : 'asc'); }}
                      className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors border-b border-r border-slate-200 dark:border-slate-700 min-w-[180px]"
                    >
                      <div className="flex items-center justify-between">
                        <span>Student Name *</span>
                        {sortCol === 'name' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th
                      onClick={() => { setSortCol('registrationNumber'); setSortOrder(sortCol === 'registrationNumber' && sortOrder === 'asc' ? 'desc' : 'asc'); }}
                      className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors border-b border-r border-slate-200 dark:border-slate-700 min-w-[140px]"
                    >
                      <div className="flex items-center justify-between">
                        <span>Registration No</span>
                        {sortCol === 'registrationNumber' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th
                      onClick={() => { setSortCol('email'); setSortOrder(sortCol === 'email' && sortOrder === 'asc' ? 'desc' : 'asc'); }}
                      className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors border-b border-r border-slate-200 dark:border-slate-700 min-w-[180px]"
                    >
                      <div className="flex items-center justify-between">
                        <span>Email</span>
                        {sortCol === 'email' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th className="px-3.5 py-3 border-b border-r border-slate-200 dark:border-slate-700 min-w-[100px]">Department</th>
                    <th className="px-3.5 py-3 border-b border-r border-slate-200 dark:border-slate-700 min-w-[80px]">Series</th>
                    <th className="px-3.5 py-3 border-b border-r border-slate-200 dark:border-slate-700 min-w-[80px]">Semester</th>
                    <th className="px-3.5 py-3 border-b border-r border-slate-200 dark:border-slate-700 min-w-[130px]">
                      Initial Password
                    </th>
                    <th className="px-3.5 py-3 border-b border-r border-slate-200 dark:border-slate-700 min-w-[150px]">Validation Status</th>
                    <th className="px-3 py-3 border-b text-center w-12">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 italic">
                        No students match the current filters or search query.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((item, idx) => {
                      const displaySeq = (page - 1) * pageSize + idx + 1;
                      const hasRowCorr = corrections[item._rowIndex] !== undefined;

                      return (
                        <tr
                          key={item._rowIndex}
                          className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-850/60 ${
                            !item.isValid ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                          }`}
                        >
                          {/* Row # */}
                          <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-2 text-center font-mono text-slate-400 font-bold border-b border-r border-slate-100 dark:border-slate-800">
                            {displaySeq}
                          </td>

                          {/* Student ID / Roll Number (Editable) */}
                          <td
                            onDoubleClick={() => startCellEdit(item._rowIndex, item.rawHeaders.rollHeader, item.rollNumber)}
                            className="px-3.5 py-2 font-mono font-bold border-b border-r border-slate-100 dark:border-slate-800 cursor-pointer"
                          >
                            {editingCell?.rowIndex === item._rowIndex && editingCell?.field === item.rawHeaders.rollHeader ? (
                              <input
                                autoFocus
                                type="text"
                                value={cellEditValue}
                                onChange={(e) => setCellEditValue(e.target.value)}
                                onBlur={saveCellEdit}
                                onKeyDown={handleCellKeyDown}
                                className="w-full px-2 py-0.5 text-xs rounded border border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                              />
                            ) : (
                              <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                                <span>{item.rollNumber || <span className="text-rose-500 italic">Empty</span>}</span>
                                {corrections[item._rowIndex]?.[item.rawHeaders.rollHeader] !== undefined && (
                                  <span className="text-[10px] text-amber-500 font-normal" title="Manually edited">✎</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Name (Editable) */}
                          <td
                            onDoubleClick={() => startCellEdit(item._rowIndex, item.rawHeaders.nameHeader, item.name)}
                            className="px-3.5 py-2 font-medium text-slate-800 dark:text-slate-200 border-b border-r border-slate-100 dark:border-slate-800 cursor-pointer"
                          >
                            {editingCell?.rowIndex === item._rowIndex && editingCell?.field === item.rawHeaders.nameHeader ? (
                              <input
                                autoFocus
                                type="text"
                                value={cellEditValue}
                                onChange={(e) => setCellEditValue(e.target.value)}
                                onBlur={saveCellEdit}
                                onKeyDown={handleCellKeyDown}
                                className="w-full px-2 py-0.5 text-xs rounded border border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                              />
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="truncate max-w-[200px]">{item.name || <span className="text-rose-500 italic">Empty</span>}</span>
                                {corrections[item._rowIndex]?.[item.rawHeaders.nameHeader] !== undefined && (
                                  <span className="text-[10px] text-amber-500 font-normal" title="Manually edited">✎</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Registration No (Editable) */}
                          <td
                            onDoubleClick={() => startCellEdit(item._rowIndex, item.rawHeaders.regHeader, item.registrationNumber)}
                            className="px-3.5 py-2 font-mono text-slate-600 dark:text-slate-300 border-b border-r border-slate-100 dark:border-slate-800 cursor-pointer"
                          >
                            {editingCell?.rowIndex === item._rowIndex && editingCell?.field === item.rawHeaders.regHeader ? (
                              <input
                                autoFocus
                                type="text"
                                value={cellEditValue}
                                onChange={(e) => setCellEditValue(e.target.value)}
                                onBlur={saveCellEdit}
                                onKeyDown={handleCellKeyDown}
                                className="w-full px-2 py-0.5 text-xs rounded border border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                              />
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span>{item.registrationNumber || <span className="text-slate-400 italic">—</span>}</span>
                                {corrections[item._rowIndex]?.[item.rawHeaders.regHeader] !== undefined && (
                                  <span className="text-[10px] text-amber-500 font-normal" title="Manually edited">✎</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Email (Editable) */}
                          <td
                            onDoubleClick={() => startCellEdit(item._rowIndex, item.rawHeaders.emailHeader, item.email)}
                            className="px-3.5 py-2 text-slate-600 dark:text-slate-300 border-b border-r border-slate-100 dark:border-slate-800 cursor-pointer"
                          >
                            {editingCell?.rowIndex === item._rowIndex && editingCell?.field === item.rawHeaders.emailHeader ? (
                              <input
                                autoFocus
                                type="text"
                                value={cellEditValue}
                                onChange={(e) => setCellEditValue(e.target.value)}
                                onBlur={saveCellEdit}
                                onKeyDown={handleCellKeyDown}
                                className="w-full px-2 py-0.5 text-xs rounded border border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                              />
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="truncate max-w-[180px]">{item.email || <span className="text-slate-400 italic">—</span>}</span>
                                {corrections[item._rowIndex]?.[item.rawHeaders.emailHeader] !== undefined && (
                                  <span className="text-[10px] text-amber-500 font-normal" title="Manually edited">✎</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Department */}
                          <td className="px-3.5 py-2 font-bold text-slate-700 dark:text-slate-300 border-b border-r border-slate-100 dark:border-slate-800">
                            {item.department}
                          </td>

                          {/* Series */}
                          <td className="px-3.5 py-2 text-slate-600 dark:text-slate-400 border-b border-r border-slate-100 dark:border-slate-800">
                            '{item.series}
                          </td>

                          {/* Semester */}
                          <td className="px-3.5 py-2 text-slate-500 border-b border-r border-slate-100 dark:border-slate-800">
                            {item.semester || '—'}
                          </td>

                          {/* Initial Password Preview (Masked / Clear on hover) */}
                          <td className="px-3.5 py-2 font-mono text-slate-500 border-b border-r border-slate-100 dark:border-slate-800">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300" title={`Initial password generated from "${credentialConfig.passwordField}"`}>
                              {item.passwordPreview ? item.passwordPreview : <span className="text-rose-500 italic">Missing</span>}
                            </span>
                          </td>

                          {/* Validation Status */}
                          <td className="px-3.5 py-2 border-b border-r border-slate-100 dark:border-slate-800">
                            {item.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <Check size={11} /> Valid
                              </span>
                            ) : (
                              <div className="flex flex-col gap-0.5" title={item.errors.join('; ')}>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 w-fit">
                                  <AlertCircle size={11} /> {item.errors[0]}
                                </span>
                                {item.errors.length > 1 && (
                                  <span className="text-[9px] text-rose-500 italic pl-1">
                                    +{item.errors.length - 1} more issue{item.errors.length > 2 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Action (Delete Row Cross) */}
                          <td className="px-3 py-2 text-center border-b border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(item._rowIndex)}
                              title={`Remove student at row #${displaySeq}`}
                              className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 p-1 rounded-md transition-colors"
                            >
                              <X size={13} className="text-rose-500 hover:scale-110 transition-transform" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
              <span className="text-xs text-slate-500">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({filteredRecords.length} records)
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── 5. Bottom Action Bar ────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <button
              type="button"
              onClick={handleCancelImport}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={15} /> Cancel Import
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {summaryStats.valid} of {summaryStats.total} students verified & ready
              </span>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={actionLoading || summaryStats.invalid > 0 || summaryStats.total === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                Confirm Import ({summaryStats.valid} Students)
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          COLUMN MAPPING MODAL (Sections 7, 8, 9, 43, 44)
          One-Time Mapping: Clicking "Apply Mapping" or "✕" Close button
          MUST NEVER reset import or ask to map again!
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isMappingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <SlidersHorizontal size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-heading font-extrabold text-slate-900 dark:text-white">
                      Column Mapping
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Match Excel columns with LabEval database fields once. Saved automatically.
                    </p>
                  </div>
                </div>

                {/* ✕ Close button: preserves mapping and displays mapped table (Section 8) */}
                <button
                  type="button"
                  onClick={handleCloseOrApplyMapping}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Close and view mapped student table"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mapping Table */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4" style={{ scrollbarWidth: 'thin' }}>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
                  <strong>Note:</strong> Closing with <span className="font-bold underline">✕</span> or clicking <span className="font-bold underline">Apply Mapping</span> saves your configuration into this import session and shows the complete review table. You will not have to map again.
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-2.5">Excel Column</th>
                        <th className="px-2 py-2.5 text-center w-8">→</th>
                        <th className="px-4 py-2.5">LabEval Field</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {headers.map(h => {
                        const currentVal = mapping[h] || '';
                        return (
                          <tr key={h} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                              <div className="flex items-center gap-2">
                                <FileSpreadsheet size={13} className="text-emerald-500 shrink-0" />
                                <span className="truncate max-w-[200px]">{h}</span>
                              </div>
                            </td>
                            <td className="px-2 py-2.5 text-center text-slate-400">→</td>
                            <td className="px-4 py-2.5">
                              <select
                                value={currentVal}
                                onChange={(e) => setMapping(prev => ({ ...prev, [h]: e.target.value }))}
                                className={`w-full px-3 py-1.5 text-xs font-semibold rounded-lg border outline-none transition-colors ${
                                  currentVal
                                    ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500'
                                }`}
                              >
                                {DB_FIELDS.map(f => (
                                  <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {Object.values(fullMapping).filter(Boolean).length} columns mapped
                </span>
                <button
                  type="button"
                  onClick={handleCloseOrApplyMapping}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all"
                >
                  <Check size={14} /> Apply Mapping & View Table
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 2: IMPORT COMPLETION RESULT (Sections 48, 49, 50)
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 2 && executeResult && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center max-w-2xl mx-auto space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={44} className="text-emerald-600" />
          </div>

          <div>
            <h2 className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white">
              Import Completed Successfully
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {executeResult.message || 'All valid student records have been written to MongoDB.'}
            </p>
          </div>

          {executeResult.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/40">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold uppercase">Created</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{executeResult.stats.inserted || 0}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/40 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/40">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold uppercase">Updated</p>
                <p className="text-2xl font-extrabold text-blue-600 mt-1">{executeResult.stats.updated || 0}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/40 rounded-2xl p-4 border border-amber-100 dark:border-amber-900/40">
                <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold uppercase">Skipped</p>
                <p className="text-2xl font-extrabold text-amber-600 mt-1">{executeResult.stats.skipped || 0}</p>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/40 rounded-2xl p-4 border border-rose-100 dark:border-rose-900/40">
                <p className="text-xs text-rose-700 dark:text-rose-300 font-semibold uppercase">Failed</p>
                <p className="text-2xl font-extrabold text-rose-600 mt-1">{executeResult.stats.failed || 0}</p>
              </div>
            </div>
          )}

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-400 space-y-1 text-left">
            <p className="font-bold text-slate-800 dark:text-slate-200">✓ Security & Immutability Guarantee:</p>
            <p>• Student accounts created with immutable username: <span className="font-mono text-indigo-500">{credentialConfig.usernameField}</span></p>
            <p>• Initial passwords hashed with Argon2id/bcrypt from field: <span className="font-mono text-indigo-500">{credentialConfig.passwordField}</span></p>
            <p>• Existing student accounts were updated safely without modifying existing passwords.</p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/admin/students')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all"
            >
              <Database size={15} /> View Student Database
            </button>
            <button
              onClick={() => {
                setStep(0);
                setFile(null);
                setImportSessionId('');
                setAllRawRows([]);
                setCorrections({});
                setBackendSummary(null);
                setExecuteResult(null);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RefreshCw size={15} /> Import Another File
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
