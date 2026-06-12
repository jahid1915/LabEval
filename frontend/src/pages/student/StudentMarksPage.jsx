import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Award, ClipboardList, Activity, HelpCircle,
  FileCheck, Layers, CheckCircle, XCircle, ChevronDown, Calendar
} from 'lucide-react';

const DEFAULT_CONFIG = {
  performance: 5,
  quiz:        30,
  report:      10,
  attendance:  5,
  test:        20,
  others:      5,
};

const MARK_CATEGORIES = [
  { key: 'attendance',  label: 'Attendance',      icon: <ClipboardList size={20} />, color: 'from-blue-500 to-cyan-400',    shadow: 'shadow-blue-500/20' },
  { key: 'report',      label: 'Lab Report',      icon: <ClipboardList size={20} />, color: 'from-indigo-500 to-blue-400',  shadow: 'shadow-indigo-500/20' },
  { key: 'performance', label: 'Lab Performance', icon: <Activity size={20} />,      color: 'from-purple-500 to-fuchsia-500', shadow: 'shadow-purple-500/20' },
  { key: 'quiz',        label: 'Lab Quiz',        icon: <HelpCircle size={20} />,    color: 'from-pink-500 to-rose-400',    shadow: 'shadow-pink-500/20' },
  { key: 'test',        label: 'Lab Test',        icon: <FileCheck size={20} />,     color: 'from-orange-500 to-amber-400', shadow: 'shadow-orange-500/20' },
  { key: 'others',      label: 'Others',          icon: <Layers size={20} />,        color: 'from-emerald-500 to-teal-400', shadow: 'shadow-emerald-500/20' },
];

const ProgressBar = ({ value, max, colorClass }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`h-full rounded-full bg-gradient-to-r ${colorClass}`}
      />
    </div>
  );
};

const MarkCard = ({ category, markData }) => {
  const pct = markData.max > 0 ? ((markData.mark / markData.max) * 100).toFixed(0) : 0;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-lg transition-all duration-300 group"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${category.color} ${category.shadow} shadow-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}>
          {category.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-heading font-bold text-sm text-slate-800 dark:text-white">{category.label}</h4>
          <p className="text-xs text-slate-400">{pct}% achieved</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-heading font-extrabold text-slate-800 dark:text-white">{markData.mark}</span>
          <span className="text-sm text-slate-400 font-semibold">/{markData.max}</span>
        </div>
      </div>
      <ProgressBar value={markData.mark} max={markData.max} colorClass={category.color} />
      {/* Extra info for attendance/report */}
      {markData.percentage !== undefined && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          {markData.present ?? markData.submitted}/{markData.total} ({markData.percentage}%)
        </p>
      )}
    </motion.div>
  );
};

const RecordSection = ({ title, icon, records, renderRow }) => {
  const [expanded, setExpanded] = useState(false);

  if (!records || records.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <span className="font-heading font-bold text-sm text-slate-800 dark:text-white flex-1">{title}</span>
        <span className="text-xs text-slate-400 font-semibold mr-2">{records.length} records</span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4">
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                      <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-300">Date</th>
                      <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-300">Day</th>
                      <th className="py-2.5 px-4 text-right font-semibold text-slate-600 dark:text-slate-300">Status / Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {records.map((record, idx) => renderRow(record, idx))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StudentMarksPage = () => {
  const { courseCode } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMarks = useCallback(async () => {
    try {
      const { data: marksData } = await api.get(`/student/marks/${courseCode}`);
      setData(marksData);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load marks');
      navigate('/student');
    } finally {
      setLoading(false);
    }
  }, [courseCode, navigate]);

  useEffect(() => {
    fetchMarks();
  }, [fetchMarks]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner text-primary loading-lg" />
      </div>
    );
  }

  if (!data) return null;

  const { course, marks, totalMark, totalMax, records } = data;
  const maxTotal = totalMax || 75;
  const totalPct = maxTotal > 0 ? Math.min((totalMark / maxTotal) * 100, 100) : 0;

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Color for progress bar based on percentage
  const totalColorClass =
    totalPct >= 80 ? 'from-emerald-400 to-teal-500' :
    totalPct >= 60 ? 'from-blue-400 to-indigo-500' :
    totalPct >= 40 ? 'from-amber-400 to-orange-500' :
    'from-rose-400 to-red-500';

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={() => navigate('/student')}
          className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-heading font-extrabold text-slate-800 dark:text-white">
              {course.courseCode}
            </h1>
            <span className="text-slate-500 dark:text-slate-400 font-medium">{course.courseName}</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Teacher: {course.teacherName} · Series {course.series} · {course.department}
          </p>
        </div>
      </div>

      {/* Total Marks Summary */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
      >
        <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6">
          {/* Score Circle */}
          <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${totalColorClass} flex items-center justify-center shadow-2xl shrink-0`}>
            <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-900 flex flex-col items-center justify-center">
              <span className="text-3xl font-heading font-extrabold text-slate-800 dark:text-white">{totalMark}</span>
              <span className="text-xs text-slate-400 font-bold">/{maxTotal}</span>
            </div>
          </div>

          {/* Total Info */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-heading font-extrabold text-slate-800 dark:text-white mb-1">
              Your Result
            </h2>
            <div className="flex items-end gap-2 justify-center sm:justify-start mb-3">
              <span className="text-5xl font-heading font-extrabold text-primary">{totalMark}</span>
              <span className="text-xl text-slate-400 font-bold mb-1">/{maxTotal}</span>
            </div>
            <div className="w-full max-w-md">
              <ProgressBar value={totalMark} max={maxTotal} colorClass={totalColorClass} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{totalPct.toFixed(1)}% of total marks achieved</p>
          </div>

          {/* Award Icon */}
          <div className="hidden md:flex items-center justify-center">
            <Award className="w-16 h-16 text-slate-200 dark:text-slate-700" />
          </div>
        </div>
      </motion.div>

      {/* Marks Breakdown Grid */}
      <div>
        <h2 className="text-xl font-heading font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-primary" />
          Marks Breakdown
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MARK_CATEGORIES.map((cat, idx) => (
            marks[cat.key] && (
              <motion.div key={cat.key} transition={{ delay: 0.05 * idx }}>
                <MarkCard category={cat} markData={marks[cat.key]} />
              </motion.div>
            )
          ))}
        </div>
      </div>

      {/* Detailed Records (Expandable) */}
      <div>
        <h2 className="text-xl font-heading font-bold text-slate-800 dark:text-white mb-4">
          Detailed Records
        </h2>
        <div className="space-y-3">
          <RecordSection
            title="Attendance History"
            icon={<ClipboardList size={16} className="text-primary" />}
            records={records.attendances}
            renderRow={(r, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">{formatDate(r.date)}</td>
                <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{r.dayName}</td>
                <td className="py-2.5 px-4 text-right">
                  {r.status === 'Present'
                    ? <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs"><CheckCircle size={12} />Present</span>
                    : <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-xs"><XCircle size={12} />Absent</span>
                  }
                </td>
              </tr>
            )}
          />

          <RecordSection
            title="Lab Report History"
            icon={<ClipboardList size={16} className="text-primary" />}
            records={records.reports}
            renderRow={(r, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">{formatDate(r.date)}</td>
                <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{r.dayName}</td>
                <td className="py-2.5 px-4 text-right">
                  {r.status === 'Submitted'
                    ? <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs"><CheckCircle size={12} />Submitted</span>
                    : <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-xs"><XCircle size={12} />Not Submitted</span>
                  }
                </td>
              </tr>
            )}
          />

          <RecordSection
            title="Lab Performance History"
            icon={<Activity size={16} className="text-primary" />}
            records={records.performances}
            renderRow={(r, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">{formatDate(r.date)}</td>
                <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{r.dayName}</td>
                <td className="py-2.5 px-4 text-right font-bold text-slate-800 dark:text-white">{r.marks}</td>
              </tr>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default StudentMarksPage;
