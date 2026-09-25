import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight,
  ArrowLeft, Download, Play, Eye, RefreshCw, X, ChevronDown,
  Users, AlertTriangle, Info, Loader2, FileCheck, History,
  SkipForward, Pencil
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api/axios';

// ── Constants ─────────────────────────────────────────────────────────────────
const IMPORT_MODES = [
  {
    id: 'upsert',
    label: 'Upsert (Recommended)',
    desc: 'Insert new students and update existing ones',
    icon: '🔄',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'add_new',
    label: 'Add New Only',
    desc: 'Only insert students that do not already exist',
    icon: '➕',
    color: 'from-emerald-500 to-green-600'
  },
  {
    id: 'update_existing',
    label: 'Update Existing Only',
    desc: 'Only update students that already exist in the database',
    icon: '✏️',
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: 'dry_run',
    label: 'Dry Run',
    desc: 'Preview exactly what would happen — no changes made',
    icon: '🔍',
    color: 'from-purple-500 to-violet-600'
  }
];

const DB_FIELDS = [
  { value: '', label: '— Skip this column —' },
  { value: 'rollNumber', label: 'Roll Number *' },
  { value: 'name', label: 'Name *' },
  { value: 'department', label: 'Department *' },
  { value: 'series', label: 'Series *' },
  { value: 'registrationNumber', label: 'Registration Number' },
  { value: 'email', label: 'Email' },
  { value: 'contactNo', label: 'Phone / Contact' },
  { value: 'session', label: 'Session' },
  { value: 'batch', label: 'Batch' },
  { value: 'semester', label: 'Semester' },
  { value: 'section', label: 'Section' },
  { value: 'status', label: 'Status' }
];

const STEPS = ['Upload', 'Map Columns', 'Preview', 'Import', 'Result'];

// ── Step Indicator ─────────────────────────────────────────────────────────────
function StepBar({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 overflow-x-auto pb-2">
      {STEPS.map((step, idx) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center min-w-[80px]">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              idx < current ? 'bg-emerald-500 text-white' :
              idx === current ? 'bg-indigo-600 text-white ring-4 ring-indigo-200 dark:ring-indigo-900' :
              'bg-slate-200 dark:bg-slate-700 text-slate-400'
            }`}>
              {idx < current ? <CheckCircle2 size={18} /> : idx + 1}
            </div>
            <span className={`text-xs mt-1 font-medium whitespace-nowrap ${
              idx === current ? 'text-indigo-600 dark:text-indigo-400' :
              idx < current ? 'text-emerald-500' :
              'text-slate-400'
            }`}>{step}</span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={`h-0.5 w-8 sm:w-12 mb-4 transition-all ${
              idx < current ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-800 dark:text-white">{value}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function StudentImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Step management
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1 — Upload state
  const [file, setFile] = useState(null);
  const [parseResult, setParseResult] = useState(null); // { headers, rows, sampleRows, autoMapping, fileName, fileSize, availableDepartments }

  // Step 2 — Column Mapping
  const [mapping, setMapping] = useState({});

  // Step 3 — Preview
  const [previewData, setPreviewData] = useState(null); // { summary, errors, isDryRun... }

  // Step 4 — Import Mode & Execution
  const [importMode, setImportMode] = useState('upsert');
  const [executeResult, setExecuteResult] = useState(null);

  // ── Step 1: Handle File Upload ─────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const ext = selected.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      toast.error('Only .xlsx and .xls files are allowed');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum 10 MB.');
      return;
    }

    setFile(selected);
    setParseResult(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selected);
      const res = await api.post('/import/students/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setParseResult(res.data.data);
        setMapping(res.data.data.autoMapping || {});
        toast.success(`Parsed ${res.data.data.totalRows} rows — review column mapping`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to parse file');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      const fakeEvent = { target: { files: [dropped] } };
      handleFileChange(fakeEvent);
    }
  }, []);

  // ── Step 2: Mapping next → Preview ────────────────────────────────────────
  const handlePreview = async () => {
    // Validate: required fields must be mapped
    const requiredFields = ['rollNumber', 'name', 'department', 'series'];
    const mappedFields = Object.values(mapping).filter(Boolean);
    const missingRequired = requiredFields.filter(f => !mappedFields.includes(f));

    if (missingRequired.length > 0) {
      toast.error(`Please map required fields: ${missingRequired.join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      // Re-read file on client to get raw rows (for preview — no server upload needed again)
      const rowData = await readFileRows();
      const res = await api.post('/import/students/preview', {
        fileName: parseResult.fileName,
        fileSize: parseResult.fileSize,
        rows: rowData,
        mapping,
        importMode
      });

      if (res.data.success) {
        setPreviewData(res.data.data);
        setStep(2);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  // Helper: re-read uploaded file to get raw rows
  const readFileRows = () => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

          // Find header row
          let hIdx = 0;
          while (hIdx < raw.length && raw[hIdx].every(c => c === '')) hIdx++;
          const headers = raw[hIdx].map(h => String(h || '').trim()).filter(Boolean);

          const rows = [];
          for (let i = hIdx + 1; i < raw.length; i++) {
            if (raw[i].every(c => c === '')) continue;
            const obj = { _rowIndex: i + 1 };
            headers.forEach((h, ci) => {
              obj[h] = raw[i][ci] !== undefined ? String(raw[i][ci]).trim() : '';
            });
            rows.push(obj);
          }
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // ── Step 3 → Step 4: Confirm Import ───────────────────────────────────────
  const handleExecute = async () => {
    setLoading(true);
    try {
      const rowData = await readFileRows();
      const res = await api.post('/import/students/execute', {
        fileName: parseResult.fileName,
        fileSize: parseResult.fileSize,
        rows: rowData,
        mapping,
        importMode
      });

      if (res.data.success) {
        setExecuteResult(res.data);
        setStep(4);
        toast.success(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Download Error Report ──────────────────────────────────────────────────
  const downloadErrorReport = (errors) => {
    if (!errors || errors.length === 0) return;
    const wb = XLSX.utils.book_new();
    const rows = [['Row', 'Error Message'], ...errors.map(e => [e.row, e.message])];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 10 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Errors');
    XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    const blob = new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_errors_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Download Template ──────────────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/import/template', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'LabEval_Student_Import_Template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch {
      toast.error('Failed to download template');
    }
  };

  const resetAll = () => {
    setStep(0);
    setFile(null);
    setParseResult(null);
    setMapping({});
    setPreviewData(null);
    setImportMode('upsert');
    setExecuteResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Upload size={20} className="text-white" />
            </div>
            Import Students
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Upload an Excel file to bulk-import student records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Download size={16} /> Template
          </button>
          <button
            onClick={() => navigate('/admin/import-history')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <History size={16} /> History
          </button>
        </div>
      </div>

      {/* Step Indicator */}
      <StepBar current={step} />

      <AnimatePresence mode="wait">

        {/* ── STEP 0: Upload ─────────────────────────────────────────────────── */}
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="space-y-6">

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-2xl p-12 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all group"
            >
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={48} className="text-indigo-500 animate-spin" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Parsing file…</p>
                </div>
              ) : file && parseResult ? (
                <div className="flex flex-col items-center gap-3">
                  <FileCheck size={48} className="text-emerald-500" />
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{parseResult.fileName}</p>
                  <p className="text-sm text-slate-500">{parseResult.totalRows} rows found · {parseResult.headers.length} columns</p>
                  <p className="text-xs text-slate-400">Click to select a different file</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileSpreadsheet size={36} className="text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Drop your Excel file here</p>
                    <p className="text-sm text-slate-400 mt-1">or click to browse · .xlsx, .xls · max 10 MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3">
              <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-semibold mb-1">Required columns in your Excel file:</p>
                <p>Roll Number · Name · Department · Series</p>
                <p className="mt-1 text-blue-500 dark:text-blue-400">All other columns (email, phone, section, etc.) are optional. Download the template to see the expected format.</p>
              </div>
            </div>

            {/* Sample Rows Preview */}
            {parseResult?.sampleRows?.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Preview (first 5 rows)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        {parseResult.headers.map(h => (
                          <th key={h} className="text-left px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.sampleRows.map((row, i) => (
                        <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                          {parseResult.headers.map(h => (
                            <td key={h} className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{row[h] || '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Next Button */}
            {parseResult && (
              <div className="flex justify-end">
                <button onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all">
                  Map Columns <ArrowRight size={18} />
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── STEP 1: Column Mapping ──────────────────────────────────────────── */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="space-y-6">

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h2 className="font-bold text-slate-800 dark:text-white">Map Excel Columns → Database Fields</h2>
                <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                  {Object.values(mapping).filter(Boolean).length} / {parseResult?.headers?.length} mapped
                </span>
              </div>
              <div className="p-6 space-y-3">
                {parseResult?.headers?.map(header => (
                  <div key={header} className="flex items-center gap-4">
                    <div className="flex-1 min-w-0 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-mono text-slate-700 dark:text-slate-300 truncate">
                      {header}
                    </div>
                    <ArrowRight size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
                    <select
                      value={mapping[header] || ''}
                      onChange={e => setMapping(m => ({ ...m, [header]: e.target.value }))}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {DB_FIELDS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Import Mode Selection */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="font-bold text-slate-800 dark:text-white">Import Mode</h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {IMPORT_MODES.map(mode => (
                  <button key={mode.id} onClick={() => setImportMode(mode.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      importMode === mode.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{mode.icon}</span>
                      <span className="font-semibold text-sm text-slate-800 dark:text-white">{mode.label}</span>
                      {importMode === mode.id && <CheckCircle2 size={16} className="text-indigo-500 ml-auto" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{mode.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep(0)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <ArrowLeft size={16} /> Back
              </button>
              <button onClick={handlePreview} disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all disabled:opacity-50">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
                Preview Import
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Preview ─────────────────────────────────────────────────── */}
        {step === 2 && previewData && (
          <motion.div key="step2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="space-y-6">

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <StatCard label="Total Rows" value={previewData.summary.totalRows} color="from-slate-500 to-slate-600" icon={FileSpreadsheet} />
              <StatCard label="Valid Rows" value={previewData.summary.validRows} color="from-emerald-500 to-green-600" icon={CheckCircle2} />
              <StatCard label="Invalid Rows" value={previewData.summary.invalidRows} color="from-rose-500 to-red-600" icon={AlertCircle} />
              <StatCard label="Duplicates" value={previewData.summary.duplicateRows} color="from-amber-500 to-orange-500" icon={AlertTriangle} />
              <StatCard label="Existing Students" value={previewData.summary.existingStudents} color="from-blue-500 to-indigo-600" icon={Users} />
              <StatCard label="New Students" value={previewData.summary.newStudents} color="from-purple-500 to-violet-600" icon={Users} />
              <StatCard label="To Insert" value={previewData.summary.toInsert} color="from-emerald-500 to-teal-600" icon={CheckCircle2} />
              <StatCard label="To Update" value={previewData.summary.toUpdate} color="from-amber-500 to-yellow-600" icon={Pencil} />
            </div>

            {/* Mode Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-500 dark:text-slate-400">Mode:</span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                {IMPORT_MODES.find(m => m.id === importMode)?.label || importMode}
              </span>
              {importMode === 'dry_run' && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                  🔍 No changes will be made
                </span>
              )}
            </div>

            {/* Error List */}
            {previewData.errors?.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-semibold text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> Validation Issues ({previewData.totalErrors})
                  </h3>
                  <button onClick={() => downloadErrorReport(previewData.errors)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 transition-colors">
                    <Download size={14} /> Download Report
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {previewData.errors.slice(0, 50).map((err, i) => (
                    <div key={i} className="px-5 py-2.5 border-t border-slate-50 dark:border-slate-800/50 flex items-start gap-3">
                      <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded mt-0.5 shrink-0">
                        Row {err.row}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-400">{err.message}</span>
                    </div>
                  ))}
                  {previewData.totalErrors > 50 && (
                    <div className="px-5 py-3 text-xs text-slate-400 text-center">
                      + {previewData.totalErrors - 50} more errors. Download the error report for the full list.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <ArrowLeft size={16} /> Back
              </button>
              <button onClick={() => setStep(3)}
                disabled={previewData.summary.validRows === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {importMode === 'dry_run' ? <><Eye size={18} /> Confirm Dry Run</> : <><Play size={18} /> Proceed to Import</>}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: Confirm & Execute ───────────────────────────────────────── */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="space-y-6">

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 text-center">
              {importMode === 'dry_run' ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
                    <Eye size={32} className="text-purple-500" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Confirm Dry Run</h2>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">
                    No changes will be made to the database. This will only simulate the import.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-4">
                    <Play size={32} className="text-indigo-500" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Ready to Import</h2>
                  <p className="text-slate-500 dark:text-slate-400 mb-2">
                    You are about to import <strong className="text-slate-700 dark:text-slate-200">{previewData?.summary.validRows} valid records</strong> using mode:
                  </p>
                  <p className="text-indigo-600 dark:text-indigo-400 font-semibold text-lg mb-6">
                    {IMPORT_MODES.find(m => m.id === importMode)?.label}
                  </p>
                  {previewData?.summary.invalidRows > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-6 text-sm text-amber-700 dark:text-amber-300">
                      <AlertTriangle size={16} className="inline mr-2" />
                      {previewData.summary.invalidRows} invalid rows will be skipped
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Back to Preview
                </button>
                <button onClick={handleExecute} disabled={loading}
                  className={`inline-flex items-center gap-2 px-8 py-2.5 rounded-xl text-white font-semibold shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all disabled:opacity-50 bg-gradient-to-r ${
                    importMode === 'dry_run' ? 'from-purple-600 to-violet-600' : 'from-indigo-600 to-purple-600'
                  }`}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : importMode === 'dry_run' ? <Eye size={18} /> : <Play size={18} />}
                  {loading ? 'Processing…' : importMode === 'dry_run' ? 'Run Dry Run' : 'Execute Import'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: Result ──────────────────────────────────────────────────── */}
        {step === 4 && executeResult && (
          <motion.div key="step4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="space-y-6">

            {/* Success Banner */}
            <div className={`rounded-2xl p-6 border ${
              importMode === 'dry_run'
                ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 size={28} className={importMode === 'dry_run' ? 'text-purple-500' : 'text-emerald-500'} />
                <h2 className={`text-xl font-bold ${importMode === 'dry_run' ? 'text-purple-700 dark:text-purple-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {importMode === 'dry_run' ? 'Dry Run Complete' : 'Import Successful!'}
                </h2>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm">{executeResult.message}</p>
              {executeResult.jobId && (
                <p className="text-xs text-slate-400 mt-1">Job ID: <span className="font-mono">{executeResult.jobId}</span></p>
              )}
            </div>

            {/* Result Stats */}
            {executeResult.stats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <StatCard label="Inserted" value={executeResult.stats.inserted || 0} color="from-emerald-500 to-green-600" icon={CheckCircle2} />
                <StatCard label="Updated" value={executeResult.stats.updated || 0} color="from-blue-500 to-indigo-600" icon={Pencil} />
                <StatCard label="Skipped" value={executeResult.stats.skipped || 0} color="from-slate-400 to-slate-500" icon={SkipForward} />
                <StatCard label="Failed" value={executeResult.stats.failed || 0} color="from-rose-500 to-red-600" icon={AlertCircle} />
              </div>
            )}

            {/* Errors */}
            {executeResult.errors?.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-semibold text-rose-600 text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> Import Errors ({executeResult.totalErrors || executeResult.errors.length})
                  </h3>
                  <button onClick={() => downloadErrorReport(executeResult.errors)}
                    className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                    <Download size={14} /> Download
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {executeResult.errors.slice(0, 20).map((err, i) => (
                    <div key={i} className="px-5 py-2 border-t border-slate-50 dark:border-slate-800/50 flex items-start gap-3">
                      <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded shrink-0">Row {err.row}</span>
                      <span className="text-xs text-slate-600 dark:text-slate-400">{err.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={resetAll}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <RefreshCw size={16} /> Import Another File
              </button>
              <button onClick={() => navigate('/admin/students')}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold shadow-lg hover:-translate-y-0.5 transition-all">
                <Users size={18} /> View Students
              </button>
              <button onClick={() => navigate('/admin/import-history')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <History size={16} /> Import History
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
