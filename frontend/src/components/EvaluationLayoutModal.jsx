import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sliders, Layout, CheckSquare, Sparkles, X, RotateCcw,
  Check, Eye, FileText, Layers, Hash
} from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-toastify';

export const DEFAULT_LAYOUT_CONFIG = {
  mode: 'side-by-side', // 'side-by-side' | 'single-table'
  motto: "Heaven's light is our guide",
  showMotto: true,
  includeName: false,
  includeGrade: false,
  includeGP: false,
  criteria: {
    quiz: 20,
    labReport: 15,
    labViva: 10,
    labTest: 20,
    openEnded: 0,
    attendance: 10,
    others: 0
  },
  maxMarks: 65,
  remarks: ''
};

export const getStoredLayoutConfig = (courseCode) => {
  try {
    const key = `ruet_layout_config_${courseCode || 'default'}`;
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    /* fallback to default */
  }
  return DEFAULT_LAYOUT_CONFIG;
};

export const saveStoredLayoutConfig = (courseCode, config) => {
  try {
    const key = `ruet_layout_config_${courseCode || 'default'}`;
    localStorage.setItem(key, JSON.stringify(config));
  } catch (e) {
    /* fallback */
  }
};

export default function EvaluationLayoutModal({
  isOpen,
  onClose,
  course,
  onConfigChange
}) {
  const courseCode = course?.courseCode || 'EEE 3154';
  const [config, setConfig] = useState(() => getStoredLayoutConfig(courseCode));
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('criteria'); // 'criteria' | 'layout' | 'columns'

  useEffect(() => {
    if (isOpen) {
      setConfig(getStoredLayoutConfig(courseCode));
    }
  }, [isOpen, courseCode]);

  if (!isOpen) return null;

  // Calculate live total marks from criteria
  const computedMaxMarks = 
    (Number(config.criteria.quiz) || 0) +
    (Number(config.criteria.labReport) || 0) +
    (Number(config.criteria.labViva) || 0) +
    (Number(config.criteria.labTest) || 0) +
    (Number(config.criteria.openEnded) || 0) +
    (Number(config.criteria.attendance) || 0) +
    (Number(config.criteria.others) || 0);

  const handleCriteriaChange = (field, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setConfig(prev => ({
      ...prev,
      criteria: {
        ...prev.criteria,
        [field]: num
      }
    }));
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_LAYOUT_CONFIG);
    toast.info('Reset to official RUET standard marks breakdown');
  };

  const handleSave = async () => {
    setSaving(true);
    const updatedConfig = {
      ...config,
      maxMarks: computedMaxMarks || 65
    };
    
    // Save to local storage
    saveStoredLayoutConfig(courseCode, updatedConfig);
    
    // Attempt to sync to backend course/offering config if available
    try {
      if (course?._id) {
        await api.patch(`/teacher/courses/${course._id}/config`, {
          quiz: updatedConfig.criteria.quiz,
          labReport: updatedConfig.criteria.labReport,
          labViva: updatedConfig.criteria.labViva,
          labTest: updatedConfig.criteria.labTest,
          openEnded: updatedConfig.criteria.openEnded,
          attendance: updatedConfig.criteria.attendance,
          others: updatedConfig.criteria.others
        });
      }
    } catch {
      // Non-blocking sync error
    }

    setSaving(false);
    toast.success('Evaluation layout & assessment scheme saved!');
    if (onConfigChange) onConfigChange(updatedConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-6 relative my-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-mono text-xs font-bold">
                {courseCode}
              </span>
              <span className="text-xs text-slate-400 font-medium">Instructor Assessment Controls</span>
            </div>
            <h2 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders size={20} className="text-purple-600 dark:text-purple-400" />
              Configure Layout & Evaluation Scheme
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Customize marks distribution, table layout, and column visibility anytime. Changes immediately update your tables, PDF, and Excel exports.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('criteria')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'criteria'
                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Hash size={14} /> Marks Breakdown ({computedMaxMarks})
          </button>
          <button
            onClick={() => setActiveTab('layout')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'layout'
                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layout size={14} /> Sheet Format ({config.mode === 'side-by-side' ? 'Dual-Col' : 'Single'})
          </button>
          <button
            onClick={() => setActiveTab('columns')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'columns'
                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Eye size={14} /> Column Visibility
          </button>
        </div>

        {/* Tab 1: Marks Breakdown */}
        {activeTab === 'criteria' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40">
              <div>
                <span className="text-xs font-bold text-purple-800 dark:text-purple-300">Total Max Marks Calculated</span>
                <p className="text-[11px] text-purple-600/80 dark:text-purple-400">Sum of all individual assessment criteria</p>
              </div>
              <div className="text-2xl font-heading font-black text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-900 px-4 py-1 rounded-xl shadow-sm border border-purple-200 dark:border-purple-800">
                {computedMaxMarks} <span className="text-xs font-medium text-slate-400">Marks</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { key: 'quiz', label: 'Lab Quiz', def: 20, max: 40 },
                { key: 'labReport', label: 'Lab Report', def: 15, max: 30 },
                { key: 'labViva', label: 'Lab Viva', def: 10, max: 25 },
                { key: 'labTest', label: 'Lab Test', def: 20, max: 40 },
                { key: 'openEnded', label: 'Open Ended Lab', def: 0, max: 30 },
                { key: 'attendance', label: 'Attendance', def: 10, max: 20 },
                { key: 'others', label: 'Other/Performance', def: 0, max: 20 },
              ].map(item => (
                <div key={item.key} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      {item.label}
                    </label>
                    <span className="text-[10px] text-slate-400">RUET Standard: [{item.def}]</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max={item.max}
                      value={config.criteria[item.key] ?? 0}
                      onChange={(e) => handleCriteriaChange(item.key, e.target.value)}
                      className="w-16 px-2.5 py-1.5 text-center font-mono font-bold text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Layout Format */}
        {activeTab === 'layout' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select how students and mark columns are organized in your assessment sheet:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: Side-by-Side */}
              <div
                onClick={() => setConfig(prev => ({ ...prev, mode: 'side-by-side' }))}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  config.mode === 'side-by-side'
                    ? 'bg-purple-500/10 border-purple-500 ring-2 ring-purple-500/30'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-heading font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Layers size={16} className="text-purple-600" />
                    RUET Dual-Column (Side-by-Side)
                  </span>
                  {config.mode === 'side-by-side' && <Check size={16} className="text-purple-600 font-bold" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                  Matches RUET official format. Splits rolls into left and right groups side-by-side on a landscape page. Saves paper and matches the Dean Office requirement.
                </p>
                <div className="flex gap-1 h-7 opacity-75">
                  <div className="flex-1 bg-purple-200 dark:bg-purple-900/40 rounded border border-purple-300 dark:border-purple-800 flex items-center justify-center text-[9px] font-mono">Rolls 1-30</div>
                  <div className="w-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                  <div className="flex-1 bg-purple-200 dark:bg-purple-900/40 rounded border border-purple-300 dark:border-purple-800 flex items-center justify-center text-[9px] font-mono">Rolls 31-60</div>
                </div>
              </div>

              {/* Option B: Single Table */}
              <div
                onClick={() => setConfig(prev => ({ ...prev, mode: 'single-table' }))}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  config.mode === 'single-table'
                    ? 'bg-purple-500/10 border-purple-500 ring-2 ring-purple-500/30'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-heading font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                    <FileText size={16} className="text-purple-600" />
                    Standard Continuous Table
                  </span>
                  {config.mode === 'single-table' && <Check size={16} className="text-purple-600 font-bold" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                  Traditional single table layout. Rolls are listed sequentially in a single column with wide columns for student names, detailed marks, and letter grades.
                </p>
                <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[9px] font-mono text-slate-600 dark:text-slate-400">
                  Roll &bull; Name &bull; Quiz &bull; Report &bull; Viva &bull; Test &bull; Total
                </div>
              </div>
            </div>

            {/* Custom Motto Input */}
            <div className="pt-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                University Header Motto Text
              </label>
              <input
                type="text"
                value={config.motto}
                onChange={(e) => setConfig(prev => ({ ...prev, motto: e.target.value }))}
                placeholder="Heaven's light is our guide"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 font-serif italic"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Column Visibility */}
        {activeTab === 'columns' && (
          <div className="space-y-3.5">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Toggle specific columns or elements on the report according to examination board requirements:
            </p>

            <div className="space-y-2.5">
              {[
                {
                  key: 'includeName',
                  label: 'Include Student Name Column',
                  desc: 'Disable for blind/anonymous grading sheets where only Roll Numbers should be visible.'
                },
                {
                  key: 'includeGrade',
                  label: 'Include Letter Grade Column (A+, A, B...)',
                  desc: 'Displays the calculated letter grade based on the RUET grading scale.'
                },
                {
                  key: 'includeGP',
                  label: 'Include Grade Point Column (4.00, 3.75...)',
                  desc: 'Displays the numerical grade point alongside the marks total.'
                },
                {
                  key: 'showMotto',
                  label: 'Display University Motto ("Heaven\'s light is our guide")',
                  desc: 'Official RUET motto printed centered at the very top of the page.'
                },
              ].map(item => (
                <label
                  key={item.key}
                  className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/70 cursor-pointer transition-all"
                >
                  <input
                    type="checkbox"
                    checked={!!config[item.key]}
                    onChange={(e) => setConfig(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {item.label}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {item.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            Reset to RUET Default
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-all flex items-center gap-1.5"
            >
              {saving ? <span className="loading loading-spinner loading-xs" /> : <Check size={14} />}
              Apply & Save Layout
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
