import React, { useState, useEffect } from 'react';
import { 
  Database, Upload, Download, Trash2, CheckCircle2, AlertTriangle, 
  FileSpreadsheet, FileJson, Layers, RefreshCw, Shield, Search, Filter, 
  Eye, Check, X, AlertCircle, ArrowRight, BookOpen, Users, GraduationCap, Building2, Calendar
} from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';

export default function AdminDataManagementPage() {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('import'); // 'overview' | 'import' | 'bulk' | 'export' | 'history'

  // Import State
  const [importType, setImportType] = useState('xlsx'); // 'xlsx' | 'json'
  const [targetEntity, setTargetEntity] = useState('students'); // 'students' | 'teachers' | 'courses'
  const [file, setFile] = useState(null);
  const [jsonText, setJsonText] = useState('');
  const [duplicatePolicy, setDuplicatePolicy] = useState('skip'); // 'skip' | 'update'
  const [metadata, setMetadata] = useState({ department: 'ETE', series: '22', session: '2022-2023', semester: '1st' });
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [validationData, setValidationData] = useState(null);
  const [commitResult, setCommitResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Export State
  const [exportEntity, setExportEntity] = useState('students');
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [exportDept, setExportDept] = useState('ALL');
  const [exportSeries, setExportSeries] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  // Bulk Operations State
  const [bulkEntity, setBulkEntity] = useState('students');
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkRecords, setBulkRecords] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // History State
  const [importJobs, setImportJobs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch bulk candidate records
  const fetchBulkCandidates = async () => {
    try {
      setBulkActionLoading(true);
      const url = bulkEntity === 'students' 
        ? `/api/admin/students?limit=50&search=${encodeURIComponent(bulkSearch)}`
        : `/api/admin/courses?search=${encodeURIComponent(bulkSearch)}`;
      const res = await axios.get(url);
      setBulkRecords(bulkEntity === 'students' ? (res.data.students || []) : (res.data.courses || []));
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bulk') {
      fetchBulkCandidates();
    } else if (activeTab === 'history') {
      fetchImportHistory();
    }
  }, [activeTab, bulkEntity]);

  const fetchImportHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await axios.get('/api/admin/imports');
      setImportJobs(res.data.jobs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Step 1: Upload & Preview ──
  const handlePreview = async () => {
    setErrorMessage('');
    setPreviewData(null);
    setValidationData(null);
    setCommitResult(null);

    try {
      setLoading(true);
      if (importType === 'xlsx') {
        if (!file) {
          setErrorMessage('Please select an Excel (.xlsx) file to upload.');
          return;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('targetEntity', targetEntity);
        formData.append('metadata', JSON.stringify(metadata));

        const res = await axios.post('/api/admin/imports/xlsx/preview', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setPreviewData(res.data);
      } else {
        if (!jsonText.trim()) {
          setErrorMessage('Please paste valid JSON array content.');
          return;
        }
        let parsed;
        try {
          parsed = JSON.parse(jsonText);
        } catch (e) {
          setErrorMessage(`Invalid JSON syntax: ${e.message}`);
          return;
        }
        if (!Array.isArray(parsed)) {
          setErrorMessage('JSON must be an array of objects.');
          return;
        }

        const res = await axios.post('/api/admin/imports/json/preview', {
          data: parsed,
          targetEntity,
          metadata
        });
        setPreviewData(res.data);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to preview file');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Validate ──
  const handleValidate = async () => {
    if (!previewData?.importId) return;
    setErrorMessage('');
    try {
      setLoading(true);
      const endpoint = importType === 'xlsx' ? '/api/admin/imports/xlsx/validate' : '/api/admin/imports/json/validate';
      const res = await axios.post(endpoint, {
        importId: previewData.importId,
        duplicatePolicy,
        metadata
      });
      setValidationData(res.data);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Commit ──
  const handleCommit = async () => {
    if (!previewData?.importId) return;
    setErrorMessage('');
    try {
      setLoading(true);
      const endpoint = importType === 'xlsx' ? '/api/admin/imports/xlsx/commit' : '/api/admin/imports/json/commit';
      const res = await axios.post(endpoint, {
        importId: previewData.importId,
        duplicatePolicy
      });
      setCommitResult(res.data);
      setPreviewData(null);
      setValidationData(null);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Commit failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Export Handler ──
  const handleExport = async () => {
    try {
      setExportLoading(true);
      const params = new URLSearchParams({
        format: exportFormat,
        ...(exportDept !== 'ALL' && { department: exportDept }),
        ...(exportSeries && { series: exportSeries })
      });
      
      const res = await axios.get(`/api/admin/export/${exportEntity}?${params.toString()}`, {
        responseType: 'blob'
      });

      const blob = new Blob([res.data]);
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `LabEval_${exportEntity}_export.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert(`Export error: ${err.response?.data?.message || err.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  // ── Safe Bulk Delete ──
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} ${bulkEntity}? Records with active academic dependencies will be safely skipped.`)) {
      return;
    }

    try {
      setBulkActionLoading(true);
      const res = await axios.post('/api/admin/bulk-delete', {
        entity: bulkEntity,
        ids: selectedIds
      });
      setBulkResult(res.data);
      fetchBulkCandidates();
    } catch (err) {
      alert(`Bulk delete error: ${err.response?.data?.message || err.message}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bgCard = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Database className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Master Data & Database Operations
            </h1>
          </div>
          <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">
            System Administrator authority center: XLSX & JSON pipelines, referential integrity safety, and full academic datasets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Shield className="w-3.5 h-3.5" />
            Admin Exclusive Authority
          </span>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        {[
          { id: 'import', label: 'Import XLSX / JSON', icon: Upload },
          { id: 'bulk', label: 'Bulk Database Operations', icon: Trash2 },
          { id: 'export', label: 'Export Data', icon: Download },
          { id: 'history', label: 'Import Audit & History', icon: Layers }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                active 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Error Banner ── */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm font-medium">{errorMessage}</div>
          <button onClick={() => setErrorMessage('')} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── TAB 1: IMPORT XLSX / JSON ── */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Commit Success Notification */}
          {commitResult && (
            <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5 text-emerald-600" />
              <div className="space-y-1">
                <div className="font-bold text-base">{commitResult.message}</div>
                <div className="text-xs space-x-3 text-emerald-800 dark:text-emerald-300">
                  <span>Created: <strong>{commitResult.createdCount}</strong></span>
                  <span>Updated: <strong>{commitResult.updatedCount}</strong></span>
                  <span>Failed: <strong>{commitResult.failedCount}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Card */}
          <div className={`p-6 rounded-2xl border ${bgCard} shadow-sm space-y-5`}>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" />
              1. Select Target & Format
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Target Master Entity
                </label>
                <select
                  value={targetEntity}
                  onChange={e => { setTargetEntity(e.target.value); setPreviewData(null); }}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white"
                >
                  <option value="students">Students (User + Profile Sync)</option>
                  <option value="teachers">Teachers (User + Faculty Profile)</option>
                  <option value="courses">Courses (Master Catalog)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Import Source Format
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setImportType('xlsx'); setPreviewData(null); }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border ${
                      importType === 'xlsx' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => { setImportType('json'); setPreviewData(null); }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border ${
                      importType === 'json' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <FileJson className="w-4 h-4" /> JSON Array
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Duplicate Policy
                </label>
                <select
                  value={duplicatePolicy}
                  onChange={e => setDuplicatePolicy(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white"
                >
                  <option value="skip">Skip Existing Records</option>
                  <option value="update">Update Existing Records</option>
                </select>
              </div>
            </div>

            {/* Entity Metadata Defaults */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Default Academic Metadata (Applied if missing in source file)
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Department:</span>
                  <input
                    type="text"
                    value={metadata.department}
                    onChange={e => setMetadata({ ...metadata, department: e.target.value.toUpperCase() })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Series:</span>
                  <input
                    type="text"
                    value={metadata.series}
                    onChange={e => setMetadata({ ...metadata, series: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Academic Session:</span>
                  <input
                    type="text"
                    value={metadata.session}
                    onChange={e => setMetadata({ ...metadata, session: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Semester:</span>
                  <input
                    type="text"
                    value={metadata.semester}
                    onChange={e => setMetadata({ ...metadata, semester: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* File Upload / JSON Text Input */}
            {importType === 'xlsx' ? (
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  id="xlsx-upload"
                  accept=".xlsx, .xls"
                  onChange={e => setFile(e.target.files[0])}
                  className="hidden"
                />
                <label htmlFor="xlsx-upload" className="cursor-pointer space-y-2 block">
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-blue-600" />
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {file ? file.name : 'Click to choose an Excel file (.xlsx) or drag and drop'}
                  </div>
                  <p className="text-xs text-slate-400">Maximum file size: 15MB. All sheets inspected automatically.</p>
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  JSON Data Array
                </label>
                <textarea
                  rows={6}
                  value={jsonText}
                  onChange={e => setJsonText(e.target.value)}
                  placeholder={`[\n  {\n    "rollNumber": "2203001",\n    "name": "Tanvir Hasan",\n    "department": "ETE",\n    "series": "22"\n  }\n]`}
                  className="w-full p-3 font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            )}

            <button
              onClick={handlePreview}
              disabled={loading || (importType === 'xlsx' && !file) || (importType === 'json' && !jsonText)}
              className="px-6 py-2.5 rounded-lg font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Inspect & Preview Records
            </button>
          </div>

          {/* Preview & Validation Results */}
          {previewData && (
            <div className={`p-6 rounded-2xl border ${bgCard} shadow-sm space-y-5`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    2. Parsed Dataset Preview ({previewData.totalRows} rows)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Headers detected: {previewData.headers.join(', ')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleValidate}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-sm"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    Dry-Run Validate against Database
                  </button>
                </div>
              </div>

              {/* Sample Table */}
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 uppercase font-bold text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5">#</th>
                      {previewData.headers.map(h => (
                        <th key={h} className="px-3 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                    {previewData.sampleRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                        {previewData.headers.map(h => (
                          <td key={h} className="px-3 py-2 truncate max-w-xs">{String(r[h] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Validation Summary */}
              {validationData && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Validation Summary:</span>
                    <div className="flex gap-4 text-xs font-bold">
                      <span className="text-emerald-600">Valid: {validationData.summary.validCount}</span>
                      <span className="text-amber-600">Duplicates: {validationData.summary.duplicateCount}</span>
                      <span className="text-red-600">Errors: {validationData.summary.errorCount}</span>
                    </div>
                  </div>

                  {validationData.duplicates.length > 0 && (
                    <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded border border-amber-500/20">
                      <strong>Duplicates found:</strong> Policy set to "{duplicatePolicy}". {duplicatePolicy === 'skip' ? 'Duplicates will be ignored.' : 'Duplicates will update existing records.'}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={handleCommit}
                      disabled={loading || !validationData.summary.readyToCommit}
                      className="px-6 py-2.5 rounded-lg text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-md disabled:opacity-50"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Execute Commit to MongoDB (Atomic / Bulk)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: BULK DATABASE OPERATIONS ── */}
      {activeTab === 'bulk' && (
        <div className={`p-6 rounded-2xl border ${bgCard} shadow-sm space-y-5`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                Referential Integrity Safe Bulk Delete & Operations
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Deletions are automatically scanned for active attendance, marks, projects, and enrollments. Records with active data will be safely protected and skipped (HTTP 409 Conflict protection).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={bulkEntity}
                onChange={e => setBulkEntity(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
              >
                <option value="students">Students</option>
                <option value="courses">Courses</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter..."
                  value={bulkSearch}
                  onChange={e => setBulkSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchBulkCandidates()}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <button
                onClick={fetchBulkCandidates}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-800"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {bulkResult && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 space-y-2">
              <div className="font-bold">{bulkResult.message}</div>
              {bulkResult.skipped.length > 0 && (
                <div className="text-amber-600 dark:text-amber-400">
                  <strong>Protected Records:</strong> {bulkResult.skipped.map(s => `${s.rollNumber || s.courseCode} (${s.reason})`).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Bulk Selection Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800/80 uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-3 py-2.5 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === bulkRecords.length && bulkRecords.length > 0}
                      onChange={e => {
                        if (e.target.checked) setSelectedIds(bulkRecords.map(r => r._id));
                        else setSelectedIds([]);
                      }}
                    />
                  </th>
                  <th className="px-3 py-2.5">Identifier</th>
                  <th className="px-3 py-2.5">Name / Title</th>
                  <th className="px-3 py-2.5">Department</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {bulkRecords.map(r => (
                  <tr key={r._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r._id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedIds([...selectedIds, r._id]);
                          else setSelectedIds(selectedIds.filter(id => id !== r._id));
                        }}
                      />
                    </td>
                    <td className="px-3 py-2 font-bold font-mono text-slate-900 dark:text-white">
                      {r.rollNumber || r.courseCode}
                    </td>
                    <td className="px-3 py-2">{r.name || r.courseName}</td>
                    <td className="px-3 py-2">{r.department || r.departmentCode}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-400'
                      }`}>
                        {r.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              Selected: <strong>{selectedIds.length}</strong> of {bulkRecords.length}
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={selectedIds.length === 0 || bulkActionLoading}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {bulkActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete Selected ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 3: DATA EXPORT ── */}
      {activeTab === 'export' && (
        <div className={`p-6 rounded-2xl border ${bgCard} shadow-sm space-y-6 max-w-2xl`}>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              Download Master Data Records
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Export database records in XLSX or JSON format. Authentication credentials and password hashes are automatically omitted.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Target Entity
              </label>
              <select
                value={exportEntity}
                onChange={e => setExportEntity(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
              >
                <option value="students">Students</option>
                <option value="teachers">Teachers</option>
                <option value="courses">Course Catalog</option>
                <option value="academic-sessions">Academic Sessions</option>
                <option value="teaching-assignments">Teaching Assignments</option>
                <option value="supervision">Project Supervision Allocations</option>
                <option value="electives">Elective Offerings</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Format
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setExportFormat('xlsx')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 ${
                    exportFormat === 'xlsx' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" /> XLSX
                </button>
                <button
                  onClick={() => setExportFormat('json')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 ${
                    exportFormat === 'json' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <FileJson className="w-4 h-4" /> JSON
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Department Filter
              </label>
              <input
                type="text"
                value={exportDept}
                onChange={e => setExportDept(e.target.value.toUpperCase())}
                placeholder="ALL or ETE, CSE, etc."
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Series Filter (Optional)
              </label>
              <input
                type="text"
                value={exportSeries}
                onChange={e => setExportSeries(e.target.value)}
                placeholder="e.g. 22"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {exportLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Generate & Download Export
          </button>
        </div>
      )}

      {/* ── TAB 4: IMPORT AUDIT & HISTORY ── */}
      {activeTab === 'history' && (
        <div className={`p-6 rounded-2xl border ${bgCard} shadow-sm space-y-4`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Administrative Import History & Audit Records
            </h2>
            <button
              onClick={fetchImportHistory}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800/80 uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">File Name / Job ID</th>
                  <th className="px-3 py-2.5">Admin User</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Total Rows</th>
                  <th className="px-3 py-2.5">Inserted</th>
                  <th className="px-3 py-2.5">Updated</th>
                  <th className="px-3 py-2.5">Errors</th>
                  <th className="px-3 py-2.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {importJobs.map(job => (
                  <tr key={job._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2 font-mono text-slate-900 dark:text-white font-bold">
                      {job.fileName || job.jobId}
                    </td>
                    <td className="px-3 py-2">{job.uploadedByName || 'Admin'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">{job.totalRows}</td>
                    <td className="px-3 py-2 text-emerald-600 font-bold">{job.insertedCount}</td>
                    <td className="px-3 py-2 text-blue-600 font-bold">{job.updatedCount}</td>
                    <td className="px-3 py-2 text-red-600 font-bold">{job.errorCount}</td>
                    <td className="px-3 py-2 text-slate-400">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
