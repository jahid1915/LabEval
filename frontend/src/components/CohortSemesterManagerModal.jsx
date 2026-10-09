import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Layers, Users, Building2, CheckCircle2,
  AlertTriangle, ArrowRight, RefreshCw, X, Shield, Info
} from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-toastify';

const SEMESTER_OPTIONS = [
  '1st Semester',
  '2nd Semester',
  '3rd Semester',
  '4th Semester',
  '5th Semester',
  '6th Semester',
  '7th Semester',
  '8th Semester'
];

export default function CohortSemesterManagerModal({
  isOpen,
  onClose,
  initialDepartment = '',
  initialSeries = '',
  initialSection = 'ALL',
  onSuccess
}) {
  const [departments, setDepartments] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  // Form selections
  const [selectedDept, setSelectedDept] = useState(initialDepartment);
  const [selectedSeries, setSelectedSeries] = useState(initialSeries);
  const [selectedSection, setSelectedSection] = useState(initialSection);
  const [selectedSemester, setSelectedSemester] = useState('5th Semester');
  const [selectedSession, setSelectedSession] = useState('');

  // Live preview state
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Confirmation stage
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load lookup options
  const fetchLookups = useCallback(async () => {
    setLoadingLookups(true);
    try {
      const [dRes, sRes, sessRes] = await Promise.all([
        api.get('/departments'),
        api.get('/academic/series'),
        api.get('/academic/sessions')
      ]);

      const deptDocs = Array.isArray(dRes.data) ? dRes.data : (dRes.data?.departments || []);
      const seriesDocs = Array.isArray(sRes.data) ? sRes.data : (sRes.data?.series || []);
      const sessionDocs = Array.isArray(sessRes.data) ? sessRes.data : (sessRes.data?.sessions || []);

      setDepartments(deptDocs);
      setSeriesList(seriesDocs);
      setSessions(sessionDocs);

      if (!selectedDept && deptDocs.length > 0) {
        setSelectedDept(deptDocs[0].code || deptDocs[0].name || '');
      }

      const activeSess = sessionDocs.find(s => s.isCurrent || s.status === 'ACTIVE');
      if (activeSess) {
        setSelectedSession(activeSess.name);
      }
    } catch (err) {
      toast.error('Failed to load academic reference data');
    } finally {
      setLoadingLookups(false);
    }
  }, [selectedDept]);

  useEffect(() => {
    if (isOpen) {
      fetchLookups();
      setShowConfirm(false);
    }
  }, [isOpen, fetchLookups]);

  // Filter series based on selected department
  const filteredSeries = seriesList.filter(s => {
    if (!selectedDept) return true;
    const deptCode = s.departmentCode || s.department?.code;
    return !deptCode || deptCode.toUpperCase() === selectedDept.toUpperCase();
  });

  // Default series selection when department changes
  useEffect(() => {
    if (filteredSeries.length > 0 && (!selectedSeries || !filteredSeries.some(s => s.name === selectedSeries))) {
      setSelectedSeries(filteredSeries[0].name);
    }
  }, [selectedDept, filteredSeries, selectedSeries]);

  // Fetch live cohort preview
  const fetchPreview = useCallback(async () => {
    if (!selectedDept || !selectedSeries) {
      setPreviewData(null);
      return;
    }

    setLoadingPreview(true);
    try {
      const res = await api.get('/academic/cohort-preview', {
        params: {
          department: selectedDept,
          series: selectedSeries,
          section: selectedSection !== 'ALL' ? selectedSection : undefined
        }
      });
      if (res.data.success) {
        setPreviewData(res.data);
      }
    } catch (err) {
      setPreviewData(null);
    } finally {
      setLoadingPreview(false);
    }
  }, [selectedDept, selectedSeries, selectedSection]);

  useEffect(() => {
    if (isOpen && selectedDept && selectedSeries) {
      fetchPreview();
    }
  }, [isOpen, selectedDept, selectedSeries, selectedSection, fetchPreview]);

  // Handle progression execution
  const handleExecuteProgression = async () => {
    if (!selectedDept || !selectedSeries || !selectedSemester) {
      toast.error('Department, series, and target semester are required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/academic/cohort-semester', {
        department: selectedDept,
        series: selectedSeries,
        section: selectedSection,
        currentSemester: selectedSemester,
        academicSession: selectedSession
      });

      if (res.data.success) {
        toast.success(
          res.data.message ||
          `Successfully updated ${selectedDept} Series ${selectedSeries} to ${selectedSemester}`
        );
        setShowConfirm(false);
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update cohort semester');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#243244] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#243244] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Cohort Semester Progression Manager
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update running semester for student batches without overwriting marks history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {loadingLookups ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
              Loading academic departments, series, and sessions...
            </div>
          ) : (
            <>
              {/* Selectors Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Department */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Department *
                  </label>
                  <select
                    value={selectedDept}
                    onChange={(e) => {
                      setSelectedDept(e.target.value);
                      setShowConfirm(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    {departments.map((d) => (
                      <option key={d._id} value={d.code}>
                        {d.code} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Series / Batch */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Academic Series / Batch *
                  </label>
                  <select
                    value={selectedSeries}
                    onChange={(e) => {
                      setSelectedSeries(e.target.value);
                      setShowConfirm(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    {filteredSeries.length > 0 ? (
                      filteredSeries.map((s) => (
                        <option key={s._id} value={s.name}>
                          Series {s.name} {s.currentSemester ? `(${s.currentSemester})` : ''}
                        </option>
                      ))
                    ) : (
                      <option value="">No series found for this department</option>
                    )}
                  </select>
                </div>

                {/* 3. Section */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Academic Section
                  </label>
                  <select
                    value={selectedSection}
                    onChange={(e) => {
                      setSelectedSection(e.target.value);
                      setShowConfirm(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="ALL">All Sections (Entire Series)</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>

                {/* 4. Target Current Semester */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                    New Running Semester *
                  </label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => {
                      setSelectedSemester(e.target.value);
                      setShowConfirm(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 text-xs font-bold focus:outline-none focus:border-indigo-600"
                  >
                    {SEMESTER_OPTIONS.map((sem) => (
                      <option key={sem} value={sem}>
                        {sem}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Academic Session */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Academic Session (Calendar Year)
                  </label>
                  <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#243244] bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="">Keep current session</option>
                    {sessions.map((sess) => (
                      <option key={sess._id} value={sess.name}>
                        Session {sess.name} {sess.isCurrent ? '(Active Current Session)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Live Cohort Status
                  </span>
                  {loadingPreview ? (
                    <span className="text-[11px] text-indigo-500 flex items-center gap-1">
                      <RefreshCw size={11} className="animate-spin" /> Querying...
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Live Preview Verified
                    </span>
                  )}
                </div>

                {previewData ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-600 dark:text-slate-300">
                        Target Group: <strong className="text-slate-900 dark:text-white">{previewData.department} Series {previewData.series} {previewData.section !== 'ALL' ? `(Section ${previewData.section})` : '(All Sections)'}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {previewData.studentCount} Students Found
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>Currently recorded as:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
                        {previewData.currentSemester || '1st Semester'}
                      </span>
                      <ArrowRight size={13} className="text-indigo-500" />
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40">
                        {selectedSemester}
                      </span>
                    </div>

                    {previewData.sampleStudents?.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Sample Matching Rolls:</span>
                        <div className="flex flex-wrap gap-1">
                          {previewData.sampleStudents.slice(0, 6).map((stu) => (
                            <span
                              key={stu.rollNumber}
                              className="px-2 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            >
                              {stu.rollNumber} ({stu.name.split(' ')[0]})
                            </span>
                          ))}
                          {previewData.studentCount > 6 && (
                            <span className="text-[10px] text-slate-400 self-center">
                              +{previewData.studentCount - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs italic">
                    Select a department and series above to preview affected students.
                  </p>
                )}
              </div>

              {/* Confirmation Callout (if active) */}
              {showConfirm && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold">
                    <AlertTriangle size={16} />
                    Confirm Academic Semester Progression
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                    You are updating the active running semester for <strong>{previewData?.studentCount || 0} students</strong> in{' '}
                    <strong>{selectedDept} Series {selectedSeries} {selectedSection !== 'ALL' ? `(Section ${selectedSection})` : ''}</strong> from{' '}
                    <strong>{previewData?.currentSemester || 'current'}</strong> to <strong>{selectedSemester}</strong>.
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium pt-1">
                    <Shield size={13} />
                    Data Safety Guarantee: Completed lab records, quiz marks, attendance, and historical results remain 100% intact.
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-[#243244] flex items-center justify-between bg-slate-50/50 dark:bg-[#111827]">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info size={13} />
            <span>Applies strictly to chosen cohort</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#172033] text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
            >
              Cancel
            </button>

            {!showConfirm ? (
              <button
                type="button"
                disabled={!selectedDept || !selectedSeries || loadingPreview || previewData?.studentCount === 0}
                onClick={() => setShowConfirm(true)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>Proceed to Confirmation</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleExecuteProgression}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> Updating Cohort...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} /> Confirm & Apply Progression
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
