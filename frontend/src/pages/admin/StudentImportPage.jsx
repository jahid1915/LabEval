import { useState, useCallback, useRef, useEffect, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight,
  ArrowLeft, Download, Play, RefreshCw, X, ChevronDown, ChevronUp,
  Maximize2, Minimize2, Users, AlertTriangle, Info, Loader2,
  FileCheck, History, Pencil, Search, Filter, SlidersHorizontal,
  CheckSquare, Square, Database, Plus, CloudUpload, KeyRound,
  ShieldCheck, Check, Sparkles, Undo2, Redo2, Trash2, MoreVertical,
  ArrowLeftRight, Copy, CheckCheck, Eye, EyeOff, ShieldAlert,
  HelpCircle, Settings, Layers, Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

// ── Database Target Fields ───────────────────────────────────────────────────
const DB_TARGET_FIELDS = [
  { value: '', label: '— Ignore Column —', color: 'text-slate-400' },
  { value: 'rollNumber', label: 'Student ID / Roll Number *', required: true, icon: '🎓', color: 'text-indigo-600 font-semibold' },
  { value: 'name', label: 'Student Name *', required: true, icon: '👤', color: 'text-emerald-600 font-semibold' },
  { value: 'registrationNumber', label: 'Registration Number', icon: '📝', color: 'text-cyan-600' },
  { value: 'department', label: 'Department *', required: true, icon: '🏢', color: 'text-purple-600' },
  { value: 'series', label: 'Series / Batch *', required: true, icon: '🏷️', color: 'text-amber-600' },
  { value: 'session', label: 'Academic Session', icon: '📅', color: 'text-blue-600' },
  { value: 'semester', label: 'Current Semester', icon: '📚', color: 'text-teal-600' },
  { value: 'email', label: 'Student Email', icon: '✉️', color: 'text-sky-600' },
  { value: 'contactNo', label: 'Phone / Contact No', icon: '📞', color: 'text-emerald-600' },
  { value: 'regularStatus', label: 'Regular / Irregular', icon: '⚖️', color: 'text-slate-600' },
  { value: 'status', label: 'Account Status', icon: '🟢', color: 'text-slate-600' },
  { value: 'section', label: 'Section (A/B)', icon: '🔤', color: 'text-slate-600' },
  { value: 'batch', label: 'Batch / Group', icon: '👥', color: 'text-slate-600' },
  { value: 'nameBangla', label: 'Name (Bangla)', icon: '🇧🇩', color: 'text-slate-600' },
  { value: 'fatherName', label: "Father's Name", icon: '👨', color: 'text-slate-600' },
  { value: 'motherName', label: "Mother's Name", icon: '👩', color: 'text-slate-600' },
  { value: 'gender', label: 'Gender', icon: '⚧️', color: 'text-slate-600' },
  { value: 'bloodGroup', label: 'Blood Group', icon: '🩸', color: 'text-rose-600' },
  { value: 'dob', label: 'Date of Birth', icon: '🎂', color: 'text-slate-600' },
  { value: 'address', label: 'Address', icon: '🏠', color: 'text-slate-600' },
];

const SEMESTER_OPTIONS = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];
const ROW_HEIGHT = 40; // Pixels per row for virtualized table

export default function StudentImportPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const fileInputRef = useRef(null);
  const gridContainerRef = useRef(null);

  // ── High-Level Workflow Stage ──────────────────────────────────────────────
  // 0: Upload XLSX
  // 1: Interactive Spreadsheet Workspace (Edit, Delete, Map, Reorder, Undo/Redo)
  // 2: Import Configuration & Duplicate Detection
  // 3: Final Review & Cross-Check (Normalized Table, Checklist, Confirm)
  // 4: Execution Summary & Results
  const [stage, setStage] = useState(0);

  // ── Loading & Upload State ─────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // File metadata
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheet, setActiveSheet] = useState('');
  const [rawWorkbook, setRawWorkbook] = useState(null);

  // ── Staging Spreadsheet State ──────────────────────────────────────────────
  // columns: [{ id: 'col_0', letter: 'A', name: 'Roll', mappedField: 'rollNumber', isUsername: true, isPassword: false, isDuplicateKey: true, dataType: 'text' }]
  const [columns, setColumns] = useState([]);
  // rows: [{ _id: 'r_0', col_0: '2203001', col_1: 'Jahid Hasan', ... }]
  const [rows, setRows] = useState([]);
  // Original snapshot for reset
  const [originalSnapshot, setOriginalSnapshot] = useState({ columns: [], rows: [] });

  // History for Undo / Redo
  const [history, setHistory] = useState({ past: [], future: [] });

  // Modified cells tracking: Set of "rowId:colId"
  const [modifiedCells, setModifiedCells] = useState(new Set());

  // Selection
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());

  // Active Cell Editing
  const [editingCell, setEditingCell] = useState(null); // { rowId, colId }
  const [editValue, setEditValue] = useState('');

  // Column Menu dropdown active
  const [activeColMenu, setActiveColMenu] = useState(null);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'valid' | 'errors' | 'duplicates' | 'modified'

  // Virtualized Scroll tracking
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(550);

  // ── Top-Level Import Configuration ─────────────────────────────────────────
  const [globalSeries, setGlobalSeries] = useState('22');
  const [seriesSource, setSeriesSource] = useState('global'); // 'global' | 'column'

  const [globalSession, setGlobalSession] = useState('2025-26');
  const [sessionSource, setSessionSource] = useState('global'); // 'global' | 'column'

  const [globalDepartment, setGlobalDepartment] = useState(user?.departmentCode || 'ETE');
  const [deptSource, setDeptSource] = useState('global'); // 'global' | 'column'

  const [globalSemester, setGlobalSemester] = useState('1-1');
  const [semesterSource, setSemesterSource] = useState('global'); // 'global' | 'column'

  const [globalStatus, setGlobalStatus] = useState('active');

  const [availableDepartments, setAvailableDepartments] = useState(['ETE', 'CSE', 'EEE', 'CE', 'ME', 'IPE']);

  // Authentication Mapping
  const [usernameColumnId, setUsernameColumnId] = useState('');
  const [passwordColumnId, setPasswordColumnId] = useState('');

  // Duplicate Detection Configuration
  const [duplicateKeyColumnIds, setDuplicateKeyColumnIds] = useState(new Set());
  const [duplicateAction, setDuplicateAction] = useState('skip'); // 'skip' | 'update' | 'stop'

  // Final Review & Execution
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  // Load available departments
  useEffect(() => {
    async function fetchDepts() {
      try {
        const res = await api.get('/departments');
        const dList = res.data?.data || res.data || [];
        if (Array.isArray(dList) && dList.length > 0) {
          setAvailableDepartments(dList.map(d => d.code || d.departmentCode || d).filter(Boolean));
        }
      } catch { /* keep defaults */ }
    }
    fetchDepts();
  }, []);

  // Update container height on resize
  useEffect(() => {
    const handleResize = () => {
      if (gridContainerRef.current) {
        setContainerHeight(gridContainerRef.current.clientHeight || 550);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [stage, isFullscreen]);

  // ── Helpers to Push History for Undo / Redo ────────────────────────────────
  const pushHistory = useCallback((prevRows, prevCols, prevModified) => {
    setHistory(h => ({
      past: [...h.past.slice(-25), { rows: prevRows, columns: prevCols, modified: new Set(prevModified) }],
      future: []
    }));
  }, []);

  const handleUndo = useCallback(() => {
    setHistory(h => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1];
      const newPast = h.past.slice(0, -1);
      const newFuture = [{ rows, columns, modified: new Set(modifiedCells) }, ...h.future];

      setRows(previous.rows);
      setColumns(previous.columns);
      setModifiedCells(previous.modified);

      return { past: newPast, future: newFuture };
    });
    toast.info('Undo applied', { autoClose: 1200 });
  }, [rows, columns, modifiedCells]);

  const handleRedo = useCallback(() => {
    setHistory(h => {
      if (h.future.length === 0) return h;
      const next = h.future[0];
      const newFuture = h.future.slice(1);
      const newPast = [...h.past, { rows, columns, modified: new Set(modifiedCells) }];

      setRows(next.rows);
      setColumns(next.columns);
      setModifiedCells(next.modified);

      return { past: newPast, future: newFuture };
    });
    toast.info('Redo applied', { autoClose: 1200 });
  }, [rows, columns, modifiedCells]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
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

  // ── Auto-Detect Field Aliases on Parse ──────────────────────────────────────
  const detectMappedField = (headerName = '') => {
    const clean = headerName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (['roll', 'rollno', 'rollnumber', 'studentid', 'id', 'studentno'].includes(clean)) return 'rollNumber';
    if (['name', 'studentname', 'fullname', 'nameofstudent'].includes(clean)) return 'name';
    if (['registration', 'registrationno', 'regno', 'regnumber', 'registrationnumber'].includes(clean)) return 'registrationNumber';
    if (['department', 'dept', 'deptcode'].includes(clean)) return 'department';
    if (['series', 'batchseries', 'admissionseries'].includes(clean)) return 'series';
    if (['session', 'academicsession'].includes(clean)) return 'session';
    if (['semester', 'currentsemester', 'level'].includes(clean)) return 'semester';
    if (['email', 'studentemail', 'emailaddress'].includes(clean)) return 'email';
    if (['phone', 'contact', 'contactno', 'mobile', 'cell'].includes(clean)) return 'contactNo';
    if (['status', 'accountstatus'].includes(clean)) return 'status';
    if (['section', 'sec'].includes(clean)) return 'section';
    if (['batch', 'group'].includes(clean)) return 'batch';
    if (['father', 'fathername', 'fathersname'].includes(clean)) return 'fatherName';
    if (['mother', 'mothername', 'mothersname'].includes(clean)) return 'motherName';
    if (['gender', 'sex'].includes(clean)) return 'gender';
    if (['blood', 'bloodgroup', 'bg'].includes(clean)) return 'bloodGroup';
    if (['address', 'presentaddress'].includes(clean)) return 'address';
    return '';
  };

  // Convert column index (0, 1, 2...) to spreadsheet letter (A, B, C... Z, AA, AB...)
  const getColumnLetter = (index) => {
    let letter = '';
    let temp = index;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  // ── Step 1: Parse XLSX File Client-Side & Staging Initialization ───────────
  const processUploadedFile = async (fileObj) => {
    if (!fileObj) return;
    setParsingFile(true);
    setUploadedFile(fileObj);
    setFileName(fileObj.name);
    setFileSize(fileObj.size);

    try {
      const buffer = await fileObj.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellNF: false });
      setRawWorkbook(workbook);

      const sheets = workbook.SheetNames || [];
      setSheetNames(sheets);

      const chosenSheet = sheets[0];
      setActiveSheet(chosenSheet);
      loadSheetData(workbook, chosenSheet);
    } catch (err) {
      console.error('File parsing error:', err);
      toast.error('Failed to parse Excel file: ' + err.message);
    } finally {
      setParsingFile(false);
    }
  };

  const loadSheetData = (wb, sheetName) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    // Convert to JSON array of arrays
    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
    if (!rawData || rawData.length === 0) {
      toast.warning('The selected sheet is empty');
      return;
    }

    // Header row is row 0
    const rawHeaders = rawData[0] || [];
    const rawDataRows = rawData.slice(1);

    // Build structured column metadata
    let detectedUserCol = '';
    let detectedPassCol = '';
    let detectedDupCol = '';

    const newColumns = rawHeaders.map((hdr, idx) => {
      const headerName = String(hdr || '').trim() || `Column_${idx + 1}`;
      const mapped = detectMappedField(headerName);
      const colId = `col_${idx}`;

      const isUser = mapped === 'rollNumber' || (!detectedUserCol && idx === 0);
      const isPass = mapped === 'registrationNumber' || (!detectedPassCol && mapped === 'rollNumber');

      if (isUser && !detectedUserCol) detectedUserCol = colId;
      if (isPass && !detectedPassCol && colId !== detectedUserCol) detectedPassCol = colId;
      if (mapped === 'rollNumber') detectedDupCol = colId;

      return {
        id: colId,
        letter: getColumnLetter(idx),
        name: headerName,
        mappedField: mapped,
        dataType: 'text',
        isUsername: false,
        isPassword: false,
        isDuplicateKey: false
      };
    });

    // Default username/password assignments
    if (detectedUserCol) {
      const uCol = newColumns.find(c => c.id === detectedUserCol);
      if (uCol) uCol.isUsername = true;
      setUsernameColumnId(detectedUserCol);
    }
    if (detectedPassCol) {
      const pCol = newColumns.find(c => c.id === detectedPassCol);
      if (pCol) pCol.isPassword = true;
      setPasswordColumnId(detectedPassCol);
    } else if (detectedUserCol) {
      setPasswordColumnId(detectedUserCol);
    }

    if (detectedDupCol) {
      const dCol = newColumns.find(c => c.id === detectedDupCol);
      if (dCol) dCol.isDuplicateKey = true;
      setDuplicateKeyColumnIds(new Set([detectedDupCol]));
    }

    // Build structured row objects
    const newRows = rawDataRows.map((rowArr, rIdx) => {
      const rowObj = { _id: `row_${rIdx}`, _originalIndex: rIdx + 1 };
      newColumns.forEach((col, cIdx) => {
        const val = rowArr[cIdx];
        rowObj[col.id] = val !== undefined && val !== null ? String(val).trim() : '';
      });
      return rowObj;
    });

    // Auto-detect series from first row or file name
    const seriesMatch = fileName.match(/(\d{2})/);
    if (seriesMatch) {
      setGlobalSeries(seriesMatch[1]);
      setGlobalSession(`20${seriesMatch[1]}-${parseInt(seriesMatch[1], 10) + 1}`);
    } else if (newRows.length > 0 && detectedUserCol) {
      const firstRoll = String(newRows[0][detectedUserCol] || '');
      if (/^\d{2}/.test(firstRoll)) {
        const sVal = firstRoll.slice(0, 2);
        setGlobalSeries(sVal);
        setGlobalSession(`20${sVal}-${parseInt(sVal, 10) + 1}`);
      }
    }

    setColumns(newColumns);
    setRows(newRows);
    setOriginalSnapshot({ columns: JSON.parse(JSON.stringify(newColumns)), rows: JSON.parse(JSON.stringify(newRows)) });
    setHistory({ past: [], future: [] });
    setModifiedCells(new Set());
    setSelectedRowIds(new Set());

    // Advance directly to Interactive Spreadsheet Workspace
    setStage(1);
    toast.success(`Loaded ${newRows.length} rows & ${newColumns.length} columns from "${sheetName}"`);
  };

  // ── Drag & Drop Handlers ───────────────────────────────────────────────────
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files[0]) {
      processUploadedFile(files[0]);
    }
  };

  // ── Row Operations ─────────────────────────────────────────────────────────
  const handleDeleteRow = (rowId) => {
    pushHistory(rows, columns, modifiedCells);
    setRows(prev => prev.filter(r => r._id !== rowId));
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
    toast.info('Row removed from workspace (Undo available)', { autoClose: 1800 });
  };

  const handleAddRow = () => {
    pushHistory(rows, columns, modifiedCells);
    const newId = `row_new_${Date.now()}`;
    const newRow = { _id: newId, _originalIndex: rows.length + 1 };
    columns.forEach(c => { newRow[c.id] = ''; });
    setRows(prev => [newRow, ...prev]);
    toast.success('Blank row added at top. Click cells to edit.');
  };

  const handleDeleteSelectedRows = () => {
    if (selectedRowIds.size === 0) return;
    pushHistory(rows, columns, modifiedCells);
    const count = selectedRowIds.size;
    setRows(prev => prev.filter(r => !selectedRowIds.has(r._id)));
    setSelectedRowIds(new Set());
    toast.info(`Removed ${count} selected rows`, { autoClose: 2000 });
  };

  const handleDeleteEmptyRows = () => {
    pushHistory(rows, columns, modifiedCells);
    const beforeCount = rows.length;
    const nonEmpty = rows.filter(r => {
      return columns.some(c => String(r[c.id] || '').trim() !== '');
    });
    const removedCount = beforeCount - nonEmpty.length;
    setRows(nonEmpty);
    toast.info(`Removed ${removedCount} empty rows`, { autoClose: 2000 });
  };

  // ── Cell Editing ───────────────────────────────────────────────────────────
  const handleStartEdit = (rowId, colId, currentVal) => {
    setEditingCell({ rowId, colId });
    setEditValue(currentVal || '');
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;
    const { rowId, colId } = editingCell;
    const currentRow = rows.find(r => r._id === rowId);

    if (currentRow && currentRow[colId] !== editValue) {
      pushHistory(rows, columns, modifiedCells);
      setRows(prev => prev.map(r => r._id === rowId ? { ...r, [colId]: editValue.trim() } : r));
      setModifiedCells(prev => new Set(prev).add(`${rowId}:${colId}`));
    }
    setEditingCell(null);
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // ── Column Operations ──────────────────────────────────────────────────────
  const handleUpdateColumnMapping = (colId, targetField) => {
    pushHistory(rows, columns, modifiedCells);
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, mappedField: targetField } : c));

    // Automatically update username / password defaults if matching
    if (targetField === 'rollNumber') {
      setUsernameColumnId(colId);
      setColumns(prev => prev.map(c => ({ ...c, isUsername: c.id === colId })));
      setDuplicateKeyColumnIds(prev => new Set(prev).add(colId));
    } else if (targetField === 'registrationNumber') {
      setPasswordColumnId(colId);
      setColumns(prev => prev.map(c => ({ ...c, isPassword: c.id === colId })));
    }
  };

  const handleSetAsUsername = (colId) => {
    setUsernameColumnId(colId);
    setColumns(prev => prev.map(c => ({ ...c, isUsername: c.id === colId })));
    toast.success('Column set as Student Username source 🔑');
    setActiveColMenu(null);
  };

  const handleSetAsPassword = (colId) => {
    setPasswordColumnId(colId);
    setColumns(prev => prev.map(c => ({ ...c, isPassword: c.id === colId })));
    toast.success('Column set as Initial Password source 🔐');
    setActiveColMenu(null);
  };

  const handleToggleDuplicateKey = (colId) => {
    setDuplicateKeyColumnIds(prev => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, isDuplicateKey: !c.isDuplicateKey } : c));
    setActiveColMenu(null);
  };

  const handleMoveColumn = (colIndex, direction) => {
    const targetIdx = direction === 'left' ? colIndex - 1 : colIndex + 1;
    if (targetIdx < 0 || targetIdx >= columns.length) return;

    pushHistory(rows, columns, modifiedCells);
    setColumns(prev => {
      const next = [...prev];
      const temp = next[colIndex];
      next[colIndex] = next[targetIdx];
      next[targetIdx] = temp;
      // Re-assign column letters
      return next.map((c, i) => ({ ...c, letter: getColumnLetter(i) }));
    });
    setActiveColMenu(null);
  };

  const handleDeleteColumn = (colId) => {
    if (columns.length <= 1) {
      toast.warning('Cannot delete the only remaining column');
      return;
    }
    pushHistory(rows, columns, modifiedCells);
    setColumns(prev => prev.filter(c => c.id !== colId).map((c, i) => ({ ...c, letter: getColumnLetter(i) })));
    if (usernameColumnId === colId) setUsernameColumnId('');
    if (passwordColumnId === colId) setPasswordColumnId('');
    setDuplicateKeyColumnIds(prev => {
      const next = new Set(prev);
      next.delete(colId);
      return next;
    });
    toast.info('Column removed from workspace', { autoClose: 1800 });
    setActiveColMenu(null);
  };

  const handleClearColumnValues = (colId) => {
    pushHistory(rows, columns, modifiedCells);
    setRows(prev => prev.map(r => ({ ...r, [colId]: '' })));
    toast.info('Column values cleared', { autoClose: 1800 });
    setActiveColMenu(null);
  };

  // Reset to original uploaded state
  const handleResetToOriginal = () => {
    if (window.confirm('Reset all changes and restore original spreadsheet data?')) {
      pushHistory(rows, columns, modifiedCells);
      setColumns(JSON.parse(JSON.stringify(originalSnapshot.columns)));
      setRows(JSON.parse(JSON.stringify(originalSnapshot.rows)));
      setModifiedCells(new Set());
      setSelectedRowIds(new Set());
      toast.info('Workspace reset to original file');
    }
  };

  // ── Bulk Actions for Selected Rows ─────────────────────────────────────────
  const handleBulkSet = (fieldKey, value) => {
    if (selectedRowIds.size === 0) return;
    const targetCol = columns.find(c => c.mappedField === fieldKey);
    if (!targetCol) {
      toast.warning(`No column is mapped to "${fieldKey}". Please map a column first.`);
      return;
    }
    pushHistory(rows, columns, modifiedCells);
    setRows(prev => prev.map(r => {
      if (selectedRowIds.has(r._id)) {
        return { ...r, [targetCol.id]: value };
      }
      return r;
    }));
    toast.success(`Updated ${fieldKey} for ${selectedRowIds.size} rows`);
  };

  // ── Validation & Row Error Computation ─────────────────────────────────────
  const rollCol = useMemo(() => columns.find(c => c.mappedField === 'rollNumber') || columns.find(c => c.isUsername), [columns]);
  const nameCol = useMemo(() => columns.find(c => c.mappedField === 'name'), [columns]);

  // Compute in-file duplicate keys
  const inFileDuplicateRolls = useMemo(() => {
    if (!rollCol) return new Set();
    const seen = new Set();
    const dups = new Set();
    rows.forEach(r => {
      const v = String(r[rollCol.id] || '').trim();
      if (v) {
        if (seen.has(v)) dups.add(v);
        else seen.add(v);
      }
    });
    return dups;
  }, [rows, rollCol]);

  // Validate a single row
  const getRowValidation = useCallback((row) => {
    const errors = [];
    const warnings = [];

    // Check Roll / Student ID
    if (rollCol) {
      const rVal = String(row[rollCol.id] || '').trim();
      if (!rVal) errors.push('Student ID / Roll is required');
      else if (inFileDuplicateRolls.has(rVal)) warnings.push('Duplicate ID in uploaded spreadsheet');
    } else {
      errors.push('No Student ID column mapped');
    }

    // Check Student Name
    if (nameCol) {
      const nVal = String(row[nameCol.id] || '').trim();
      if (!nVal) errors.push('Student Name is required');
    }

    // Check Email format if mapped
    const emailCol = columns.find(c => c.mappedField === 'email');
    if (emailCol) {
      const eVal = String(row[emailCol.id] || '').trim();
      if (eVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eVal)) {
        errors.push('Invalid email format');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }, [rollCol, nameCol, columns, inFileDuplicateRolls]);

  // ── Filter & Search Rows ───────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let result = rows;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r => {
        return columns.some(c => String(r[c.id] || '').toLowerCase().includes(q));
      });
    }

    // Status filter
    if (filterType === 'valid') {
      result = result.filter(r => getRowValidation(r).isValid && getRowValidation(r).warnings.length === 0);
    } else if (filterType === 'errors') {
      result = result.filter(r => !getRowValidation(r).isValid);
    } else if (filterType === 'duplicates') {
      result = result.filter(r => getRowValidation(r).warnings.length > 0);
    } else if (filterType === 'modified') {
      result = result.filter(r => columns.some(c => modifiedCells.has(`${r._id}:${c.id}`)));
    }

    return result;
  }, [rows, columns, searchQuery, filterType, getRowValidation, modifiedCells]);

  // ── Virtualized Row Calculations ───────────────────────────────────────────
  const totalRowsCount = filteredRows.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 5);
  const endIndex = Math.min(totalRowsCount, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + 5);
  const visibleRows = filteredRows.slice(startIndex, endIndex);
  const offsetY = startIndex * ROW_HEIGHT;

  // ── Step 3: Generate Final Review Data ─────────────────────────────────────
  const generateFinalReview = () => {
    // Check critical requirements
    const rollMapped = columns.some(c => c.mappedField === 'rollNumber');
    const nameMapped = columns.some(c => c.mappedField === 'name');

    if (!rollMapped) {
      toast.error('Validation Blocked: Please map at least one column as "Student ID / Roll Number *"');
      return;
    }
    if (!nameMapped) {
      toast.error('Validation Blocked: Please map at least one column as "Student Name *"');
      return;
    }
    if (!usernameColumnId) {
      toast.error('Validation Blocked: Please select a Username Source Column');
      return;
    }
    if (!passwordColumnId) {
      toast.error('Validation Blocked: Please select a Password Source Column');
      return;
    }

    // Build normalized preview records
    const normalized = rows.map((r, idx) => {
      const rObj = { _rowIndex: idx + 1, _id: r._id };

      // Applied values
      columns.forEach(col => {
        if (col.mappedField) {
          rObj[col.mappedField] = String(r[col.id] || '').trim();
        }
      });

      // Apply overrides if configured
      if (seriesSource === 'global') rObj.series = globalSeries;
      if (sessionSource === 'global') rObj.session = globalSession;
      if (deptSource === 'global') rObj.department = globalDepartment;
      if (semesterSource === 'global') rObj.semester = globalSemester;
      rObj.status = globalStatus;

      // Extract credentials
      rObj.username = String(r[usernameColumnId] || rObj.rollNumber || '').trim();
      rObj.rawPassword = String(r[passwordColumnId] || rObj.registrationNumber || rObj.rollNumber || '').trim();

      const validation = getRowValidation(r);
      rObj._isValid = validation.isValid && rObj.username && rObj.rawPassword;
      rObj._errors = validation.errors;
      rObj._warnings = validation.warnings;

      return rObj;
    });

    const validList = normalized.filter(n => n._isValid);
    const invalidList = normalized.filter(n => !n._isValid);

    setPreviewData({
      total: normalized.length,
      valid: validList.length,
      invalid: invalidList.length,
      duplicates: inFileDuplicateRolls.size,
      normalized
    });

    setStage(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Step 4: Confirm & Execute Import via Backend Pipeline ──────────────────
  const handleExecuteImport = async () => {
    setIsConfirmModalOpen(false);
    setLoading(true);
    setImportProgress(25);

    try {
      // Build client mapping dictionary: { [originalColumnHeader]: mappedField }
      const mappingDict = {};
      columns.forEach(c => {
        if (c.mappedField) mappingDict[c.name] = c.mappedField;
      });

      // Prepare payload
      const userColName = columns.find(c => c.id === usernameColumnId)?.name || 'roll';
      const passColName = columns.find(c => c.id === passwordColumnId)?.name || 'registration';

      const userTargetField = columns.find(c => c.id === usernameColumnId)?.mappedField || 'rollNumber';
      const passTargetField = columns.find(c => c.id === passwordColumnId)?.mappedField || 'registrationNumber';

      // Duplicate matching keys list
      const dupFieldKeys = Array.from(duplicateKeyColumnIds)
        .map(cid => columns.find(c => c.id === cid)?.mappedField)
        .filter(Boolean);
      if (dupFieldKeys.length === 0) dupFieldKeys.push('rollNumber');

      // Convert rows to plain objects matching column names for backend parser
      const rawRowsToSend = rows.map((r, idx) => {
        const item = { _rowIndex: idx + 1 };
        columns.forEach(c => {
          item[c.name] = String(r[c.id] || '').trim();
        });
        return item;
      });

      setImportProgress(50);

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
        duplicateMatchingFields: dupFieldKeys,
        duplicateAction, // 'skip' | 'update' | 'stop'
        overrides: {
          department: deptSource === 'global' ? globalDepartment : undefined,
          series: seriesSource === 'global' ? globalSeries : undefined,
          session: sessionSource === 'global' ? globalSession : undefined,
          semester: semesterSource === 'global' ? globalSemester : undefined,
          status: globalStatus
        }
      };

      const res = await api.post('/import/students/execute', payload);
      setImportProgress(100);

      if (res.data?.success) {
        setImportResult(res.data);
        setStage(4);
        toast.success(res.data.message || 'Students imported successfully!');
      } else {
        throw new Error(res.data?.message || 'Import failed');
      }
    } catch (err) {
      console.error('Import execution error:', err);
      toast.error(err.response?.data?.message || err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  // Download Error Report
  const handleDownloadErrors = async () => {
    if (!importResult?.errors || importResult.errors.length === 0) {
      toast.info('No errors to download');
      return;
    }
    try {
      const res = await api.post(
        '/import/download-error-report',
        { errors: importResult.errors, jobId: importResult.jobId },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Import_Errors_${importResult.jobId || 'log'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to download error report: ' + err.message);
    }
  };

  // Download Sample Template
  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/import/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'LabEval_Student_Import_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Sample template downloaded');
    } catch (err) {
      toast.error('Failed to download template');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: STAGE 0 — UPLOAD XLSX
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === 0) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Interactive Spreadsheet Workspace</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Import Student Dataset
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Upload your raw Excel file (.xlsx, .xls) to inspect, edit, rearrange, and dynamically map before committing to the database.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all"
              >
                <Download className="w-4 h-4 text-indigo-500" />
                <span>Download Sample Template</span>
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative group cursor-pointer rounded-2xl border-2 border-dashed p-10 md:p-14 text-center transition-all bg-white dark:bg-slate-900/60 ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-4 ring-indigo-500/10'
                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && processUploadedFile(e.target.files[0])}
            />

            <div className="flex flex-col items-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm group-hover:scale-105 transition-transform">
                {parsingFile ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <CloudUpload className="w-8 h-8" />
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {parsingFile ? 'Reading Spreadsheet Dataset...' : 'Drop your Excel file here, or click to browse'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Supports Microsoft Excel <span className="font-semibold text-indigo-600">.xlsx</span> and <span className="font-semibold text-indigo-600">.xls</span> (up to 15 MB)
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <span className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  ⚡ Virtualized fast rendering
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  🔒 Zero-database staging mode
                </span>
              </div>
            </div>
          </div>

          {/* Information Banner */}
          <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-indigo-900 dark:text-indigo-300 space-y-1">
              <p className="font-semibold">Interactive Spreadsheet Guarantee:</p>
              <p>
                Nothing will be saved into MongoDB while you inspect or edit cells. You will be able to delete rows, rename/remove columns, modify values, and select authentication credentials right on the spreadsheet table before making any changes.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: STAGE 1 — INTERACTIVE SPREADSHEET WORKSPACE
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 ${isFullscreen ? 'fixed inset-0 z-50 overflow-auto' : 'p-4 md:p-6'}`}>
      <div className="max-w-[1700px] mx-auto space-y-4">

        {/* ── Top Bar / Stage 1 Header ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* File Info & Sheet Selector */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white truncate max-w-xs md:max-w-md">
                    {fileName}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {rows.length} rows • {columns.length} cols
                  </span>
                </div>
                {sheetNames.length > 1 && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">Sheet:</span>
                    <select
                      value={activeSheet}
                      onChange={(e) => rawWorkbook && loadSheetData(rawWorkbook, e.target.value)}
                      className="text-xs font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-0.5 focus:ring-1 focus:ring-indigo-500"
                    >
                      {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Undo / Redo & Toolbar Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleUndo}
                disabled={history.past.length === 0}
                title="Undo edit (Ctrl+Z)"
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={history.future.length === 0}
                title="Redo edit (Ctrl+Y)"
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Redo2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleResetToOriginal}
                title="Revert all changes back to original file"
                className="px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 transition-all"
              >
                Reset Original
              </button>

              <button
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-500" />
                <span>Add Row</span>
              </button>

              {selectedRowIds.size > 0 && (
                <button
                  onClick={handleDeleteSelectedRows}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedRowIds.size})</span>
                </button>
              )}

              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-all"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Table'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Step Navigation Button */}
              {stage === 1 ? (
                <button
                  onClick={() => setStage(2)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all"
                >
                  <span>Configure & Validate</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : stage === 2 ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStage(1)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                  >
                    ← Back to Spreadsheet
                  </button>
                  <button
                    onClick={generateFinalReview}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                  >
                    <span>Final Review & Cross-Check</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : stage === 3 ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStage(2)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    ← Back to Config
                  </button>
                  <button
                    onClick={() => setIsConfirmModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Import ({previewData?.valid || rows.length} Students)</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Search, Filter Pills & Bulk Operations */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {/* Search Input */}
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search any cell..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: `All (${rows.length})` },
                { id: 'valid', label: 'Valid Only' },
                { id: 'errors', label: 'Errors Only' },
                { id: 'duplicates', label: `Duplicates (${inFileDuplicateRolls.size})` },
                { id: 'modified', label: `Modified (${modifiedCells.size})` },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    filterType === f.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Quick Bulk Dropdown */}
            {selectedRowIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {selectedRowIds.size} selected:
                </span>
                <select
                  onChange={(e) => {
                    const [f, v] = e.target.value.split(':');
                    if (f && v) handleBulkSet(f, v);
                    e.target.value = '';
                  }}
                  className="text-xs bg-indigo-50 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-500 font-medium"
                >
                  <option value="">Bulk Action...</option>
                  <option value="status:active">Set Status: ACTIVE</option>
                  <option value="status:inactive">Set Status: INACTIVE</option>
                  <option value="regularStatus:Regular">Set Regular Status: Regular</option>
                  <option value="regularStatus:Irregular">Set Regular Status: Irregular</option>
                  <option value="series:22">Set Series: 22</option>
                  <option value="series:21">Set Series: 21</option>
                  <option value="series:20">Set Series: 20</option>
                  <option value="semester:1-1">Set Semester: 1-1</option>
                  <option value="semester:1-2">Set Semester: 1-2</option>
                  <option value="semester:2-1">Set Semester: 2-1</option>
                  <option value="semester:2-2">Set Semester: 2-2</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STAGE 1: THE SPREADSHEET VIRTUALIZED TABLE GRID                    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {stage === 1 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Spreadsheet Helper Bar */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span>💡 Click any cell to edit</span>
                <span>• Press <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono">Enter</kbd> to save</span>
                <span>• Select mapping from column header dropdown</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> 🔑 Username
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 🔐 Password
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 🔍 Duplicate Key
                </span>
              </div>
            </div>

            {/* Virtualized Container */}
            <div
              ref={gridContainerRef}
              onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
              className="overflow-auto relative border-slate-200 dark:border-slate-800"
              style={{ maxHeight: isFullscreen ? 'calc(100vh - 180px)' : '620px', minHeight: '400px' }}
            >
              <table className="w-full border-collapse text-left select-text" style={{ minWidth: `${columns.length * 190 + 90}px` }}>
                {/* ── Sticky Table Header ───────────────────────────────────── */}
                <thead className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800/95 shadow-sm border-b border-slate-300 dark:border-slate-700">
                  <tr>
                    {/* Sticky Corner / Row Selection & Controls Column */}
                    <th className="sticky left-0 z-40 bg-slate-200 dark:bg-slate-800 w-20 px-3 py-2 text-center border-r border-slate-300 dark:border-slate-700">
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={rows.length > 0 && selectedRowIds.size === rows.length}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedRowIds(new Set(rows.map(r => r._id)));
                            else setSelectedRowIds(new Set());
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          title="Select All Rows"
                        />
                        <span className="text-[11px] font-bold text-slate-500">#</span>
                      </div>
                    </th>

                    {/* Column Headers with Letters + Titles + In-Header Mapping Dropdown */}
                    {columns.map((col, cIdx) => {
                      const isUser = col.id === usernameColumnId;
                      const isPass = col.id === passwordColumnId;
                      const isDup = duplicateKeyColumnIds.has(col.id);

                      return (
                        <th
                          key={col.id}
                          className={`relative px-3 py-2 border-r border-slate-300 dark:border-slate-700 text-xs font-semibold ${
                            isUser ? 'bg-indigo-50/70 dark:bg-indigo-950/40' : isPass ? 'bg-emerald-50/70 dark:bg-emerald-950/40' : ''
                          }`}
                          style={{ width: '220px', minWidth: '190px' }}
                        >
                          <div className="space-y-1.5">
                            {/* Top row: Column Letter & Menu Button */}
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {col.letter}
                              </span>

                              <div className="flex items-center gap-1">
                                {isUser && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500 text-white" title="Student Username Source">
                                    🔑 USER
                                  </span>
                                )}
                                {isPass && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500 text-white" title="Student Password Source">
                                    🔐 PASS
                                  </span>
                                )}
                                {isDup && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500 text-white" title="Duplicate Detection Key">
                                    🔍 DUP
                                  </span>
                                )}

                                {/* Column Action ⋮ Menu Button */}
                                <div className="relative">
                                  <button
                                    onClick={() => setActiveColMenu(activeColMenu === col.id ? null : col.id)}
                                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                                    title="Column Actions"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Column Dropdown Menu */}
                                  {activeColMenu === col.id && (
                                    <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 text-left">
                                      <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        Column {col.letter}: {col.name}
                                      </div>
                                      <button
                                        onClick={() => handleSetAsUsername(col.id)}
                                        className="w-full px-3 py-1.5 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold"
                                      >
                                        <KeyRound className="w-3.5 h-3.5" /> Set as Username Column
                                      </button>
                                      <button
                                        onClick={() => handleSetAsPassword(col.id)}
                                        className="w-full px-3 py-1.5 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold"
                                      >
                                        <Lock className="w-3.5 h-3.5" /> Set as Password Column
                                      </button>
                                      <button
                                        onClick={() => handleToggleDuplicateKey(col.id)}
                                        className="w-full px-3 py-1.5 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold"
                                      >
                                        <ShieldAlert className="w-3.5 h-3.5" /> {isDup ? 'Remove Duplicate Key' : 'Set as Duplicate Key'}
                                      </button>
                                      <div className="my-1 border-t border-slate-100 dark:border-slate-700"></div>
                                      <button
                                        onClick={() => handleMoveColumn(cIdx, 'left')}
                                        disabled={cIdx === 0}
                                        className="w-full px-3 py-1.5 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2 text-slate-700 dark:text-slate-300 disabled:opacity-40"
                                      >
                                        <ArrowLeft className="w-3.5 h-3.5" /> Move Left
                                      </button>
                                      <button
                                        onClick={() => handleMoveColumn(cIdx, 'right')}
                                        disabled={cIdx === columns.length - 1}
                                        className="w-full px-3 py-1.5 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2 text-slate-700 dark:text-slate-300 disabled:opacity-40"
                                      >
                                        <ArrowRight className="w-3.5 h-3.5" /> Move Right
                                      </button>
                                      <button
                                        onClick={() => handleClearColumnValues(col.id)}
                                        className="w-full px-3 py-1.5 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5" /> Clear Values
                                      </button>
                                      <div className="my-1 border-t border-slate-100 dark:border-slate-700"></div>
                                      <button
                                        onClick={() => handleDeleteColumn(col.id)}
                                        className="w-full px-3 py-1.5 text-xs text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" /> Remove Column
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Column Original Name */}
                            <div className="text-slate-900 dark:text-slate-100 font-bold truncate text-[13px]" title={col.name}>
                              {col.name}
                            </div>

                            {/* In-Header Dynamic Mapping Dropdown */}
                            <select
                              value={col.mappedField}
                              onChange={(e) => handleUpdateColumnMapping(col.id, e.target.value)}
                              className={`w-full text-xs font-semibold rounded-lg px-2 py-1 border transition-all ${
                                col.mappedField
                                  ? 'bg-indigo-50/90 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
                              } focus:ring-2 focus:ring-indigo-500 focus:outline-none`}
                            >
                              {DB_TARGET_FIELDS.map(f => (
                                <option key={f.value} value={f.value}>
                                  {f.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                {/* ── Virtualized Table Body ─────────────────────────────────── */}
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {/* Top Spacer */}
                  {offsetY > 0 && (
                    <tr style={{ height: `${offsetY}px` }}>
                      <td colSpan={columns.length + 1}></td>
                    </tr>
                  )}

                  {/* Visible Virtual Rows */}
                  {visibleRows.map((row) => {
                    const validation = getRowValidation(row);
                    const isRowSelected = selectedRowIds.has(row._id);

                    return (
                      <tr
                        key={row._id}
                        style={{ height: `${ROW_HEIGHT}px` }}
                        className={`hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors group ${
                          isRowSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/50'
                            : !validation.isValid
                            ? 'bg-rose-50/30 dark:bg-rose-950/20'
                            : validation.warnings.length > 0
                            ? 'bg-amber-50/30 dark:bg-amber-950/20'
                            : ''
                        }`}
                      >
                        {/* Sticky Row Index & Action (✕ delete button) */}
                        <td className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-800/95 px-2 text-center border-r border-slate-300 dark:border-slate-700 w-20">
                          <div className="flex items-center justify-between gap-1">
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={(e) => {
                                setSelectedRowIds(prev => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(row._id);
                                  else next.delete(row._id);
                                  return next;
                                });
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                            />

                            <span className="font-mono text-slate-500 text-[11px]">
                              {row._originalIndex}
                            </span>

                            {/* Small ✕ Remove Row Button */}
                            <button
                              onClick={() => handleDeleteRow(row._id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5"
                              title="Delete row from workspace"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Cell Values */}
                        {columns.map((col) => {
                          const isEditing = editingCell?.rowId === row._id && editingCell?.colId === col.id;
                          const cellVal = row[col.id] || '';
                          const isModified = modifiedCells.has(`${row._id}:${col.id}`);
                          const isUserCol = col.id === usernameColumnId;
                          const isPassCol = col.id === passwordColumnId;

                          return (
                            <td
                              key={col.id}
                              onClick={() => !isEditing && handleStartEdit(row._id, col.id, cellVal)}
                              className={`px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 cursor-cell relative font-mono text-[12px] truncate ${
                                isEditing ? 'p-0 ring-2 ring-indigo-500 z-10 bg-white dark:bg-slate-900' : ''
                              } ${isUserCol ? 'font-semibold text-indigo-900 dark:text-indigo-200' : ''} ${
                                isPassCol ? 'font-semibold text-emerald-900 dark:text-emerald-200' : ''
                              }`}
                              style={{ maxWidth: '220px' }}
                            >
                              {isEditing ? (
                                <input
                                  type="text"
                                  autoFocus
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleSaveEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit();
                                    else if (e.key === 'Escape') handleCancelEdit();
                                  }}
                                  className="w-full h-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-none outline-none focus:ring-0 font-mono"
                                />
                              ) : (
                                <div className="flex items-center justify-between gap-1 group/cell">
                                  <span className="truncate" title={cellVal}>
                                    {cellVal !== '' ? cellVal : <span className="text-slate-300 dark:text-slate-600 italic">empty</span>}
                                  </span>
                                  {isModified && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" title="Modified in staging"></span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Bottom Spacer */}
                  {totalRowsCount - endIndex > 0 && (
                    <tr style={{ height: `${(totalRowsCount - endIndex) * ROW_HEIGHT}px` }}>
                      <td colSpan={columns.length + 1}></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Stats */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-4">
                <span>Showing {filteredRows.length} of {rows.length} rows</span>
                <span>• {columns.length} columns active</span>
                <span>• {modifiedCells.size} cells edited</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeleteEmptyRows}
                  className="hover:text-rose-600 transition-colors"
                >
                  Delete empty rows
                </button>
                <span>•</span>
                <button
                  onClick={() => setStage(2)}
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  Configure & Proceed →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STAGE 2: CONFIGURATION & DUPLICATE RULES                           */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {stage === 2 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Import Configuration & Authentication Mapping
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Configure global defaults vs Excel column sources, specify authentication credentials, and choose duplicate handling policies.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 1. Series Configuration */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Series / Batch
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={seriesSource === 'global'}
                        onChange={() => setSeriesSource('global')}
                        className="text-indigo-600"
                      />
                      <span>Global</span>
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={seriesSource === 'column'}
                        onChange={() => setSeriesSource('column')}
                        className="text-indigo-600"
                      />
                      <span>Excel Col</span>
                    </label>
                  </div>
                </div>

                {seriesSource === 'global' ? (
                  <input
                    type="text"
                    value={globalSeries}
                    onChange={(e) => setGlobalSeries(e.target.value)}
                    placeholder="e.g. 22"
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-xs text-slate-500">Each row uses its own Series from mapped Excel column.</p>
                )}
                <p className="text-[11px] text-slate-400">Applied to every student to group cohort and batch.</p>
              </div>

              {/* 2. Academic Session */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Academic Session
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={sessionSource === 'global'}
                        onChange={() => setSessionSource('global')}
                        className="text-indigo-600"
                      />
                      <span>Global</span>
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={sessionSource === 'column'}
                        onChange={() => setSessionSource('column')}
                        className="text-indigo-600"
                      />
                      <span>Excel Col</span>
                    </label>
                  </div>
                </div>

                {sessionSource === 'global' ? (
                  <input
                    type="text"
                    value={globalSession}
                    onChange={(e) => setGlobalSession(e.target.value)}
                    placeholder="e.g. 2025-26"
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-xs text-slate-500">Each row uses its own Session from mapped column.</p>
                )}
                <p className="text-[11px] text-slate-400">RUET academic session format (e.g. 2025-26).</p>
              </div>

              {/* 3. Department */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Department
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={deptSource === 'global'}
                        onChange={() => setDeptSource('global')}
                        className="text-indigo-600"
                      />
                      <span>Global</span>
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={deptSource === 'column'}
                        onChange={() => setDeptSource('column')}
                        className="text-indigo-600"
                      />
                      <span>Excel Col</span>
                    </label>
                  </div>
                </div>

                {deptSource === 'global' ? (
                  <select
                    value={globalDepartment}
                    onChange={(e) => setGlobalDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                ) : (
                  <p className="text-xs text-slate-500">Each row uses its own Department code.</p>
                )}
                <p className="text-[11px] text-slate-400">Assigns department and faculty hierarchy.</p>
              </div>

              {/* 4. Current Semester */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Current Semester
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={semesterSource === 'global'}
                        onChange={() => setSemesterSource('global')}
                        className="text-indigo-600"
                      />
                      <span>Global</span>
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={semesterSource === 'column'}
                        onChange={() => setSemesterSource('column')}
                        className="text-indigo-600"
                      />
                      <span>Excel Col</span>
                    </label>
                  </div>
                </div>

                {semesterSource === 'global' ? (
                  <select
                    value={globalSemester}
                    onChange={(e) => setGlobalSemester(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500"
                  >
                    {SEMESTER_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <p className="text-xs text-slate-500">Each row uses its own Semester.</p>
                )}
                <p className="text-[11px] text-slate-400">Current active semester level (e.g. 1-1, 3-2).</p>
              </div>

              {/* 5. Authentication: Username Source */}
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <label className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                    Student Username Source
                  </label>
                </div>

                <select
                  value={usernameColumnId}
                  onChange={(e) => handleSetAsUsername(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold rounded-lg bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Select Username Column —</option>
                  {columns.map(c => (
                    <option key={c.id} value={c.id}>
                      Column {c.letter}: {c.name} {c.mappedField ? `(${c.mappedField})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
                  Used by students to log in to the portal (Recommended: Roll Number).
                </p>
              </div>

              {/* 6. Authentication: Password Source */}
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <label className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                    Initial Password Source
                  </label>
                </div>

                <select
                  value={passwordColumnId}
                  onChange={(e) => handleSetAsPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">— Select Password Column —</option>
                  {columns.map(c => (
                    <option key={c.id} value={c.id}>
                      Column {c.letter}: {c.name} {c.mappedField ? `(${c.mappedField})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  Securely hashed with bcrypt on server. Never stored in plaintext.
                </p>
              </div>
            </div>

            {/* 7. Duplicate Detection Policies */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    Duplicate Detection & Conflict Handling
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select which column(s) determine unique student identity, and specify action when duplicates occur.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">If duplicate found:</label>
                  <select
                    value={duplicateAction}
                    onChange={(e) => setDuplicateAction(e.target.value)}
                    className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="skip">Skip duplicate (Keep existing)</option>
                    <option value="update">Update existing record</option>
                    <option value="stop">Stop import immediately</option>
                  </select>
                </div>
              </div>

              {/* Duplicate Key Column Checkboxes */}
              <div className="flex flex-wrap gap-3 pt-2">
                {columns.map(c => {
                  const isChecked = duplicateKeyColumnIds.has(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleDuplicateKey(c.id)}
                        className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                      />
                      <span>Col {c.letter}: {c.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setStage(1)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                ← Back to Spreadsheet Staging
              </button>

              <button
                onClick={generateFinalReview}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 transition-all"
              >
                <span>Generate Final Review Table</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STAGE 3: FINAL REVIEW & CROSS-CHECK TABLE                          */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {stage === 3 && previewData && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Rows', val: previewData.total, color: 'text-slate-900 dark:text-white', bg: 'bg-slate-50 dark:bg-slate-900' },
                { label: 'Valid Records', val: previewData.valid, color: 'text-emerald-600', bg: 'bg-emerald-50/50 dark:bg-emerald-950/30' },
                { label: 'Critical Errors', val: previewData.invalid, color: 'text-rose-600', bg: 'bg-rose-50/50 dark:bg-rose-950/30' },
                { label: 'In-File Duplicates', val: previewData.duplicates, color: 'text-amber-600', bg: 'bg-amber-50/50 dark:bg-amber-950/30' },
                { label: 'Duplicate Policy', val: duplicateAction.toUpperCase(), color: 'text-indigo-600', bg: 'bg-indigo-50/50 dark:bg-indigo-950/30', isBadge: true },
                { label: 'Ready to Import', val: previewData.valid, color: 'text-emerald-600 font-extrabold', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
              ].map((s, i) => (
                <div key={i} className={`p-4 rounded-2xl border border-slate-200 dark:border-slate-800 ${s.bg}`}>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
                  <p className={`text-xl font-bold mt-1 ${s.color}`}>
                    {s.isBadge ? s.val : typeof s.val === 'number' ? s.val.toLocaleString() : s.val}
                  </p>
                </div>
              ))}
            </div>

            {/* Validation Checklist */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Pre-Import Safety Checklist</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Student ID Mapped
                </div>
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Student Name Mapped
                </div>
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Username Assigned: {columns.find(c => c.id === usernameColumnId)?.name}
                </div>
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Password Hashing: Bcrypt Active
                </div>
              </div>
            </div>

            {/* Normalized Preview Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Normalized Database Preview</h3>
                  <p className="text-xs text-slate-400">Passwords are masked for security. Plaintext is never stored in DB.</p>
                </div>
                <span className="text-xs font-semibold text-emerald-600">
                  {previewData.valid} / {previewData.total} Students Verified
                </span>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Student ID</th>
                      <th className="px-3 py-2">Student Name</th>
                      <th className="px-3 py-2">Department</th>
                      <th className="px-3 py-2">Series</th>
                      <th className="px-3 py-2">Session</th>
                      <th className="px-3 py-2">Username</th>
                      <th className="px-3 py-2">Password</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {previewData.normalized.slice(0, 100).map((n) => (
                      <tr key={n._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2 text-slate-400">{n._rowIndex}</td>
                        <td className="px-3 py-2 font-bold text-indigo-600">{n.rollNumber || '—'}</td>
                        <td className="px-3 py-2 font-sans font-medium text-slate-900 dark:text-white">{n.name || '—'}</td>
                        <td className="px-3 py-2">{n.department}</td>
                        <td className="px-3 py-2">{n.series}</td>
                        <td className="px-3 py-2">{n.session}</td>
                        <td className="px-3 py-2 text-indigo-700 font-bold">{n.username}</td>
                        <td className="px-3 py-2 text-slate-400">•••••••• (valid)</td>
                        <td className="px-3 py-2">
                          {n._isValid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                              READY
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
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

            {/* Bottom Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStage(1)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                ← Back to Spreadsheet Staging
              </button>

              <button
                onClick={() => setIsConfirmModalOpen(true)}
                disabled={previewData.valid === 0}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl text-base font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-600/30 disabled:opacity-50 transition-all"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Confirm & Import {previewData.valid} Students</span>
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STAGE 4: EXECUTION SUMMARY & ERROR REPORT                          */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {stage === 4 && importResult && (
          <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
              <CheckCheck className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Student Import Completed!
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {importResult.message || 'All records processed successfully into MongoDB.'}
              </p>
            </div>

            {/* Stats Breakdown */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-semibold text-slate-500">INSERTED</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{importResult.stats?.inserted ?? 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-semibold text-slate-500">UPDATED</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">{importResult.stats?.updated ?? 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-semibold text-slate-500">SKIPPED</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{importResult.stats?.skipped ?? 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-semibold text-slate-500">FAILED</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">{importResult.stats?.failed ?? 0}</p>
              </div>
            </div>

            {/* Error Report Button if any errors */}
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={handleDownloadErrors}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-100"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Error Report (.xlsx)</span>
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setStage(0);
                  setUploadedFile(null);
                  setRows([]);
                  setColumns([]);
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
              >
                Import Another File
              </button>

              <button
                onClick={() => navigate('/admin/students')}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
              >
                View Students in Dashboard →
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Confirmation Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
                <Database className="w-7 h-7" />
              </div>

              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Confirm Student Import
                </h3>
                <p className="text-sm text-slate-500 mt-2">
                  Are you sure? <span className="font-bold text-indigo-600">{previewData?.valid || rows.length} students</span> will be saved into the LabEval database and linked with their user accounts.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Target Department:</span>
                  <span className="font-bold">{deptSource === 'global' ? globalDepartment : 'Per Excel Column'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Target Series:</span>
                  <span className="font-bold">{seriesSource === 'global' ? globalSeries : 'Per Excel Column'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duplicate Policy:</span>
                  <span className="font-bold text-amber-600">{duplicateAction.toUpperCase()}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Confirm & Import</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
