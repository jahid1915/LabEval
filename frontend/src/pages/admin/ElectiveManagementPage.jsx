import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  GraduationCap, Plus, Search, Users, CheckCircle2,
  AlertTriangle, Clock, RefreshCw, Eye, Download,
  Layers, X, ShieldAlert,
  Sparkles, BookOpen, AlertCircle, BarChart3,
  LayoutGrid, Table as TableIcon, Award, RotateCcw,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api/axios';
import { getSocket } from '../../utils/socket';
import RuetLogo from '../../components/RuetLogo';

export default function ElectiveManagementPage() {
  // Navigation Tabs: 'catalog' | 'monitor' | 'offerings'
  const [activeTab, setActiveTab] = useState('catalog');

  // ── 1. Catalog State (Database source) ──────────────────────────────────────
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogDept, setCatalogDept] = useState('ALL');
  const [catalogStatusFilter, setCatalogStatusFilter] = useState('ALL');
  const [catalogViewMode, setCatalogViewMode] = useState('grid'); // 'grid' | 'table'

  // ── 2. Offerings & Selected Offering State ──────────────────────────────────
  const [offerings, setOfferings] = useState([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState('');
  const [votingDetails, setVotingDetails] = useState(null);
  const [votingLoading, setVotingLoading] = useState(false);

  // Voting Table Filters
  const [votingSearch, setVotingSearch] = useState('');
  const [votingStatusFilter, setVotingStatusFilter] = useState('ALL'); // 'ALL' | 'VOTED' | 'NO_VOTE'

  // ── 3. Auxiliary Data (Teachers, Series, Departments) ───────────────────────
  const [teachersList, setTeachersList] = useState([]);
  const [seriesList, setSeriesList] = useState(['21', '22', '23', '24', '25']);
  const [departmentsList, setDepartmentsList] = useState(['ETE', 'CSE', 'EEE', 'CE', 'ME']);

  // ── 4. Offer Course Modal State ─────────────────────────────────────────────
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerConfirmStep, setOfferConfirmStep] = useState(false);
  const [offerForm, setOfferForm] = useState({
    courseId: '',
    courseCode: '',
    courseName: '',
    department: 'ETE',
    semester: '3-1',
    eligibleSeries: ['22'],
    assignedTeacherId: '',
    assignedTeacherDoc: null,
    academicSession: '2025-2026',
    status: 'OFFERED'
  });
  const [eligibleCountPreview, setEligibleCountPreview] = useState(0);

  // ── 5. Finalize Modal State ─────────────────────────────────────────────────
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [finalizingOffering, setFinalizingOffering] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── 6. Reopen Modal State ───────────────────────────────────────────────────
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopeningOffering, setReopeningOffering] = useState(null);
  const [academicRecordsCheck, setAcademicRecordsCheck] = useState(null);
  const [checkingRecords, setCheckingRecords] = useState(false);

  // ───────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ───────────────────────────────────────────────────────────────────────────

  // Load Elective Catalog (Requirement 2)
  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const res = await api.get('/electives/catalog');
      if (res.data.success) {
        setCatalog(res.data.data || []);
      }
    } catch {
      toast.error('Failed to load elective courses catalog from database');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  // Load Offerings
  const loadOfferings = useCallback(async () => {
    try {
      const res = await api.get('/electives/admin/offerings');
      if (res.data.success) {
        const list = res.data.data || [];
        setOfferings(list);
        if (list.length > 0 && !selectedOfferingId) {
          setSelectedOfferingId(list[0]._id);
        }
      }
    } catch {
      toast.error('Failed to load elective offerings');
    }
  }, [selectedOfferingId]);

  // Load Auxiliary Data
  const loadAuxData = useCallback(async () => {
    try {
      const [tRes, sRes, dRes] = await Promise.all([
        api.get('/admin/teachers').catch(() => ({ data: [] })),
        api.get('/academic/series').catch(() => ({ data: [] })),
        api.get('/departments').catch(() => ({ data: [] }))
      ]);

      const tList = tRes.data?.teachers || tRes.data || [];
      if (tList.length > 0) setTeachersList(tList);

      const sData = Array.isArray(sRes.data) ? sRes.data : (sRes.data?.series || []);
      if (sData.length > 0) {
        const extracted = sData.map(s => s.name || s.seriesName || s).filter(Boolean);
        if (extracted.length > 0) setSeriesList(extracted);
      }

      const dData = Array.isArray(dRes.data) ? dRes.data : (dRes.data?.departments || []);
      if (dData.length > 0) {
        const extracted = dData.map(d => d.code || d.name).filter(Boolean);
        if (extracted.length > 0) setDepartmentsList(extracted);
      }
    } catch {
      // Optional fallback
    }
  }, []);

  // Load Detailed Voting Information for selected offering (Requirement 10, 11, 12)
  const loadVotingDetails = useCallback(async (offeringId) => {
    if (!offeringId) return;
    setVotingLoading(true);
    try {
      const res = await api.get(`/electives/admin/${offeringId}/voting-details`);
      if (res.data.success) {
        setVotingDetails(res.data.data);
      }
    } catch {
      setVotingDetails(null);
    } finally {
      setVotingLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
    loadOfferings();
    loadAuxData();
  }, [loadCatalog, loadOfferings, loadAuxData]);

  useEffect(() => {
    if (selectedOfferingId) {
      loadVotingDetails(selectedOfferingId);
    }
  }, [selectedOfferingId, loadVotingDetails]);

  // Real-time socket updates for live voting (Requirement 12)
  useEffect(() => {
    const socket = getSocket();
    if (!selectedOfferingId) return;

    socket.emit('joinElectiveRoom', selectedOfferingId);

    const handleVoteUpdate = () => {
      loadVotingDetails(selectedOfferingId);
      loadOfferings();
      loadCatalog();
    };

    socket.on('elective:voted', handleVoteUpdate);
    socket.on('elective:countUpdated', handleVoteUpdate);
    socket.on('elective:finalized', handleVoteUpdate);
    socket.on('elective:reopened', handleVoteUpdate);

    return () => {
      socket.emit('leaveElectiveRoom', selectedOfferingId);
      socket.off('elective:voted', handleVoteUpdate);
      socket.off('elective:countUpdated', handleVoteUpdate);
      socket.off('elective:finalized', handleVoteUpdate);
      socket.off('elective:reopened', handleVoteUpdate);
    };
  }, [selectedOfferingId, loadVotingDetails, loadOfferings, loadCatalog]);

  // Compute live eligible students count preview when series or dept changes in modal
  useEffect(() => {
    if (!offerModalOpen) return;
    const fetchCount = async () => {
      try {
        const seriesQuery = offerForm.eligibleSeries.join(',');
        const dept = offerForm.department;
        const res = await api.get(`/admin/students?department=${dept}&series=${seriesQuery}`);
        const count = res.data?.total || res.data?.students?.length || res.data?.length || 0;
        setEligibleCountPreview(count);
      } catch {
        setEligibleCountPreview(offerForm.eligibleSeries.length * 30); // estimated fallback
      }
    };
    fetchCount();
  }, [offerModalOpen, offerForm.eligibleSeries, offerForm.department]);

  // ───────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ───────────────────────────────────────────────────────────────────────────

  // Open Offer Modal for a course
  const openOfferModal = (course) => {
    setOfferForm({
      courseId: course._id,
      courseCode: course.courseCode,
      courseName: course.courseName,
      department: course.department || 'ETE',
      semester: course.semesterLevel || '3-1',
      eligibleSeries: course.availableSeries?.length > 0 ? course.availableSeries : ['22'],
      assignedTeacherId: course.assignedTeacher?._id || course.teacherId || '',
      assignedTeacherDoc: course.assignedTeacher || null,
      academicSession: '2025-2026',
      status: 'OFFERED'
    });
    setOfferConfirmStep(false);
    setOfferModalOpen(true);
  };

  // Submit Offer Course (Requirement 6)
  const handleOfferCourse = async () => {
    setActionLoading(true);
    try {
      const selectedTeacher = teachersList.find(t => t._id === offerForm.assignedTeacherId || t.teacherId === offerForm.assignedTeacherId);

      const payload = {
        courseId: offerForm.courseId,
        availableCourses: [offerForm.courseId],
        department: offerForm.department,
        semester: offerForm.semester,
        eligibleSeries: offerForm.eligibleSeries,
        series: offerForm.eligibleSeries.join(', '),
        academicSession: offerForm.academicSession,
        assignedTeacher: selectedTeacher?._id || null,
        teacherId: selectedTeacher?.teacherId || '',
        teacherName: selectedTeacher?.name || '',
        electiveGroup: offerForm.courseName,
        status: 'OFFERED',
        maxChoices: 1
      };

      const res = await api.post('/electives/admin/offering', payload);
      if (res.data.success) {
        toast.success(`Course ${offerForm.courseName} (${offerForm.courseCode}) successfully offered to students!`);
        setOfferModalOpen(false);
        setOfferConfirmStep(false);
        await loadCatalog();
        await loadOfferings();
        if (res.data.data?._id) {
          setSelectedOfferingId(res.data.data._id);
          setActiveTab('monitor');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to offer elective course');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Finalize Modal (Requirement 14)
  const openFinalizeModal = (offeringOrCourse) => {
    const offeringId = offeringOrCourse.offeringId || offeringOrCourse._id;
    const offering = offerings.find(o => o._id === offeringId) || offeringOrCourse;
    setFinalizingOffering(offering);
    setFinalizeModalOpen(true);
  };

  // Execute Finalization (Requirement 13, 14, 15, 16)
  const handleConfirmFinalize = async () => {
    if (!finalizingOffering) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/electives/admin/${finalizingOffering._id}/finalize`);
      if (res.data.success) {
        toast.success(res.data.message || 'Elective course finalized successfully! Activated in Student and Teacher dashboards.');
        setFinalizeModalOpen(false);
        setFinalizingOffering(null);
        await loadCatalog();
        await loadOfferings();
        if (selectedOfferingId) loadVotingDetails(selectedOfferingId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Finalization failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Reopen Modal with Safety Check (Requirement 21)
  const openReopenModal = async (offeringOrCourse) => {
    const offeringId = offeringOrCourse.offeringId || offeringOrCourse._id;
    const offering = offerings.find(o => o._id === offeringId) || offeringOrCourse;
    setReopeningOffering(offering);
    setCheckingRecords(true);
    setReopenModalOpen(true);

    try {
      const res = await api.get(`/electives/admin/${offeringId}/check-academic-records`);
      setAcademicRecordsCheck(res.data);
    } catch {
      setAcademicRecordsCheck(null);
    } finally {
      setCheckingRecords(false);
    }
  };

  // Execute Reopen (Requirement 21)
  const handleConfirmReopen = async () => {
    if (!reopeningOffering) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/electives/admin/${reopeningOffering._id}/reopen`, { force: true });
      if (res.data.success) {
        toast.success('Elective allocation reopened. Student voting is now unlocked.');
        setReopenModalOpen(false);
        setReopeningOffering(null);
        await loadCatalog();
        await loadOfferings();
        if (selectedOfferingId) loadVotingDetails(selectedOfferingId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reopen elective allocation');
    } finally {
      setActionLoading(false);
    }
  };

  // Export Voting Allocations to Excel (Requirement 11)
  const handleExportExcel = () => {
    if (!votingDetails?.studentVotingRows || votingDetails.studentVotingRows.length === 0) {
      toast.info('No voting data to export');
      return;
    }

    const rows = votingDetails.studentVotingRows.map(s => ({
      'Roll Number': s.roll,
      'Student Name': s.name,
      'Registration No': s.registrationNo || '',
      'Series': s.series,
      'Semester': s.semester,
      'Department': s.department,
      'Phone': s.phone || '',
      'Selected Elective': s.selectedElective,
      'Vote Time': s.votedAt ? new Date(s.votedAt).toLocaleString() : '',
      'Vote Status': s.voteStatus === 'VOTED' ? 'Voted' : 'No Vote'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 10 }, { wch: 12 },
      { wch: 14 }, { wch: 16 }, { wch: 35 }, { wch: 22 }, { wch: 14 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student Voting');

    const courseCode = votingDetails.offering?.course?.courseCode || votingDetails.offering?.availableCourses?.[0]?.courseCode || 'Elective';
    XLSX.writeFile(wb, `Elective_Voting_${courseCode}_${Date.now()}.xlsx`);
    toast.success('Voting details exported to Excel successfully!');
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FILTERED LISTS
  // ───────────────────────────────────────────────────────────────────────────

  // Filtered Catalog
  const filteredCatalog = useMemo(() => {
    return catalog.filter(c => {
      // Dept filter
      if (catalogDept !== 'ALL' && c.department !== catalogDept) return false;

      // Status filter
      if (catalogStatusFilter === 'NOT_OFFERED' && c.currentStatus !== 'NOT_OFFERED') return false;
      if (catalogStatusFilter === 'OFFERED' && c.currentStatus === 'NOT_OFFERED') return false;
      if (catalogStatusFilter === 'FINALIZED' && !c.isFinalized) return false;

      // Search query
      if (catalogSearch.trim()) {
        const q = catalogSearch.toLowerCase();
        const codeMatch = c.courseCode?.toLowerCase().includes(q);
        const nameMatch = c.courseName?.toLowerCase().includes(q);
        const teacherMatch = c.teacherName?.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !teacherMatch) return false;
      }

      return true;
    });
  }, [catalog, catalogDept, catalogStatusFilter, catalogSearch]);

  // Filtered Student Voting Rows
  const filteredVotingRows = useMemo(() => {
    const list = votingDetails?.studentVotingRows || [];
    return list.filter(s => {
      if (votingStatusFilter === 'VOTED' && !s.hasVoted) return false;
      if (votingStatusFilter === 'NO_VOTE' && s.hasVoted) return false;

      if (votingSearch.trim()) {
        const q = votingSearch.toLowerCase();
        const rollMatch = s.roll?.toLowerCase().includes(q);
        const nameMatch = s.name?.toLowerCase().includes(q);
        const regMatch = s.registrationNo?.toLowerCase().includes(q);
        const courseMatch = s.selectedElective?.toLowerCase().includes(q);
        if (!rollMatch && !nameMatch && !regMatch && !courseMatch) return false;
      }

      return true;
    });
  }, [votingDetails, votingStatusFilter, votingSearch]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── TOP HEADER BANNER ──────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <RuetLogo size={52} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-heading font-black text-slate-900 dark:text-white">
                Elective Course Management
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                RUET ERP
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Course Database Catalog • Series & Teacher Assignment • Student Voting • Live Statistics • Admin Finalization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              loadCatalog();
              loadOfferings();
              if (selectedOfferingId) loadVotingDetails(selectedOfferingId);
              toast.info('Data refreshed from MongoDB');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <RefreshCw size={15} /> Refresh
          </button>

          <button
            onClick={() => {
              if (catalog.length > 0) {
                openOfferModal(catalog[0]);
              } else {
                toast.info('No elective courses in catalog yet');
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm shadow-md shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all"
          >
            <Plus size={16} /> Offer Elective Course
          </button>
        </div>
      </div>

      {/* ── MAIN TAB NAVIGATION ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {[
            { id: 'catalog', label: 'Elective Courses Catalog', icon: BookOpen, count: catalog.length },
            { id: 'monitor', label: 'Voting Monitor & Student Choices', icon: BarChart3, count: offerings.length },
            { id: 'offerings', label: 'All Offered Cycles', icon: Layers, count: offerings.length }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === 'monitor' && offerings.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Active Elective:</span>
            <select
              value={selectedOfferingId}
              onChange={e => setSelectedOfferingId(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 max-w-sm truncate"
            >
              {offerings.map(o => (
                <option key={o._id} value={o._id}>
                  {o.course?.courseCode || o.availableCourses?.[0]?.courseCode || ''} {o.electiveGroup} ({o.departmentCode} {o.semester}) - {o.series} [{o.status}]
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 1: DYNAMIC ELECTIVE COURSE CATALOG (Requirement 2 & 3)
      ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Catalog Controls: Search, Filters & View Toggle */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by course code, title, teacher..."
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                />
              </div>

              {/* Department Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-400">Dept:</span>
                <select
                  value={catalogDept}
                  onChange={e => setCatalogDept(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="ALL">All Depts</option>
                  {departmentsList.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-400">Status:</span>
                <select
                  value={catalogStatusFilter}
                  onChange={e => setCatalogStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="NOT_OFFERED">Not Offered</option>
                  <option value="OFFERED">Offered / Voting Open</option>
                  <option value="FINALIZED">Finalized</option>
                </select>
              </div>
            </div>

            {/* View Switch: Grid vs Table */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-end md:self-auto">
              <button
                onClick={() => setCatalogViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  catalogViewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Grid View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setCatalogViewMode('table')}
                className={`p-1.5 rounded-lg transition ${
                  catalogViewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Table View"
              >
                <TableIcon size={16} />
              </button>
            </div>
          </div>

          {/* Catalog Count Banner */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>
              Showing <strong className="text-slate-800 dark:text-white font-bold">{filteredCatalog.length}</strong> elective courses from MongoDB course database
            </span>
            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
              ● Dynamic Database Source: Automatically updates when courses are added
            </span>
          </div>

          {catalogLoading ? (
            <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <RefreshCw className="animate-spin text-purple-600 mb-3" size={28} />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading elective courses from database...</p>
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="text-center p-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <BookOpen size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">No elective courses match criteria</h3>
              <p className="text-xs text-slate-500 mt-1">Try resetting the department or status filters.</p>
            </div>
          ) : catalogViewMode === 'grid' ? (
            /* ── COURSE CARDS VIEW (Requirement 2 & 3) ───────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCatalog.map(course => {
                const isOffered = course.currentStatus !== 'NOT_OFFERED';
                const isFinalized = course.isFinalized;

                return (
                  <motion.div
                    key={course._id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-purple-300 dark:hover:border-purple-800 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {course.courseCode}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isFinalized ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 size={12} /> Finalized
                            </span>
                          ) : isOffered ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                              <Clock size={12} /> Offered / Open
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              Not Offered
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Course Title */}
                      <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white leading-snug mb-2 line-clamp-2">
                        {course.courseName}
                      </h3>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs py-2.5 border-y border-slate-100 dark:border-slate-800/80 my-3">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Department</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{course.department}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Credit</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{course.credit} Cr ({course.courseType})</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Available Series</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {course.availableSeries?.length > 0 ? course.availableSeries.join(', ') + ' Series' : 'Not set'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Semester</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {course.eligibleSemester || course.semesterLevel || 'Any'}
                          </span>
                        </div>
                      </div>

                      {/* Assigned Teacher Card */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 mb-4">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                          Assigned Teacher
                        </span>
                        {course.teacherName ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-700 dark:text-purple-300 font-black text-[10px]">
                              {course.teacherName.charAt(0)}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{course.teacherName}</p>
                              {course.teacherId && (
                                <p className="text-[10px] text-slate-400">{course.teacherId}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No teacher assigned yet</p>
                        )}
                      </div>

                      {/* Voting Numbers (if offered) */}
                      {isOffered && (
                        <div className="flex items-center justify-between text-xs px-1 mb-4 text-slate-600 dark:text-slate-400">
                          <span>Votes Received: <strong className="text-purple-600 dark:text-purple-400">{course.votesCount}</strong></span>
                          <span>Eligible Pool: <strong>{course.eligibleStudentsCount}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                      {!isOffered ? (
                        <button
                          onClick={() => openOfferModal(course)}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition"
                        >
                          <Plus size={14} /> Offer to Students
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setSelectedOfferingId(course.offeringId);
                              setActiveTab('monitor');
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-bold transition"
                          >
                            <Eye size={13} /> View Voting
                          </button>

                          {!isFinalized ? (
                            <button
                              onClick={() => openFinalizeModal(course)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
                            >
                              <CheckCircle2 size={13} /> Finalize
                            </button>
                          ) : (
                            <button
                              onClick={() => openReopenModal(course)}
                              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 text-xs font-bold transition"
                              title="Reopen allocation"
                            >
                              <RotateCcw size={13} /> Reopen
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* ── DATA TABLE VIEW ────────────────────────────────────────────── */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Code</th>
                      <th className="py-3.5 px-4">Course Name</th>
                      <th className="py-3.5 px-4">Dept</th>
                      <th className="py-3.5 px-4">Credit</th>
                      <th className="py-3.5 px-4">Available Series</th>
                      <th className="py-3.5 px-4">Teacher</th>
                      <th className="py-3.5 px-4">Votes / Pool</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                    {filteredCatalog.map(course => {
                      const isOffered = course.currentStatus !== 'NOT_OFFERED';
                      const isFinalized = course.isFinalized;

                      return (
                        <tr key={course._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                            {course.courseCode}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                            {course.courseName}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-semibold">
                            {course.department}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {course.credit} Cr
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {course.availableSeries?.join(', ') || '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[160px]">
                            {course.teacherName || <span className="text-slate-400 italic">Unassigned</span>}
                          </td>
                          <td className="py-3 px-4">
                            {isOffered ? (
                              <span className="font-bold text-purple-600 dark:text-purple-400">
                                {course.votesCount} <span className="text-slate-400 font-normal">/ {course.eligibleStudentsCount}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isFinalized ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                Finalized
                              </span>
                            ) : isOffered ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                Offered
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                Not Offered
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {!isOffered ? (
                              <button
                                onClick={() => openOfferModal(course)}
                                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-sm transition"
                              >
                                Offer
                              </button>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                <button
                                  onClick={() => {
                                    setSelectedOfferingId(course.offeringId);
                                    setActiveTab('monitor');
                                  }}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 dark:text-slate-300"
                                >
                                  Votes
                                </button>
                                {!isFinalized ? (
                                  <button
                                    onClick={() => openFinalizeModal(course)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                                  >
                                    Finalize
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => openReopenModal(course)}
                                    className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[11px] font-bold"
                                    title="Reopen allocation"
                                  >
                                    Reopen
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 2: VOTING MONITOR & STUDENT CHOICES (Requirement 10, 11, 12, 13)
      ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'monitor' && (
        <div className="space-y-6">
          {!selectedOfferingId ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <AlertCircle size={36} className="mx-auto text-slate-400 mb-2" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300">No Offered Elective Selected</h3>
              <p className="text-xs text-slate-500 mt-1">Please offer an elective course or select one from the dropdown.</p>
            </div>
          ) : votingLoading ? (
            <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <RefreshCw className="animate-spin text-purple-600 mb-3" size={28} />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading live student voting statistics...</p>
            </div>
          ) : !votingDetails ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-500">Failed to load voting details.</p>
            </div>
          ) : (
            <>
              {/* Offering Overview Card */}
              <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">
                        {votingDetails.offering?.departmentCode} • Semester {votingDetails.offering?.semester}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/40 text-purple-200">
                        Series {votingDetails.offering?.eligibleSeries?.join(', ') || votingDetails.offering?.series}
                      </span>
                      {votingDetails.offering?.isFinalized ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/40 text-emerald-200 border border-emerald-400/30">
                          ✓ Finalized
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/40 text-blue-200 border border-blue-400/30">
                          ● Voting Active
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl font-heading font-black tracking-tight">
                      {votingDetails.offering?.course?.courseCode || votingDetails.offering?.availableCourses?.[0]?.courseCode} — {votingDetails.offering?.electiveGroup}
                    </h2>

                    <p className="text-sm text-purple-200 mt-1 flex items-center gap-2">
                      <span>Assigned Teacher: <strong>{votingDetails.offering?.teacherName || votingDetails.offering?.assignedTeacher?.name || 'Unassigned'}</strong></span>
                      {votingDetails.offering?.teacherId && (
                        <span>({votingDetails.offering.teacherId})</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      onClick={handleExportExcel}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition"
                    >
                      <Download size={14} /> Export Excel
                    </button>

                    {!votingDetails.offering?.isFinalized ? (
                      <button
                        onClick={() => openFinalizeModal(votingDetails.offering)}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-lg shadow-emerald-900/50 transition"
                      >
                        <CheckCircle2 size={15} /> Finalize Course Allocation
                      </button>
                    ) : (
                      <button
                        onClick={() => openReopenModal(votingDetails.offering)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500/80 hover:bg-amber-600 text-white text-xs font-black transition"
                      >
                        <RotateCcw size={15} /> Reopen Allocation
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── 4 KPI CARDS (Requirement 12) ───────────────────────────── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase">Total Eligible</span>
                    <Users size={18} className="text-purple-600" />
                  </div>
                  <div className="text-3xl font-heading font-black text-slate-900 dark:text-white">
                    {votingDetails.stats?.totalEligibleStudents || 0}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">Students in selected series</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase">Votes Received</span>
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  </div>
                  <div className="text-3xl font-heading font-black text-emerald-600 dark:text-emerald-400">
                    {votingDetails.stats?.votesReceived || 0}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">Votes recorded in MongoDB</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase">No Vote / Pending</span>
                    <Clock size={18} className="text-amber-500" />
                  </div>
                  <div className="text-3xl font-heading font-black text-amber-600 dark:text-amber-400">
                    {votingDetails.stats?.noVoteCount || 0}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">Students yet to submit</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase">Turnout %</span>
                    <Award size={18} className="text-indigo-600" />
                  </div>
                  <div className="text-3xl font-heading font-black text-indigo-600 dark:text-indigo-400">
                    {votingDetails.stats?.votePercentage || 0}%
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, votingDetails.stats?.votePercentage || 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* ── COURSE PREFERENCE BREAKDOWN (Requirement 12) ─────────────── */}
              {votingDetails.courseDistribution?.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                  <h3 className="font-heading font-bold text-sm text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-purple-600" />
                    Elective Preference Distribution
                  </h3>

                  <div className="space-y-3">
                    {votingDetails.courseDistribution.map(cd => (
                      <div key={cd.courseId} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {cd.courseCode} — {cd.courseName}
                          </span>
                          <span className="font-semibold text-purple-600 dark:text-purple-400">
                            {cd.votes} votes ({cd.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-purple-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${cd.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── STUDENT-WISE VOTING DETAILS TABLE (Requirement 11) ────────── */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <Users size={18} className="text-purple-600" />
                      Student-Wise Voting Details
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Real-time roster showing each student's chosen elective and vote timestamp
                    </p>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search student roll, name..."
                        value={votingSearch}
                        onChange={e => setVotingSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 w-48 text-slate-800 dark:text-white"
                      />
                    </div>

                    <select
                      value={votingStatusFilter}
                      onChange={e => setVotingStatusFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none"
                    >
                      <option value="ALL">All Students</option>
                      <option value="VOTED">Voted Only</option>
                      <option value="NO_VOTE">No Vote Only</option>
                    </select>

                    <button
                      onClick={handleExportExcel}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      title="Export Table to Excel"
                    >
                      <Download size={15} />
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Roll</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Registration</th>
                        <th className="py-3 px-4">Series</th>
                        <th className="py-3 px-4">Selected Elective</th>
                        <th className="py-3 px-4">Vote Time</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {filteredVotingRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                            No student records match the search or filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredVotingRows.map(student => (
                          <tr key={student._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                            <td className="py-2.5 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                              {student.roll}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                              {student.name}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                              {student.registrationNo || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                              {student.series}
                            </td>
                            <td className="py-2.5 px-4">
                              {student.hasVoted ? (
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {student.selectedElective}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">No Vote</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                              {student.votedAt ? new Date(student.votedAt).toLocaleString() : '—'}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {student.hasVoted ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                  <Check size={11} /> Voted
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="text-[11px] text-slate-400 text-right">
                  Showing {filteredVotingRows.length} of {votingDetails.studentVotingRows?.length || 0} students
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 3: ALL OFFERED CYCLES SUMMARY
      ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'offerings' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
              All Created Elective Offerings
            </h3>
            <span className="text-xs text-slate-400 font-semibold">{offerings.length} Total Cycles</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Offering / Course</th>
                  <th className="py-3.5 px-4">Dept</th>
                  <th className="py-3.5 px-4">Semester</th>
                  <th className="py-3.5 px-4">Eligible Series</th>
                  <th className="py-3.5 px-4">Assigned Teacher</th>
                  <th className="py-3.5 px-4">Turnout</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {offerings.map(off => (
                  <tr key={off._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {off.electiveGroup}
                    </td>
                    <td className="py-3 px-4">{off.departmentCode}</td>
                    <td className="py-3 px-4">{off.semester}</td>
                    <td className="py-3 px-4">{off.eligibleSeries?.join(', ') || off.series}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {off.teacherName || off.assignedTeacher?.name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 font-bold text-purple-600 dark:text-purple-400">
                      {off.votesReceived || off.totalSelections || 0} / {off.eligibleCount || 0}
                    </td>
                    <td className="py-3 px-4">
                      {off.isFinalized ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          Finalized
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {off.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedOfferingId(off._id);
                          setActiveTab('monitor');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold hover:bg-purple-100 text-xs"
                      >
                        Monitor
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          MODAL 1: OFFER ELECTIVE COURSE (Requirement 4, 5, 6)
      ──────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {offerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden"
            >
              {!offerConfirmStep ? (
                /* Step 1: Configuration Form */
                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <GraduationCap size={18} />
                      </div>
                      <div>
                        <h3 className="font-heading font-black text-lg text-slate-900 dark:text-white">
                          Offer Elective Course
                        </h3>
                        <p className="text-xs text-slate-500">Configure eligibility and teacher assignment</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setOfferModalOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Course Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Elective Course
                    </label>
                    <select
                      value={offerForm.courseId}
                      onChange={e => {
                        const c = catalog.find(x => x._id === e.target.value);
                        if (c) {
                          setOfferForm(prev => ({
                            ...prev,
                            courseId: c._id,
                            courseCode: c.courseCode,
                            courseName: c.courseName,
                            department: c.department || prev.department
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {catalog.map(c => (
                        <option key={c._id} value={c._id}>
                          {c.courseCode} — {c.courseName} ({c.credit} Cr, {c.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Eligible Series Checkboxes (Requirement 4) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Eligible Series (Multi-select)</span>
                      <span className="text-[10px] text-purple-600 font-semibold">Select all that apply</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      {seriesList.map(s => {
                        const isChecked = offerForm.eligibleSeries.includes(s);
                        return (
                          <label
                            key={s}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border text-xs font-bold transition ${
                              isChecked
                                ? 'bg-purple-50 border-purple-300 text-purple-800 dark:bg-purple-950/60 dark:border-purple-700 dark:text-purple-300'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setOfferForm(prev => {
                                  const exists = prev.eligibleSeries.includes(s);
                                  return {
                                    ...prev,
                                    eligibleSeries: exists
                                      ? prev.eligibleSeries.filter(x => x !== s)
                                      : [...prev.eligibleSeries, s]
                                  };
                                });
                              }}
                              className="rounded text-purple-600 focus:ring-purple-500"
                            />
                            <span>{s} Series</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Eligible Semester (Requirement 4) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Eligible Semester
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['3-1', '3-2', '4-1', '4-2'].map(sem => (
                        <button
                          key={sem}
                          type="button"
                          onClick={() => setOfferForm(prev => ({ ...prev, semester: sem }))}
                          className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                            offerForm.semester === sem
                              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {sem}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Teacher Assignment (Requirement 5) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Teacher Assignment
                    </label>
                    <select
                      value={offerForm.assignedTeacherId}
                      onChange={e => {
                        const tId = e.target.value;
                        const t = teachersList.find(x => x._id === tId || x.teacherId === tId);
                        setOfferForm(prev => ({
                          ...prev,
                          assignedTeacherId: tId,
                          assignedTeacherDoc: t || null
                        }));
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">[ Select Teacher ▼ ]</option>
                      {teachersList.map(t => (
                        <option key={t._id} value={t._id}>
                          {t.name} ({t.teacherId}) — {t.department}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Teacher will only see this in their active courses after Admin finalizes.
                    </p>
                  </div>

                  {/* Eligible Students Preview */}
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 flex items-center justify-between text-xs text-purple-900 dark:text-purple-200">
                    <span className="font-semibold">Eligible Students Pool:</span>
                    <strong className="text-base font-heading font-black text-purple-700 dark:text-purple-300">
                      {eligibleCountPreview} Students
                    </strong>
                  </div>

                  {/* Action */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setOfferModalOpen(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={offerForm.eligibleSeries.length === 0}
                      onClick={() => setOfferConfirmStep(true)}
                      className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/25 disabled:opacity-50"
                    >
                      Review & Offer
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 2: Confirmation Dialog (Requirement 6) */
                <div className="p-6 space-y-5">
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 mx-auto mb-2">
                      <Sparkles size={24} />
                    </div>
                    <h3 className="font-heading font-black text-lg text-slate-900 dark:text-white">
                      Offer Elective Course
                    </h3>
                    <p className="text-xs text-slate-500">
                      Please confirm the offering details before publishing to students
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                      <span className="text-slate-400 font-semibold">Course:</span>
                      <strong className="text-slate-800 dark:text-white font-bold">{offerForm.courseName} ({offerForm.courseCode})</strong>
                    </div>

                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                      <span className="text-slate-400 font-semibold">Eligible Series:</span>
                      <strong className="text-purple-600 dark:text-purple-400 font-bold">{offerForm.eligibleSeries.join(', ')} Series</strong>
                    </div>

                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                      <span className="text-slate-400 font-semibold">Semester:</span>
                      <strong className="text-slate-800 dark:text-white font-bold">{offerForm.semester}</strong>
                    </div>

                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                      <span className="text-slate-400 font-semibold">Teacher:</span>
                      <strong className="text-slate-800 dark:text-white font-bold">
                        {offerForm.assignedTeacherDoc?.name || 'Unassigned'}
                      </strong>
                    </div>

                    <div className="flex justify-between pt-1">
                      <span className="text-slate-400 font-semibold">Eligible Students:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{eligibleCountPreview}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setOfferConfirmStep(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleOfferCourse}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black shadow-md shadow-purple-500/25 flex items-center justify-center gap-2"
                    >
                      {actionLoading ? <RefreshCw className="animate-spin" size={14} /> : null}
                      Confirm & Offer
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ────────────────────────────────────────────────────────────────────────
          MODAL 2: FINALIZE CONFIRMATION (Requirement 14)
      ──────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {finalizeModalOpen && finalizingOffering && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5"
            >
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-2">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="font-heading font-black text-xl text-slate-900 dark:text-white">
                  Finalize Elective Course
                </h3>
                <p className="text-xs text-slate-500">Official course allocation & roster activation</p>
              </div>

              {/* Course Info Summary */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Course:</span>
                  <strong className="text-slate-800 dark:text-white font-bold">{finalizingOffering.electiveGroup}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Course Code:</span>
                  <strong className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                    {finalizingOffering.course?.courseCode || finalizingOffering.availableCourses?.[0]?.courseCode || 'Elective'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Eligible Series:</span>
                  <strong className="text-slate-800 dark:text-white font-bold">
                    {finalizingOffering.eligibleSeries?.join(', ') || finalizingOffering.series}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Teacher:</span>
                  <strong className="text-slate-800 dark:text-white font-bold">
                    {finalizingOffering.teacherName || finalizingOffering.assignedTeacher?.name || 'Unassigned'}
                  </strong>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span className="text-slate-400">Students Selected:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                    {finalizingOffering.votesReceived || finalizingOffering.totalSelections || 0}
                  </strong>
                </div>
              </div>

              {/* Strict Requirement 14 Checklist */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 space-y-2 text-xs text-emerald-900 dark:text-emerald-200">
                <p className="font-bold mb-1">After finalization:</p>
                <div className="space-y-1.5 font-medium text-[11px]">
                  <div className="flex items-start gap-2">
                    <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span>Course will be added to selected students' active courses.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span>Course will appear in the assigned teacher's dashboard.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span>Student elective voting will be locked.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span>Allocation cannot be changed unless Admin reopens it.</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFinalizeModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmFinalize}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  {actionLoading ? <RefreshCw className="animate-spin" size={14} /> : null}
                  Finalize Course
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ────────────────────────────────────────────────────────────────────────
          MODAL 3: REOPEN ALLOCATION (Requirement 21)
      ──────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {reopenModalOpen && reopeningOffering && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5"
            >
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-2">
                  <ShieldAlert size={24} />
                </div>
                <h3 className="font-heading font-black text-xl text-slate-900 dark:text-white">
                  Reopen Elective Allocation
                </h3>
                <p className="text-xs text-slate-500">
                  Reopening will revert active student and teacher enrollment status
                </p>
              </div>

              {checkingRecords ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  <RefreshCw className="animate-spin inline mr-2" size={14} />
                  Checking for existing academic records (attendance/marks)...
                </div>
              ) : academicRecordsCheck?.hasRecords ? (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 space-y-2 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle size={16} />
                    <span>Academic Records Warning ({academicRecordsCheck.totalRecords} records found)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    This course already has existing attendance or evaluation marks. Reopening will suspend active student/teacher course visibility until finalized again. Existing evaluation records are preserved.
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 text-xs text-blue-900 dark:text-blue-200">
                  No academic evaluation records found for this course. Safe to reopen without data impact.
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setReopenModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleConfirmReopen(true)}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md shadow-amber-600/30 flex items-center justify-center gap-2"
                >
                  {actionLoading ? <RefreshCw className="animate-spin" size={14} /> : null}
                  Confirm & Reopen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
