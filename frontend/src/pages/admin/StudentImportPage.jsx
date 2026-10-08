import { useState, useCallback, useRef, useEffect, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight,
  ArrowLeft, Download, Play, RefreshCw, X, ChevronDown,
  Maximize2, Minimize2, Users, AlertTriangle, Info, Loader2,
  FileCheck, History, Pencil, Search, Filter,
  Database, Plus, CloudUpload, KeyRound, Check, Sparkles,
  Undo2, Redo2, Trash2, MoreVertical, Lock, ShieldCheck,
  CheckCheck, Edit2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

// Field mapping aliases dictionary for auto-detection from column name
const FIELD_ALIASES = {
  rollNumber: ['roll', 'rollno', 'rollnumber', 'studentid', 'id', 'studentno', 'roll_number', 'roll_no'],
  name: ['name', 'studentname', 'fullname', 'nameofstudent', 'student_name', 'full_name'],
  registrationNumber: ['registration', 'registrationno', 'regno', 'regnumber', 'registrationnumber', 'reg_no', 'reg_number'],
  department: ['department', 'dept', 'deptcode', 'department_code'],
  series: ['series', 'batchseries', 'admissionseries', 'batch_series'],
  session: ['session', 'academicsession', 'academic_session'],
  semester: ['semester', 'currentsemester', 'level', 'term'],
  email: ['email', 'studentemail', 'emailaddress', 'email_address'],
  contactNo: ['phone', 'contact', 'contactno', 'mobile', 'cell', 'phone_number', 'mobile_no'],
  status: ['status', 'accountstatus', 'student_status'],
  section: ['section', 'sec'],
  batch: ['batch', 'group'],
  regularStatus: ['regular', 'regularity', 'regularstatus', 'regular_status'],
  fatherName: ['father', 'fathername', 'fathersname', 'father_name'],
  motherName: ['mother', 'mothername', 'mothersname', 'mother_name'],
  gender: ['gender', 'sex'],
  bloodGroup: ['blood', 'bloodgroup', 'bg', 'blood_group'],
  address: ['address', 'presentaddress', 'permanentaddress']
};

export default function StudentImportPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const fileInputRef = useRef(null);

  // ── High-Level Workflow Stage ──────────────────────────────────────────────
  // 0: Upload XLSX
  // 1: Spreadsheet Workspace (Clean, Editable Table, Delete Row/Col, Rename Col, Undo/Redo)
  // 2: Final Interactive Review & Confirm
  // 3: Import Complete
  const [stage, setStage] = useState(0);

  // Loading & File state
  const [parsingFile, setParsingFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheet, setActiveSheet] = useState('');
  const [rawWorkbook, setRawWorkbook] = useState(null);

  // Spreadsheet Staging State
  // columns: [{ id: 'col_0', name: 'Roll Number', mappedField: 'rollNumber', isUsername: true, isPassword: false }]
  const [columns, setColumns] = useState([]);
  // rows: [{ _id: 'r_0', col_0: '2205001', col_1: 'Jahid Hasan', ... }]
  const [rows, setRows] = useState([]);

  // Undo / Redo History
  const [history, setHistory] = useState({ past: [], future: [] });

  // Inline Cell Editing: { rowId, colId }
  const [editingCell, setEditingCell] = useState(null);
  const [cellEditValue, setCellEditValue] = useState('');

  // Column Renaming Modal / State: { colId, name }
  const [renamingCol, setRenamingCol] = useState(null);
  const [newColName, setNewColName] = useState('');

  // 3-dot dropdown menu active col
  const [activeMenuColId, setActiveMenuColId] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'valid' | 'errors'

  // Top-Level Configuration Defaults
  const [globalSeries, setGlobalSeries] = useState('22');
  const [globalSession, setGlobalSession] = useState('2025-26');
  const [globalDepartment, setGlobalDepartment] = useState(user?.departmentCode || 'ETE');
  const [globalSemester, setGlobalSemester] = useState('1-1');
  const [globalStatus, setGlobalStatus] = useState('active');

  // Username & Password Columns
  const [usernameColId, setUsernameColId] = useState('');
  const [passwordColId, setPasswordColId] = useState('');

  // Duplicate policy: 'skip' | 'update' | 'stop'
  const [duplicateAction, setDuplicateAction] = useState('skip');

  // Final Review & Results
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'valid' | 'invalid'
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Helper to push state into Undo history
  const pushHistory = useCallback((currentRows, currentCols) => {
    setHistory(h => ({
      past: [...h.past.slice(-25), { rows: currentRows, columns: currentCols }],
      future: []
    }));
  }, []);

  const handleUndo = useCallback(() => {
    setHistory(h => {
      if (h.past.length === 0) return h;
      const prev = h.past[h.past.length - 1];
      const newPast = h.past.slice(0, -1);
      const newFuture = [{ rows, columns }, ...h.future];

      setRows(prev.rows);
      setColumns(prev.columns);
      return { past: newPast, future: newFuture };
    });
    toast.info('Undo applied', { autoClose: 1000 });
  }, [rows, columns]);

  const handleRedo = useCallback(() => {
    setHistory(h => {
      if (h.future.length === 0) return h;
      const next = h.future[0];
      const newFuture = h.future.slice(1);
      const newPast = [...h.past, { rows, columns }];

      setRows(next.rows);
      setColumns(next.columns);
      return { past: newPast, future: newFuture };
    });
    toast.info('Redo applied', { autoClose: 1000 });
  }, [rows, columns]);

  // Keyboard shortcut Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Auto-detect mapped field from column header name
  const detectField = (name = '') => {
    const clean = String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some(a => clean.includes(a) || a.includes(clean))) {
        return field;
      }
    }
    return '';
  };

  // ── Smart Header Row Finder ────────────────────────────────────────────────
  // Detects the real header row in Excel (scans rows 0-10 for highest header score)
  const findRealHeaderIndex = (rowsArray) => {
    if (!rowsArray || rowsArray.length === 0) return 0;
    const headerKeywords = ['roll', 'id', 'name', 'student', 'reg', 'department', 'dept', 'series', 'session', 'email', 'phone'];

    let bestIndex = 0;
    let highestScore = -1;

    for (let i = 0; i < Math.min(rowsArray.length, 10); i++) {
      const row = rowsArray[i] || [];
      let score = 0;
      row.forEach(cell => {
        const str = String(cell || '').toLowerCase().trim();
        if (headerKeywords.some(kw => str.includes(kw))) {
          score += 10;
        }
        // If it looks like actual student data (e.g. 2205001 or email), penalize header score
        if (/^\d{6,8}$/.test(str)) score -= 5;
      });

      if (score > highestScore) {
        highestScore = score;
        bestIndex = i;
      }
    }

    return highestScore >= 10 ? bestIndex : 0;
  };

  // ── Process Uploaded Excel File ───────────────────────────────────────────
  const processUploadedFile = async (fileObj) => {
    if (!fileObj) return;
    setParsingFile(true);
    setFileName(fileObj.name);
    setFileSize(fileObj.size);

    try {
      const buffer = await fileObj.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      setRawWorkbook(workbook);

      const sheets = workbook.SheetNames || [];
      setSheetNames(sheets);

      const firstSheet = sheets[0];
      setActiveSheet(firstSheet);
      loadSheetData(workbook, firstSheet, fileObj.name);
    } catch (err) {
      console.error('File parsing error:', err);
      toast.error('Failed to parse file: ' + err.message);
    } finally {
      setParsingFile(false);
    }
  };

  const loadSheetData = (wb, sheetName, currentFileName = fileName) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    // Convert sheet to 2D array of rows
    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
    if (!rawData || rawData.length === 0) {
      toast.warning('The selected sheet is empty');
      return;
    }

    // 1. Detect Real Header Row Index
    const headerRowIdx = findRealHeaderIndex(rawData);
    const headerRow = rawData[headerRowIdx] || [];
    const dataRows = rawData.slice(headerRowIdx + 1);

    // 2. Build Columns
    let autoUserColId = '';
    let autoPassColId = '';

    const newColumns = headerRow.map((hdr, idx) => {
      const colName = String(hdr || '').trim() || `Column ${idx + 1}`;
      const mapped = detectField(colName);
      const colId = `col_${idx}`;

      if (mapped === 'rollNumber' && !autoUserColId) autoUserColId = colId;
      if (mapped === 'registrationNumber' && !autoPassColId) autoPassColId = colId;

      return {
        id: colId,
        name: colName,
        mappedField: mapped
      };
    });

    if (!autoUserColId && newColumns.length > 0) autoUserColId = newColumns[0].id;
    if (!autoPassColId && autoUserColId) autoPassColId = autoUserColId;

    setUsernameColId(autoUserColId);
    setPasswordColId(autoPassColId);

    // 3. Build Data Rows & Filter out duplicate header-like rows
    const headerWords = new Set(['roll', 'roll number', 'student id', 'name', 'student name', 'registration', 'reg no']);

    const newRows = [];
    dataRows.forEach((rowArr, rIdx) => {
      // Check if this row is just another header row (e.g. repeated "Roll Number", "Student Name")
      const firstCell = String(rowArr[0] || '').toLowerCase().trim();
      const secondCell = String(rowArr[1] || '').toLowerCase().trim();

      if (headerWords.has(firstCell) || headerWords.has(secondCell)) {
        // Skip header duplicate row
        return;
      }

      // Check if entire row is empty
      const isBlank = rowArr.every(c => String(c || '').trim() === '');
      if (isBlank) return;

      const rowObj = { _id: `r_${rIdx}` };
      newColumns.forEach((col, cIdx) => {
        rowObj[col.id] = String(rowArr[cIdx] !== undefined ? rowArr[cIdx] : '').trim();
      });
      newRows.push(rowObj);
    });

    // Auto-detect series from filename or first roll
    const nameMatch = currentFileName.match(/(\d{2})/);
    if (nameMatch) {
      setGlobalSeries(nameMatch[1]);
      setGlobalSession(`20${nameMatch[1]}-${parseInt(nameMatch[1], 10) + 1}`);
    } else if (newRows.length > 0 && autoUserColId) {
      const firstVal = String(newRows[0][autoUserColId] || '');
      if (/^\d{2}/.test(firstVal)) {
        const sVal = firstVal.slice(0, 2);
        setGlobalSeries(sVal);
        setGlobalSession(`20${sVal}-${parseInt(sVal, 10) + 1}`);
      }
    }

    setColumns(newColumns);
    setRows(newRows);
    setHistory({ past: [], future: [] });
    setStage(1);
    toast.success(`Loaded ${newRows.length} students & ${newColumns.length} columns from "${sheetName}"`);
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files?.[0]) processUploadedFile(files[0]);
  };

  // ── Row Management: Delete, Add ───────────────────────────────────────────
  const handleDeleteRow = (rowId) => {
    pushHistory(rows, columns);
    setRows(prev => prev.filter(r => r._id !== rowId));
    toast.info('Row removed (Undo available)', { autoClose: 1500 });
  };

  const handleAddRow = () => {
    pushHistory(rows, columns);
    const newId = `r_new_${Date.now()}`;
    const newRow = { _id: newId };
    columns.forEach(c => { newRow[c.id] = ''; });
    setRows(prev => [newRow, ...prev]);
    toast.success('New blank row added at top. Click to edit cells.');
  };

  const handleDeleteEmptyRows = () => {
    pushHistory(rows, columns);
    const beforeCount = rows.length;
    const nonEmpty = rows.filter(r => columns.some(c => String(r[c.id] || '').trim() !== ''));
    setRows(nonEmpty);
    toast.info(`Removed ${beforeCount - nonEmpty.length} empty rows`);
  };

  // ── Column Management: Remove, Rename, Menu ───────────────────────────────
  const handleDeleteColumn = (colId) => {
    if (columns.length <= 1) {
      toast.warning('Cannot delete the last column');
      return;
    }
    pushHistory(rows, columns);
    setColumns(prev => prev.filter(c => c.id !== colId));
    if (usernameColId === colId) setUsernameColId('');
    if (passwordColId === colId) setPasswordColId('');
    toast.info('Column removed from workspace', { autoClose: 1500 });
    setActiveMenuColId(null);
  };

  const handleStartRename = (col) => {
    setRenamingCol(col);
    setNewColName(col.name);
    setActiveMenuColId(null);
  };

  const handleSaveRename = () => {
    if (!renamingCol || !newColName.trim()) return;
    pushHistory(rows, columns);
    const updatedName = newColName.trim();
    const newMapped = detectField(updatedName);

    setColumns(prev => prev.map(c => {
      if (c.id === renamingCol.id) {
        return { ...c, name: updatedName, mappedField: newMapped || c.mappedField };
      }
      return c;
    }));

    setRenamingCol(null);
    toast.success(`Renamed column to "${updatedName}"`);
  };

  // ── Cell Editing ───────────────────────────────────────────────────────────
  const handleStartCellEdit = (rowId, colId, value) => {
    setEditingCell({ rowId, colId });
    setCellEditValue(value || '');
  };

  const handleSaveCellEdit = () => {
    if (!editingCell) return;
    const { rowId, colId } = editingCell;
    const currentRow = rows.find(r => r._id === rowId);

    if (currentRow && currentRow[colId] !== cellEditValue) {
      pushHistory(rows, columns);
      setRows(prev => prev.map(r => r._id === rowId ? { ...r, [colId]: cellEditValue.trim() } : r));
    }
    setEditingCell(null);
  };

  // ── Data Validation ────────────────────────────────────────────────────────
  const rollCol = useMemo(() => columns.find(c => c.id === usernameColId) || columns.find(c => c.mappedField === 'rollNumber'), [columns, usernameColId]);
  const nameCol = useMemo(() => columns.find(c => c.mappedField === 'name'), [columns]);

  const validateRow = useCallback((row) => {
    const errors = [];
    const rollVal = rollCol ? String(row[rollCol.id] || '').trim() : '';
    const nameVal = nameCol ? String(row[nameCol.id] || '').trim() : '';

    if (!rollVal) errors.push('Student ID / Roll missing');
    if (!nameVal) errors.push('Student Name missing');

    return { isValid: errors.length === 0, errors };
  }, [rollCol, nameCol]);

  // Filtered rows for Spreadsheet
  const filteredSpreadsheetRows = useMemo(() => {
    let list = rows;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => columns.some(c => String(r[c.id] || '').toLowerCase().includes(q)));
    }
    if (filterType === 'valid') {
      list = list.filter(r => validateRow(r).isValid);
    } else if (filterType === 'errors') {
      list = list.filter(r => !validateRow(r).isValid);
    }
    return list;
  }, [rows, columns, searchQuery, filterType, validateRow]);

  // ── Step 2: Final Review Generation ────────────────────────────────────────
  const handleProceedToReview = () => {
    if (!rollCol) {
      toast.error('Please make sure a Student ID / Roll column exists');
      return;
    }
    if (!nameCol) {
      toast.error('Please make sure a Student Name column exists (Rename any column to "Name" if needed)');
      return;
    }
    if (rows.length === 0) {
      toast.error('Spreadsheet is empty');
      return;
    }

    setStage(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Normalized Student List for Review
  const normalizedReviewList = useMemo(() => {
    const regCol = columns.find(c => c.mappedField === 'registrationNumber') || columns.find(c => c.id === passwordColId);
    const deptCol = columns.find(c => c.mappedField === 'department');
    const seriesCol = columns.find(c => c.mappedField === 'series');
    const emailCol = columns.find(c => c.mappedField === 'email');
    const phoneCol = columns.find(c => c.mappedField === 'contactNo');

    return rows.map((r, idx) => {
      const roll = rollCol ? String(r[rollCol.id] || '').trim() : '';
      const name = nameCol ? String(r[nameCol.id] || '').trim() : '';
      const reg = regCol ? String(r[regCol.id] || '').trim() : roll;
      const dept = deptCol && String(r[deptCol.id] || '').trim() ? String(r[deptCol.id]).trim().toUpperCase() : globalDepartment;
      const series = seriesCol && String(r[seriesCol.id] || '').trim() ? String(r[seriesCol.id]).trim() : globalSeries;
      const email = emailCol ? String(r[emailCol.id] || '').trim() : '';
      const phone = phoneCol ? String(r[phoneCol.id] || '').trim() : '';

      const username = roll;
      const rawPassword = reg || roll;

      const isValid = Boolean(roll && name && rawPassword);

      return {
        _id: r._id,
        index: idx + 1,
        roll,
        name,
        reg,
        dept,
        series,
        session: globalSession,
        email,
        phone,
        username,
        rawPassword,
        isValid
      };
    });
  }, [rows, rollCol, nameCol, passwordColId, columns, globalDepartment, globalSeries, globalSession]);

  const filteredReviewList = useMemo(() => {
    let list = normalizedReviewList;
    if (reviewSearch.trim()) {
      const q = reviewSearch.toLowerCase().trim();
      list = list.filter(item => item.roll.toLowerCase().includes(q) || item.name.toLowerCase().includes(q) || item.reg.toLowerCase().includes(q));
    }
    if (reviewFilter === 'valid') list = list.filter(item => item.isValid);
    if (reviewFilter === 'invalid') list = list.filter(item => !item.isValid);
    return list;
  }, [normalizedReviewList, reviewSearch, reviewFilter]);

  const validCount = useMemo(() => normalizedReviewList.filter(s => s.isValid).length, [normalizedReviewList]);

  // ── Step 3: Confirm & Execute Import to MongoDB ────────────────────────────
  const handleConfirmImport = async () => {
    setIsConfirmModalOpen(false);
    setLoading(true);

    try {
      // Build mapping dictionary
      const mappingDict = {
        rollNumber: 'rollNumber',
        name: 'name',
        registrationNumber: 'registrationNumber',
        department: 'department',
        series: 'series',
        session: 'session'
      };
      columns.forEach(c => {
        if (c.mappedField) mappingDict[c.name] = c.mappedField;
      });

      // Filter only student rows that have at least student roll/name (skip blank trailing rows)
      const targetRows = rows.filter(r => {
        const rollVal = rollCol ? String(r[rollCol.id] || '').trim() : '';
        const nameVal = nameCol ? String(r[nameCol.id] || '').trim() : '';
        return rollVal !== '' && nameVal !== '';
      });

      // Prepare rows with column names and canonical db fields
      const regCol = columns.find(c => c.mappedField === 'registrationNumber') || columns.find(c => c.id === passwordColId);

      const rawRowsToSend = targetRows.map((r, idx) => {
        const item = { _rowIndex: idx + 1 };
        columns.forEach(c => {
          const val = String(r[c.id] || '').trim();
          item[c.name] = val;
          if (c.mappedField) item[c.mappedField] = val;
        });

        // Ensure canonical fields are set
        if (rollCol) item.rollNumber = String(r[rollCol.id] || '').trim();
        if (nameCol) item.name = String(r[nameCol.id] || '').trim();
        if (regCol) {
          item.registrationNumber = String(r[regCol.id] || '').trim();
        } else if (rollCol) {
          item.registrationNumber = String(r[rollCol.id] || '').trim();
        }

        return item;
      });

      const userTargetField = 'rollNumber';
      const passTargetField = regCol ? 'registrationNumber' : 'rollNumber';

      const payload = {
        fileName: fileName || 'students.xlsx',
        fileSize,
        sheetName: activeSheet,
        rows: rawRowsToSend,
        mapping: mappingDict,
        credentialConfig: {
          usernameField: userTargetField,
          passwordField: passTargetField
        },
        duplicateMatchingFields: ['rollNumber'],
        duplicateAction,
        overrides: {
          department: globalDepartment,
          series: globalSeries,
          session: globalSession,
          semester: globalSemester,
          status: globalStatus
        }
      };

      const res = await api.post('/import/students/execute', payload);

      if (res.data?.success) {
        setImportResult(res.data);
        setStage(3);
        toast.success(res.data.message || 'Import completed successfully!');
      } else {
        throw new Error(res.data?.message || 'Import failed');
      }
    } catch (err) {
      console.error('Import error:', err);
      toast.error(err.response?.data?.message || err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: STAGE 0 — UPLOAD
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-10 flex flex-col items-center justify-center">
        <div className="max-w-2xl w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Import Students from Excel
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Drop your .xlsx or .xls file below to visually inspect, edit, and clean student records.
            </p>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all bg-white dark:bg-slate-900 ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 ring-4 ring-indigo-500/10'
                : 'border-slate-300 dark:border-slate-800 hover:border-indigo-400 hover:shadow-lg'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && processUploadedFile(e.target.files[0])}
            />

            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                {parsingFile ? <Loader2 className="w-8 h-8 animate-spin" /> : <CloudUpload className="w-8 h-8" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {parsingFile ? 'Reading spreadsheet...' : 'Click to select or drag & drop Excel file'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Microsoft Excel (.xlsx, .xls)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: STAGE 1 — CLEAN, SIMPLE & POWERFUL SPREADSHEET WORKSPACE
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === 1) {
    return (
      <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 ${isFullscreen ? 'fixed inset-0 z-50 overflow-auto' : 'p-4 md:p-6'}`}>
        <div className="max-w-[1700px] mx-auto space-y-3">

          {/* ── Top Header Toolbar ──────────────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            {/* File info & sheet */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs">{fileName}</h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    {rows.length} rows • {columns.length} columns
                  </span>
                </div>
                {sheetNames.length > 1 && (
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="text-slate-400">Sheet:</span>
                    <select
                      value={activeSheet}
                      onChange={(e) => rawWorkbook && loadSheetData(rawWorkbook, e.target.value)}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                    >
                      {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Middle Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleUndo}
                disabled={history.past.length === 0}
                title="Undo (Ctrl+Z)"
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 disabled:opacity-30"
              >
                <Undo2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              </button>
              <button
                onClick={handleRedo}
                disabled={history.future.length === 0}
                title="Redo (Ctrl+Y)"
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 disabled:opacity-30"
              >
                <Redo2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              </button>

              <button
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-500" />
                <span>Add Row</span>
              </button>

              <button
                onClick={handleDeleteEmptyRows}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Clear Empty Rows
              </button>

              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Search and Primary Continue Button */}
            <div className="flex items-center gap-3">
              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search in table..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={handleProceedToReview}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
              >
                <span>Continue to Review ({rows.length})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Minimalist Clean Spreadsheet Grid ───────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-3">
                <span>💡 Click any cell to edit</span>
                <span>• Click <span className="font-bold text-rose-500">✕</span> on row/column to delete</span>
                <span>• Click <span className="font-bold">⋮</span> on column to rename</span>
              </div>
              <div>
                <span>Showing {filteredSpreadsheetRows.length} rows</span>
              </div>
            </div>

            <div className="overflow-auto" style={{ maxHeight: isFullscreen ? 'calc(100vh - 170px)' : '640px' }}>
              <table className="w-full border-collapse text-left select-text text-xs" style={{ minWidth: `${columns.length * 160 + 80}px` }}>
                {/* ── Table Header ────────────────────────────────────────── */}
                <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    {/* Sticky Corner / Row Number Header */}
                    <th className="sticky left-0 z-30 bg-slate-200 dark:bg-slate-800 w-16 px-2 py-2.5 text-center font-bold text-slate-500 border-r border-slate-300 dark:border-slate-700">
                      #
                    </th>

                    {/* Columns: NO DROPDOWNS! Just clean Column Name + ✕ delete icon + ⋮ menu */}
                    {columns.map((col) => {
                      const isUser = col.id === usernameColId;
                      const isPass = col.id === passwordColId;

                      return (
                        <th
                          key={col.id}
                          className={`px-3 py-2.5 border-r border-slate-200 dark:border-slate-700 ${
                            isUser ? 'bg-indigo-50/60 dark:bg-indigo-950/40' : isPass ? 'bg-emerald-50/60 dark:bg-emerald-950/40' : ''
                          }`}
                          style={{ minWidth: '160px' }}
                        >
                          <div className="flex items-center justify-between gap-1 group">
                            {/* Column Name */}
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate" title={col.name}>
                                {col.name}
                              </span>
                              {isUser && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500 text-white shrink-0">
                                  USER
                                </span>
                              )}
                              {isPass && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500 text-white shrink-0">
                                  PASS
                                </span>
                              )}
                            </div>

                            {/* Header Actions: ✕ delete + ⋮ 3-dot menu */}
                            <div className="flex items-center gap-1 shrink-0">
                              {/* 3-Dot Menu */}
                              <div className="relative">
                                <button
                                  onClick={() => setActiveMenuColId(activeMenuColId === col.id ? null : col.id)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                                  title="Column Options"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {activeMenuColId === col.id && (
                                  <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 text-left text-xs">
                                    <button
                                      onClick={() => handleStartRename(col)}
                                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 font-medium"
                                    >
                                      <Pencil className="w-3.5 h-3.5 text-indigo-500" /> Rename Column
                                    </button>
                                    <button
                                      onClick={() => {
                                        setUsernameColId(col.id);
                                        toast.success(`Set "${col.name}" as Username column`);
                                        setActiveMenuColId(null);
                                      }}
                                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 font-medium text-indigo-600"
                                    >
                                      <KeyRound className="w-3.5 h-3.5" /> Use as Username
                                    </button>
                                    <button
                                      onClick={() => {
                                        setPasswordColId(col.id);
                                        toast.success(`Set "${col.name}" as Password column`);
                                        setActiveMenuColId(null);
                                      }}
                                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 font-medium text-emerald-600"
                                    >
                                      <Lock className="w-3.5 h-3.5" /> Use as Password
                                    </button>
                                    <div className="my-1 border-t border-slate-100 dark:border-slate-700"></div>
                                    <button
                                      onClick={() => handleDeleteColumn(col.id)}
                                      className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-semibold"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Remove Column
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Single Cross Icon ✕ to remove column immediately */}
                              <button
                                onClick={() => handleDeleteColumn(col.id)}
                                className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title="Remove column"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                {/* ── Table Body ─────────────────────────────────────────── */}
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSpreadsheetRows.map((row, rIdx) => {
                    const validation = validateRow(row);

                    return (
                      <tr
                        key={row._id}
                        className={`hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 group transition-colors ${
                          !validation.isValid ? 'bg-rose-50/20' : ''
                        }`}
                      >
                        {/* Sticky Row # and ✕ Remove Entire Row Button */}
                        <td className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/95 px-2 py-2 text-center border-r border-slate-200 dark:border-slate-700 w-16">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-slate-400 text-[11px]">{rIdx + 1}</span>
                            {/* Single ✕ icon to delete entire row with 1 click! */}
                            <button
                              onClick={() => handleDeleteRow(row._id)}
                              className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1 rounded transition-colors"
                              title="Delete entire row"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Cell Values */}
                        {columns.map((col) => {
                          const isEditing = editingCell?.rowId === row._id && editingCell?.colId === col.id;
                          const cellVal = row[col.id] || '';

                          return (
                            <td
                              key={col.id}
                              onClick={() => !isEditing && handleStartCellEdit(row._id, col.id, cellVal)}
                              className={`px-3 py-2 border-r border-slate-100 dark:border-slate-800 cursor-cell truncate font-mono text-[11px] ${
                                isEditing ? 'p-0 ring-2 ring-indigo-500 bg-white dark:bg-slate-900 z-10' : ''
                              }`}
                              style={{ maxWidth: '220px' }}
                            >
                              {isEditing ? (
                                <input
                                  type="text"
                                  autoFocus
                                  value={cellEditValue}
                                  onChange={(e) => setCellEditValue(e.target.value)}
                                  onBlur={handleSaveCellEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveCellEdit();
                                    else if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  className="w-full h-full px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-none outline-none font-mono"
                                />
                              ) : (
                                <span className={cellVal ? 'text-slate-800 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600 italic'}>
                                  {cellVal || 'empty'}
                                </span>
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
          </div>
        </div>

        {/* ── Column Rename Modal ─────────────────────────────────────────── */}
        <AnimatePresence>
          {renamingCol && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full space-y-4 shadow-xl">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Rename Column</h3>
                <input
                  type="text"
                  autoFocus
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setRenamingCol(null)}
                    className="px-3 py-1.5 text-xs rounded-lg text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRename}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: STAGE 2 — GORGEOUS, INTERACTIVE FINAL DATA REVIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === 2) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Top Review Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ready for Verification</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Final Review & Student Roster
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Cross-check the clean student records before committing them to the MongoDB database.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStage(1)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
              >
                ← Edit in Spreadsheet
              </button>

              <button
                onClick={() => setIsConfirmModalOpen(true)}
                disabled={validCount === 0 || loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Import ({validCount} Students)</span>
              </button>
            </div>
          </div>

          {/* Configuration Summary Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-[11px] font-semibold text-slate-400">TOTAL STUDENTS</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{normalizedReviewList.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900">
              <p className="text-[11px] font-semibold text-emerald-600">VERIFIED VALID</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{validCount}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-[11px] font-semibold text-slate-400">DEPARTMENT & SERIES</p>
              <p className="text-lg font-bold text-indigo-600 mt-1">{globalDepartment} • Series {globalSeries}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-[11px] font-semibold text-slate-400">PASSWORD POLICY</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2">Hashed with Bcrypt (Salt 10)</p>
            </div>
          </div>

          {/* Interactive Table Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Table Search & Filter Bar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by roll, name, reg..."
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReviewFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    reviewFilter === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  All ({normalizedReviewList.length})
                </button>
                <button
                  onClick={() => setReviewFilter('valid')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    reviewFilter === 'valid' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  Valid ({validCount})
                </button>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold text-[11px]">
                  <tr>
                    <th className="px-4 py-2.5">#</th>
                    <th className="px-4 py-2.5">Student ID (Roll)</th>
                    <th className="px-4 py-2.5">Student Name</th>
                    <th className="px-4 py-2.5">Reg. No</th>
                    <th className="px-4 py-2.5">Department</th>
                    <th className="px-4 py-2.5">Series</th>
                    <th className="px-4 py-2.5">Session</th>
                    <th className="px-4 py-2.5">Initial Password</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredReviewList.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-[11px]">{item.index}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{item.roll}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                          {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span>{item.name}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-300">{item.reg || '—'}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300">{item.dept}</td>
                      <td className="px-4 py-2.5">{item.series}</td>
                      <td className="px-4 py-2.5 text-slate-500">{item.session}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-400">•••••••• (valid)</td>
                      <td className="px-4 py-2.5 text-center">
                        {item.isValid ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            READY
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            INVALID
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Confirm Modal ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {isConfirmModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 mx-auto">
                  <Database className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Confirm Student Import
                  </h3>
                  <p className="text-xs text-slate-500 mt-2">
                    Are you sure? <span className="font-bold text-emerald-600">{validCount} students</span> will be saved into the database and their central user accounts will be created.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Confirm Import</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: STAGE 3 — COMPLETE
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center justify-center">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 mx-auto">
          <CheckCheck className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Import Complete!</h2>
          <p className="text-xs text-slate-500 mt-1">Students have been saved and accounts are active.</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-semibold text-slate-400">INSERTED</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">{importResult?.stats?.inserted ?? 0}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-semibold text-slate-400">UPDATED</p>
            <p className="text-xl font-bold text-indigo-600 mt-0.5">{importResult?.stats?.updated ?? 0}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-semibold text-slate-400">SKIPPED</p>
            <p className="text-xl font-bold text-amber-600 mt-0.5">{importResult?.stats?.skipped ?? 0}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => {
              setStage(0);
              setRows([]);
              setColumns([]);
            }}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            Import Another File
          </button>
          <button
            onClick={() => navigate('/admin/students')}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
          >
            View Students →
          </button>
        </div>
      </div>
    </div>
  );
}
