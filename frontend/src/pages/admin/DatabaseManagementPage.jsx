import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Database, Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
  ArrowUpDown, ArrowUp, ArrowDown, Shield, Eye, Edit, Trash2,
  Download, AlertTriangle, CheckCircle2, X, ExternalLink,
  Layers, Users, GraduationCap, Building2, Calendar, BookOpen,
  Award, ClipboardList, History, FolderTree, FileSpreadsheet,
  FileJson, Check, AlertCircle, Info, Lock, Plus
} from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

// Icon mapper for dynamic entity cards
const ENTITY_ICONS = {
  Users: Users,
  GraduationCap: GraduationCap,
  Building2: Building2,
  Calendar: Calendar,
  BookOpen: BookOpen,
  Award: Award,
  ClipboardList: ClipboardList,
  Layers: Layers,
  History: History,
  FolderTree: FolderTree,
  Shield: Shield,
  Database: Database
};

export default function DatabaseManagementPage() {
  const { isDarkMode } = useTheme();

  // Registry & Overview State
  const [entities, setEntities] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [entitySearch, setEntitySearch] = useState('');

  // Active Entity Table State
  const [activeEntityKey, setActiveEntityKey] = useState(null);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [visibleColumns, setVisibleColumns] = useState({});
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Schema-Driven Create Record Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSchema, setCreateSchema] = useState(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [createFormData, setCreateFormData] = useState({});
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Modals State
  const [inspectRecord, setInspectRecord] = useState(null);
  const [editModalRecord, setEditModalRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Safe Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dependencyData, setDependencyData] = useState(null);
  const [loadingDeps, setLoadingDeps] = useState(false);
  const [deleteAction, setDeleteAction] = useState('archive'); // 'archive' | 'permanent'
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Active Entity Configuration helper
  const activeEntity = useMemo(() => {
    return entities.find(e => e.key === activeEntityKey) || null;
  }, [entities, activeEntityKey]);

  // Fetch Entities Registry
  const fetchEntities = useCallback(async () => {
    setLoadingEntities(true);
    try {
      const res = await api.get('/admin/database/entities');
      if (res.data.success) {
        setEntities(res.data.entities || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch database entity registry');
    } finally {
      setLoadingEntities(false);
    }
  }, []);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  // Initialize columns when opening an entity
  useEffect(() => {
    if (activeEntity?.listFields) {
      const initialCols = {};
      activeEntity.listFields.forEach(col => {
        initialCols[col.key] = true;
      });
      setVisibleColumns(initialCols);
    }
  }, [activeEntity]);

  // Fetch paginated entity records
  const fetchRecords = useCallback(async () => {
    if (!activeEntityKey) return;
    setLoadingRecords(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit
      });

      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (sortField) {
        params.set('sortBy', sortField);
        params.set('sortOrder', sortOrder);
      }

      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== 'ALL') params.set(k, v);
      });

      const res = await api.get(`/admin/database/${activeEntityKey}?${params.toString()}`);
      if (res.data.success) {
        setRecords(res.data.records || []);
        setPagination(res.data.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load records');
    } finally {
      setLoadingRecords(false);
    }
  }, [activeEntityKey, pagination.page, pagination.limit, searchQuery, sortField, sortOrder, filters]);

  useEffect(() => {
    if (activeEntityKey) {
      fetchRecords();
    }
  }, [activeEntityKey, pagination.page, pagination.limit, searchQuery, sortField, sortOrder, filters]);

  // Open Entity View
  const handleOpenEntity = (key) => {
    setActiveEntityKey(key);
    setSearchQuery('');
    setFilters({});
    setSortField('');
    setSortOrder('asc');
    setPagination(p => ({ ...p, page: 1 }));
  };

  // Back to Entity Registry Overview
  const handleBackToOverview = () => {
    setActiveEntityKey(null);
    setRecords([]);
    fetchEntities();
  };

  // Sorting
  const handleSort = (fieldKey) => {
    if (sortField === fieldKey) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(fieldKey);
      setSortOrder('asc');
    }
  };

  // Open Inspect Modal
  const handleInspect = async (record) => {
    try {
      const res = await api.get(`/admin/database/${activeEntityKey}/${record._id}`);
      if (res.data.success) {
        setInspectRecord(res.data);
      }
    } catch {
      setInspectRecord({ record, detailFields: Object.keys(record) });
    }
  };

  // Open Edit Modal
  const handleOpenEdit = async (record) => {
    try {
      const res = await api.get(`/admin/database/${activeEntityKey}/${record._id}`);
      if (res.data.success) {
        setEditModalRecord(res.data);
        const initialForm = {};
        (res.data.editableFields || []).forEach(f => {
          initialForm[f] = res.data.record[f] ?? '';
        });
        setEditFormData(initialForm);
      }
    } catch (err) {
      toast.error('Could not load record details for editing');
    }
  };

  // Submit Edit
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editModalRecord) return;
    setSubmittingEdit(true);
    try {
      const res = await api.patch(
        `/admin/database/${activeEntityKey}/${editModalRecord.record._id}`,
        editFormData
      );
      if (res.data.success) {
        toast.success(res.data.message || 'Record updated successfully');
        setEditModalRecord(null);
        fetchRecords();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update record');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Open Safe Delete Modal & Check Dependencies
  const handleOpenDelete = async (record) => {
    setDeleteTarget(record);
    setDependencyData(null);
    setConfirmDeleteText('');
    setDeleteAction('archive');
    setLoadingDeps(true);

    try {
      const res = await api.get(`/admin/database/${activeEntityKey}/${record._id}/dependencies`);
      if (res.data.success) {
        setDependencyData(res.data);
      }
    } catch {
      setDependencyData({ dependencyCount: 0, dependencies: [] });
    } finally {
      setLoadingDeps(false);
    }
  };

  // Submit Delete
  const handleSubmitDelete = async () => {
    if (!deleteTarget) return;
    setSubmittingDelete(true);
    try {
      const res = await api.delete(`/admin/database/${activeEntityKey}/${deleteTarget._id}`, {
        data: {
          action: deleteAction,
          confirmText: confirmDeleteText
        }
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Action executed successfully');
        setDeleteTarget(null);
        fetchRecords();
        fetchEntities();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete record');
    } finally {
      setSubmittingDelete(false);
    }
  };

  // Open Schema-Driven Create Modal
  const handleOpenCreateModal = async () => {
    if (!activeEntityKey) return;
    setShowCreateModal(true);
    setLoadingSchema(true);
    setCreateFormData({});
    setShowCreatePassword(false);
    try {
      const res = await api.get(`/admin/database/${activeEntityKey}/schema`);
      if (res.data.success) {
        setCreateSchema(res.data);
        const defaults = {};
        (res.data.createFields || []).forEach(f => {
          if (f.defaultValue !== undefined) {
            defaults[f.key] = f.defaultValue;
          }
        });
        setCreateFormData(defaults);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load table creation schema');
      setShowCreateModal(false);
    } finally {
      setLoadingSchema(false);
    }
  };

  // Submit New Record Creation
  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    if (!activeEntityKey) return;

    // Check required fields
    const missing = [];
    (createSchema?.createFields || []).forEach(f => {
      if (f.required) {
        const val = createFormData[f.key];
        if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
          missing.push(f.label);
        }
      }
    });

    if (missing.length > 0) {
      toast.error(`Please provide required field(s): ${missing.join(', ')}`);
      return;
    }

    setSubmittingCreate(true);
    try {
      const res = await api.post(`/admin/database/${activeEntityKey}`, createFormData);
      if (res.data.success) {
        toast.success(res.data.message || 'Record created successfully');
        setShowCreateModal(false);
        fetchRecords();
        fetchEntities();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create record in database');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Export Data (Client-side JSON / CSV)
  const handleExport = (format = 'json') => {
    if (!records.length) {
      toast.info('No records currently loaded to export');
      return;
    }

    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${activeEntityKey}_export_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success(`Exported ${records.length} records as JSON`);
    } else {
      // CSV Export
      const headers = Object.keys(records[0]).filter(k => !k.startsWith('_') && k !== 'password');
      const csvRows = [
        headers.join(','),
        ...records.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
      ];
      const csvStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', csvStr);
      downloadAnchor.setAttribute('download', `${activeEntityKey}_export_${Date.now()}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success(`Exported ${records.length} records as CSV`);
    }
  };

  // Filtered Entities for Overview View
  const filteredEntities = useMemo(() => {
    return entities.filter(ent => {
      const matchesCategory = selectedCategory === 'ALL' || ent.category === selectedCategory;
      const matchesSearch = !entitySearch ||
        ent.label.toLowerCase().includes(entitySearch.toLowerCase()) ||
        ent.modelName.toLowerCase().includes(entitySearch.toLowerCase()) ||
        ent.description.toLowerCase().includes(entitySearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [entities, selectedCategory, entitySearch]);

  const totalAllRecords = useMemo(() => {
    return entities.reduce((acc, e) => acc + (e.recordsCount || 0), 0);
  }, [entities]);

  return (
    <div className="space-y-6 pb-20">
      
      {/* ── HEADER ── */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                <Database size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Central Database Management Portal
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Live Cluster
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Universal database registry with strict RBAC, projection security, and dependency-validated CRUD operations.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {activeEntityKey && (
              <button
                onClick={handleBackToOverview}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#172033] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <ChevronLeft size={16} /> All Entities
              </button>
            )}
            <button
              onClick={() => {
                if (activeEntityKey) fetchRecords();
                else fetchEntities();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition"
            >
              <RefreshCw size={14} className={loadingEntities || loadingRecords ? 'animate-spin' : ''} />
              Sync DB
            </button>
          </div>
        </div>
      </div>

      {/* ── VIEW 1: ENTITY REGISTRY OVERVIEW ── */}
      {!activeEntityKey && (
        <div className="space-y-6">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-xl p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Entities</span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{entities.length}</div>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Mongoose Collections</span>
            </div>
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-xl p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Records</span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{totalAllRecords.toLocaleString()}</div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Persisted in MongoDB</span>
            </div>
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-xl p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Manageable Entities</span>
              <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                {entities.filter(e => e.category === 'MANAGEABLE').length}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Full CRUD Allowed</span>
            </div>
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-xl p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Security Protected</span>
              <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                {entities.filter(e => e.category === 'SYSTEM_PROTECTED' || e.category === 'READ_ONLY').length}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Read-Only / Protected</span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['ALL', 'MANAGEABLE', 'READ_ONLY', 'SYSTEM_PROTECTED'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#243244] hover:bg-slate-50'
                  }`}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={entitySearch}
                onChange={e => setEntitySearch(e.target.value)}
                placeholder="Search database entity..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#243244] bg-white dark:bg-[#111827] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Entity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEntities.map(ent => {
              const IconComponent = ENTITY_ICONS[ent.icon] || Database;
              const isManageable = ent.category === 'MANAGEABLE';
              const isReadOnly = ent.category === 'READ_ONLY';
              const isProtected = ent.category === 'SYSTEM_PROTECTED';

              return (
                <div
                  key={ent.key}
                  className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <IconComponent size={18} />
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        isManageable
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          : isReadOnly
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                      }`}>
                        {ent.category.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{ent.label}</h3>
                    <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-0.5">Model: {ent.modelName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {ent.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-[#243244] flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Record Count</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                        {ent.recordsCount.toLocaleString()}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenEntity(ent.key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700 transition"
                    >
                      Open Records <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VIEW 2: ACTIVE ENTITY TABLE VIEW ── */}
      {activeEntityKey && activeEntity && (
        <div className="space-y-4">
          
          {/* Entity Control Bar */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  {activeEntity.label}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {pagination.total} Total
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeEntity.description} (Server-side paginated & indexed)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {activeEntity.canCreate && (
                  <button
                    onClick={handleOpenCreateModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm hover:brightness-110 transition"
                    style={{ backgroundColor: activeEntity.colorTheme?.accent || '#2563eb' }}
                  >
                    <Plus size={14} /> Add New Record
                  </button>
                )}
                <button
                  onClick={() => handleExport('csv')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-[#172033] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  <FileSpreadsheet size={13} /> CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-[#172033] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  <FileJson size={13} /> JSON
                </button>
                
                {/* Column Visibility Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowColumnSelector(v => !v)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-[#172033] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                  >
                    <Filter size={13} /> Columns
                  </button>

                  {showColumnSelector && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-xl p-3 shadow-lg z-30 space-y-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block border-b border-slate-100 dark:border-[#243244] pb-1">
                        Select Columns
                      </span>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {(activeEntity.listFields || []).map(f => (
                          <label key={f.key} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={visibleColumns[f.key] !== false}
                              onChange={e => setVisibleColumns(prev => ({ ...prev, [f.key]: e.target.checked }))}
                              className="rounded text-blue-600 focus:ring-0"
                            />
                            {f.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search & Dynamic Filter Inputs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-slate-100 dark:border-[#243244]">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeEntity.label.toLowerCase()}...`}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Dynamic Filter Selectors */}
              {(activeEntity.filterFields || []).map(flt => (
                <div key={flt.key} className="min-w-[130px]">
                  <select
                    value={filters[flt.key] || 'ALL'}
                    onChange={e => setFilters(prev => ({ ...prev, [flt.key]: e.target.value }))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">All {flt.label}</option>
                    {(flt.options || []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-[#172033] border-b border-slate-200 dark:border-[#243244] text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    {(activeEntity.listFields || []).filter(f => visibleColumns[f.key] !== false).map(col => (
                      <th
                        key={col.key}
                        onClick={() => col.sortable && handleSort(col.key)}
                        className={`px-4 py-3 ${col.sortable ? 'cursor-pointer select-none hover:text-blue-600' : ''}`}
                      >
                        <div className="flex items-center gap-1.5">
                          {col.label}
                          {col.sortable && (
                            sortField === col.key ? (
                              sortOrder === 'asc' ? <ArrowUp size={12} className="text-blue-600" /> : <ArrowDown size={12} className="text-blue-600" />
                            ) : <ArrowUpDown size={11} className="text-slate-400" />
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-[#243244]">
                  {loadingRecords ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-slate-400">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                        Querying MongoDB cluster...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-slate-400">
                        <Database size={28} className="mx-auto mb-2 opacity-40" />
                        No records match the active search or filters.
                      </td>
                    </tr>
                  ) : (
                    records.map(row => (
                      <tr key={row._id} className="hover:bg-slate-50/70 dark:hover:bg-[#172033]/60 transition">
                        {(activeEntity.listFields || []).filter(f => visibleColumns[f.key] !== false).map(col => {
                          const val = row[col.key];

                          if (col.badge) {
                            const isPositive = ['active', 'ACTIVE', 'ENROLLED', 'Healthy'].includes(val);
                            const isNegative = ['inactive', 'INACTIVE', 'SUSPENDED', 'cancelled'].includes(val);
                            return (
                              <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                  isPositive
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                    : isNegative
                                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}>
                                  {String(val || 'N/A')}
                                </span>
                              </td>
                            );
                          }

                          if (col.date) {
                            return (
                              <td key={col.key} className="px-4 py-3 whitespace-nowrap text-slate-500">
                                {val ? new Date(val).toLocaleDateString() : '—'}
                              </td>
                            );
                          }

                          return (
                            <td key={col.key} className="px-4 py-3 whitespace-nowrap font-medium text-slate-900 dark:text-white">
                              {val !== undefined && val !== null ? String(val) : '—'}
                            </td>
                          );
                        })}

                        {/* Actions */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleInspect(row)}
                              title="Inspect record"
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              <Eye size={14} />
                            </button>
                            {activeEntity.canEdit && (
                              <button
                                onClick={() => handleOpenEdit(row)}
                                title="Edit record"
                                className="p-1 rounded-md text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition"
                              >
                                <Edit size={14} />
                              </button>
                            )}
                            {activeEntity.canDelete && (
                              <button
                                onClick={() => handleOpenDelete(row)}
                                title="Delete or Archive record"
                                className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="bg-slate-50 dark:bg-[#172033] px-4 py-3 border-t border-slate-200 dark:border-[#243244] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Showing {records.length ? (pagination.page - 1) * pagination.limit + 1 : 0} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
              </span>

              <div className="flex items-center gap-2">
                <select
                  value={pagination.limit}
                  onChange={e => setPagination(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                  className="px-2 py-1 rounded-md border border-slate-200 dark:border-[#243244] bg-white dark:bg-[#111827] text-xs"
                >
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>

                <div className="flex items-center gap-1">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                    className="p-1.5 rounded-md border border-slate-200 dark:border-[#243244] disabled:opacity-40 hover:bg-white dark:hover:bg-[#111827]"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-2 font-semibold">
                    Page {pagination.page} of {pagination.totalPages || 1}
                  </span>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                    className="p-1.5 rounded-md border border-slate-200 dark:border-[#243244] disabled:opacity-40 hover:bg-white dark:hover:bg-[#111827]"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── INSPECT RECORD MODAL ── */}
      {inspectRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#243244] pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Info size={18} className="text-blue-500" />
                Record Inspection: {inspectRecord.label || activeEntity?.label}
              </h3>
              <button onClick={() => setInspectRecord(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {Object.entries(inspectRecord.record || {}).map(([key, val]) => (
                <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between py-1.5 border-b border-slate-50 dark:border-[#1e293b]">
                  <span className="font-mono text-slate-500 dark:text-slate-400 font-semibold">{key}</span>
                  <span className="font-medium text-slate-900 dark:text-white break-all max-w-md">
                    {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—')}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectRecord(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT RECORD MODAL ── */}
      {editModalRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#243244] pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit size={18} className="text-blue-500" />
                Edit {editModalRecord.label || activeEntity?.label} Record
              </h3>
              <button onClick={() => setEditModalRecord(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-3">
              <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1 text-xs">
                {(editModalRecord.editableFields || []).map(f => (
                  <div key={f}>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      {f}
                    </label>
                    <input
                      type="text"
                      value={editFormData[f] ?? ''}
                      onChange={e => setEditFormData(prev => ({ ...prev, [f]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#243244] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalRecord(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#172033] text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
                >
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SAFE DELETE & DEPENDENCY MODAL ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#243244] pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertTriangle size={18} />
                Confirm Record Deletion / Archive
              </h3>
              <button onClick={() => setDeleteTarget(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Target Record ID: <span className="font-mono font-bold text-slate-900 dark:text-white">{deleteTarget._id}</span>
              </p>

              {loadingDeps ? (
                <div className="py-4 text-center text-slate-400">
                  <RefreshCw size={18} className="animate-spin mx-auto mb-1 text-blue-500" />
                  Analyzing academic relationships & dependencies...
                </div>
              ) : dependencyData && (
                <div>
                  {dependencyData.dependencyCount > 0 ? (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 space-y-1.5 text-amber-800 dark:text-amber-200">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle size={15} />
                        Found {dependencyData.dependencyCount} Dependent Record(s):
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
                        {dependencyData.dependencies.map((dep, idx) => (
                          <li key={idx}>
                            <span className="font-semibold">{dep.count}</span> {dep.name}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] mt-1 pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
                        Permanent deletion may cause orphan records. <strong>Safe Archive / Deactivation</strong> is strongly recommended.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      Zero dependencies found. Safe to delete or archive.
                    </div>
                  )}
                </div>
              )}

              {/* Action Selection */}
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="deleteAction"
                    value="archive"
                    checked={deleteAction === 'archive'}
                    onChange={() => setDeleteAction('archive')}
                    className="text-blue-600 focus:ring-0"
                  />
                  Safe Archive / Deactivate (Preserves historical audit integrity)
                </label>

                <label className="flex items-center gap-2 font-semibold text-rose-600 dark:text-rose-400 cursor-pointer">
                  <input
                    type="radio"
                    name="deleteAction"
                    value="permanent"
                    checked={deleteAction === 'permanent'}
                    onChange={() => setDeleteAction('permanent')}
                    className="text-rose-600 focus:ring-0"
                  />
                  Permanent Destructive Delete (Removes document from collection)
                </label>
              </div>

              {deleteAction === 'permanent' && (
                <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-[#243244]">
                  <label className="block text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    Type "DELETE" to confirm permanent deletion:
                  </label>
                  <input
                    type="text"
                    value={confirmDeleteText}
                    onChange={e => setConfirmDeleteText(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 font-mono text-xs focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-[#243244] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#172033] text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingDelete || (deleteAction === 'permanent' && confirmDeleteText !== 'DELETE')}
                onClick={handleSubmitDelete}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition disabled:opacity-40 ${
                  deleteAction === 'permanent' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {submittingDelete
                  ? 'Processing...'
                  : deleteAction === 'permanent'
                    ? 'Permanently Delete'
                    : 'Safe Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DYNAMIC SCHEMA-DRIVEN ADD RECORD MODAL ── */}
      {showCreateModal && activeEntity && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#243244] pb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-2.5 h-7 rounded-full"
                  style={{ backgroundColor: activeEntity.colorTheme?.accent || '#2563eb' }}
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Add New Record — {activeEntity.label}
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-full font-semibold border"
                      style={{
                        backgroundColor: `${activeEntity.colorTheme?.accent || '#2563eb'}18`,
                        color: activeEntity.colorTheme?.accent || '#2563eb',
                        borderColor: `${activeEntity.colorTheme?.accent || '#2563eb'}30`
                      }}
                    >
                      {activeEntity.modelName}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Schema-validated entry. Only fields relevant to <strong className="text-slate-700 dark:text-slate-300">{activeEntity.label}</strong> are displayed.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            {loadingSchema ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                Querying backend schema & relationship references...
              </div>
            ) : !createSchema?.createFields?.length ? (
              <div className="py-8 text-center text-slate-500">
                <AlertCircle size={28} className="mx-auto mb-2 text-amber-500" />
                This table is read-only or does not accept direct record entry.
              </div>
            ) : (
              <form onSubmit={handleSubmitCreate} className="flex-1 flex flex-col overflow-hidden">
                <div className="overflow-y-auto pr-1 space-y-4 flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {createSchema.createFields.map((field) => {
                      const isFullWidth = field.type === 'textarea';
                      return (
                        <div key={field.key} className={isFullWidth ? 'sm:col-span-2' : ''}>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                            {field.label} {field.required && <span className="text-rose-500">*</span>}
                          </label>

                          {field.type === 'select' ? (
                            <select
                              value={createFormData[field.key] ?? ''}
                              onChange={(e) => setCreateFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                            >
                              <option value="">{field.placeholder || `Select ${field.label}`}</option>
                              {field.reference && createSchema.referenceOptions?.[field.reference]
                                ? createSchema.referenceOptions[field.reference].map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))
                                : (field.options || []).map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                            </select>
                          ) : field.type === 'textarea' ? (
                            <textarea
                              rows={3}
                              value={createFormData[field.key] ?? ''}
                              onChange={(e) => setCreateFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={field.placeholder || ''}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500 resize-none"
                            />
                          ) : field.type === 'boolean' ? (
                            <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={!!createFormData[field.key]}
                                onChange={(e) => setCreateFormData((prev) => ({ ...prev, [field.key]: e.target.checked }))}
                                className="rounded text-blue-600 focus:ring-0"
                              />
                              Enable {field.label}
                            </label>
                          ) : field.type === 'password' ? (
                            <div className="relative">
                              <input
                                type={showCreatePassword ? 'text' : 'password'}
                                value={createFormData[field.key] ?? ''}
                                onChange={(e) => setCreateFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                placeholder={field.placeholder || ''}
                                className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowCreatePassword((v) => !v)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                {showCreatePassword ? <Eye size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                          ) : (
                            <input
                              type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                              step={field.step || undefined}
                              value={createFormData[field.key] ?? ''}
                              onChange={(e) =>
                                setCreateFormData((prev) => ({
                                  ...prev,
                                  [field.key]: field.uppercase ? e.target.value.toUpperCase() : e.target.value
                                }))
                              }
                              placeholder={field.placeholder || ''}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-slate-100 dark:border-[#243244] flex items-center justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#172033] text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCreate}
                    style={{ backgroundColor: activeEntity.colorTheme?.accent || '#2563eb' }}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:brightness-110 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {submittingCreate ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" /> Saving to MongoDB...
                      </>
                    ) : (
                      <>
                        <Check size={14} /> Save to {activeEntity.label}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
