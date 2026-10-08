import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, UserCheck, History, RefreshCw, Plus, Search,
  Building2, Users, GraduationCap, X, ChevronRight, CheckCircle2,
  AlertTriangle, Clock, Calendar, Mail, Phone
} from 'lucide-react';
import api from '../../api/axios';

export default function DepartmentHeadManagementPage() {
  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('ALL');

  // Change Head Modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetDept, setTargetDept] = useState(null);
  const [eligibleTeachers, setEligibleTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [appointmentReason, setAppointmentReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Head History Modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyDeptCode, setHistoryDeptCode] = useState('');
  const [headHistory, setHeadHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Headship Transfer Requests state (Section 30 & 31)
  const [transferRequests, setTransferRequests] = useState([]);
  const [processingTransferId, setProcessingTransferId] = useState(null);

  const fetchDepartmentsAndFaculties = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, fRes, tRes] = await Promise.all([
        api.get('/departments'),
        api.get('/faculties'),
        api.get('/admin/headship-transfers').catch(() => ({ data: { requests: [] } }))
      ]);
      setDepartments(dRes.data.departments || dRes.data || []);
      setFaculties(fRes.data.faculties || fRes.data || []);
      setTransferRequests(tRes.data?.requests || []);
    } catch (err) {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleApproveTransfer = async (reqId) => {
    const adminNotes = window.prompt('Admin approval notes (optional):') || 'Approved by System Administrator';
    setProcessingTransferId(reqId);
    try {
      const { data } = await api.post(`/admin/headship-transfers/${reqId}/approve`, { adminNotes });
      toast.success(data.message || 'Headship transfer approved successfully');
      fetchDepartmentsAndFaculties();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve transfer');
    } finally {
      setProcessingTransferId(null);
    }
  };

  const handleRejectTransfer = async (reqId) => {
    const adminNotes = window.prompt('Reason for rejecting headship transfer:');
    if (!adminNotes) return;
    setProcessingTransferId(reqId);
    try {
      const { data } = await api.post(`/admin/headship-transfers/${reqId}/reject`, { adminNotes });
      toast.info(data.message || 'Headship transfer rejected');
      fetchDepartmentsAndFaculties();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject transfer');
    } finally {
      setProcessingTransferId(null);
    }
  };

  useEffect(() => {
    fetchDepartmentsAndFaculties();
  }, [fetchDepartmentsAndFaculties]);

  // Open Assign/Change Head Modal
  const handleOpenAssignModal = async (dept) => {
    setTargetDept(dept);
    setSelectedTeacherId('');
    setAppointmentReason('');
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setShowAssignModal(true);
    setLoadingTeachers(true);

    try {
      const { data } = await api.get(`/admin/teachers?department=${dept.code}&limit=100`);
      setEligibleTeachers(data.teachers || data || []);
    } catch {
      toast.error('Failed to load teachers for this department');
    } finally {
      setLoadingTeachers(false);
    }
  };

  const handleConfirmAssignHead = async (e) => {
    e.preventDefault();
    if (!selectedTeacherId) return toast.error('Please select a teacher to appoint as Head');
    if (!appointmentReason.trim()) return toast.error('Please specify a reason for this appointment');

    setSubmittingAssign(true);
    try {
      const { data } = await api.post(`/admin/departments/${targetDept.code}/assign-head`, {
        teacherId: selectedTeacherId,
        reason: appointmentReason.trim(),
        effectiveDate
      });
      toast.success(data.message || 'Department Head appointed successfully');
      setShowAssignModal(false);
      fetchDepartmentsAndFaculties();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to appoint Department Head');
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Open Head History Modal
  const handleOpenHistoryModal = async (deptCode) => {
    setHistoryDeptCode(deptCode);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const { data } = await api.get(`/admin/departments/${deptCode}/head-history`);
      setHeadHistory(data.history || []);
    } catch (err) {
      toast.error('Failed to load department head history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Vacate Head
  const handleRemoveHead = async (deptCode) => {
    const reason = window.prompt(`Provide reason for vacating Head of ${deptCode}:`);
    if (!reason) return;

    try {
      await api.post(`/admin/departments/${deptCode}/remove-head`, { reason });
      toast.success(`Head of Department ${deptCode} has been vacated`);
      fetchDepartmentsAndFaculties();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove Department Head');
    }
  };

  const filteredDepts = departments.filter(d => {
    const matchesSearch = d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.code?.toLowerCase().includes(search.toLowerCase()) ||
      d.headName?.toLowerCase().includes(search.toLowerCase());
    const matchesFac = facultyFilter === 'ALL' || d.faculty?._id === facultyFilter || d.faculty === facultyFilter;
    return matchesSearch && matchesFac;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* ── HEADER ── */}
      <div className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                System Administration
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Institutional Authority Management
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Department Head Management & History
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Controlled administrative authority assignment with 1-department-1-active-head rule and immutable appointment audit trail.
            </p>
          </div>

          <button
            onClick={fetchDepartmentsAndFaculties}
            disabled={loading}
            className="p-2 rounded-lg bg-white dark:bg-[#15203b] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-500 transition-colors self-start md:self-auto"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── PENDING HEADSHIP TRANSFER REQUESTS (Section 30 & 31) ── */}
      {transferRequests.filter(r => r.status === 'pending').length > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-amber-600 dark:text-amber-400" />
              <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Pending Headship Transfer Requests ({transferRequests.filter(r => r.status === 'pending').length})
              </h2>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
              Requires Admin Approval
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {transferRequests.filter(r => r.status === 'pending').map((req) => (
              <div
                key={req._id}
                className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-amber-200/80 dark:border-amber-900/40 space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    Dept: {req.department?.name || req.department?.code || req.departmentCode || 'Department'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Requested on {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <p className="text-slate-600 dark:text-slate-300">
                    Current Head: <strong className="text-slate-900 dark:text-white">{req.currentHeadName || 'Current Head'}</strong>
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    Proposed Successor: <strong className="text-indigo-600 dark:text-indigo-400">{req.proposedHeadName || 'Proposed Successor'}</strong>
                  </p>
                  {req.reason && (
                    <p className="text-[11px] text-slate-500 italic mt-1">
                      Reason: "{req.reason}"
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleRejectTransfer(req._id)}
                    disabled={processingTransferId === req._id}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApproveTransfer(req._id)}
                    disabled={processingTransferId === req._id}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-sm"
                  >
                    {processingTransferId === req._id ? 'Approving...' : 'Approve Transfer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FILTER BAR ── */}
      <div className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search department or head name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#15203b] text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <select
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#15203b] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="ALL">All Faculties</option>
            {faculties.map(f => (
              <option key={f._id} value={f._id}>{f.name} ({f.code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── DEPARTMENTS & HEADS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
            Loading Department Heads...
          </div>
        ) : filteredDepts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            No departments found.
          </div>
        ) : (
          filteredDepts.map((d) => {
            const hasHead = !!(d.headName || d.headTeacher?.name);
            const headName = d.headName || d.headTeacher?.name || 'Unassigned';
            const headId = d.headId || d.headTeacher?.teacherId || '';

            return (
              <div
                key={d._id}
                className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs font-mono border border-indigo-200 dark:border-indigo-800">
                      <Building2 size={12} />
                      {d.code}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${hasHead ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {hasHead ? 'Active Head Appointed' : 'Head Vacant'}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight mb-3">
                    {d.name}
                  </h3>

                  {/* Head Profile Cardlet */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                        <Shield size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {headName}
                        </p>
                        {headId && (
                          <p className="text-[10px] font-mono text-slate-400">
                            Teacher ID: {headId}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    onClick={() => handleOpenHistoryModal(d.code)}
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-semibold transition-colors"
                  >
                    <History size={13} /> Head History
                  </button>

                  <div className="flex items-center gap-1.5">
                    {hasHead && (
                      <button
                        onClick={() => handleRemoveHead(d.code)}
                        className="px-2 py-1 rounded text-rose-500 hover:bg-rose-50 text-[11px] font-semibold transition-colors"
                        title="Vacate Head position"
                      >
                        Vacate
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenAssignModal(d)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-500/20 transition-colors"
                    >
                      {hasHead ? 'Change Head' : 'Appoint Head'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── MODAL: ASSIGN / CHANGE HEAD ── */}
      <AnimatePresence>
        {showAssignModal && targetDept && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                    <Shield size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      Appoint Department Head
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Dept. of {targetDept.code} &bull; {targetDept.name}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowAssignModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              {/* Current Head info */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Current Incumbent</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {targetDept.headName || targetDept.headTeacher?.name || 'Vacant / None'}
                </span>
                {targetDept.headId && (
                  <span className="text-slate-400 ml-2 font-mono">({targetDept.headId})</span>
                )}
              </div>

              <form onSubmit={handleConfirmAssignHead} className="space-y-3.5 text-xs">
                {/* Select New Head */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Select Eligible Teacher *
                  </label>
                  {loadingTeachers ? (
                    <p className="text-xs text-slate-400">Loading department faculty members...</p>
                  ) : (
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-900 dark:text-white"
                      required
                    >
                      <option value="">-- Choose Professor / Teacher --</option>
                      {eligibleTeachers.map(t => (
                        <option key={t._id || t.teacherId} value={t.teacherId}>
                          {t.name} ({t.teacherId}) - {t.designation || 'Faculty Member'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Appointment / Handover Reason *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Regular 3-year term rotation, administrative handover"
                    value={appointmentReason}
                    onChange={(e) => setAppointmentReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                {/* Effective Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Effective Appointment Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Notice */}
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <AlertTriangle size={13} /> Strict Authority Transition Policy
                  </p>
                  <p>
                    Assigning a new Head will automatically demote the previous Head back to regular Teacher privileges, promote the new appointee to Department Head, and permanently record this action in the immutable audit history.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAssign}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20"
                  >
                    {submittingAssign ? 'Updating...' : 'Confirm Head Appointment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: HEADSHIP HISTORY TIMELINE ── */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                    <History size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      Department Head Appointment History
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Dept. of {historyDeptCode} &bull; Immutable Administrative Audit Log
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-8 text-center text-slate-400">
                  <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-indigo-500" />
                  Loading appointment records...
                </div>
              ) : headHistory.length === 0 ? (
                <div className="py-8 text-center text-slate-400 italic text-xs">
                  No historical headship records found for this department.
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {headHistory.map((h, idx) => (
                    <div key={h._id || idx} className="relative pl-7 text-xs space-y-1">
                      <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900 shadow-sm" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {h.newHeadName} ({h.newHeadId})
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(h.effectiveDate).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Previous Head: <span className="font-semibold text-slate-700 dark:text-slate-300">{h.previousHeadName || 'None'}</span>
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2 rounded border border-slate-100 dark:border-slate-800">
                        Reason: {h.reason}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Authorized by: {h.assignedByName || 'System Admin'} &bull; Status: <span className="uppercase font-mono font-bold">{h.status}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
