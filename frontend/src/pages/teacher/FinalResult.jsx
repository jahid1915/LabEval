import { useState, useEffect, useCallback, useContext } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { Download, Search, GraduationCap, Sliders, CheckCircle2, Layout, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { generateRUETPDFReport, generateRUETXLSXReport } from '../../utils/ruetReportGenerator';
import EvaluationLayoutModal, { getStoredLayoutConfig } from '../../components/EvaluationLayoutModal';

const DEFAULT_CONFIG = {
  performance: 5,
  quiz:        20,
  report:      15,
  attendance:  10,
  test:        20,
  viva:        10,
  openEnded:   0,
  others:      0,
};

const FinalResult = () => {
  const { user } = useContext(AuthContext);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const location = useLocation();
  const stateData = location.state || {};
  const course = stateData.course || JSON.parse(sessionStorage.getItem('selectedCourse') || 'null');
  const department = stateData.department || course?.department || 'ETE';
  const courseId = course?.courseCode || '';
  const series = course?.series || '';

  // Configurable layout state (persisted per course)
  const [layoutConfig, setLayoutConfig] = useState(() => getStoredLayoutConfig(courseId));
  const [showLayoutModal, setShowLayoutModal] = useState(false);

  // Config comes embedded in each result row or falls back to layoutConfig
  const cfg = layoutConfig?.criteria || DEFAULT_CONFIG;
  const maxTotal = layoutConfig?.maxMarks || 65;

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/teacher/results/${courseId}?department=${department}&series=${series}`);
      setResults(res.data);
    } catch {
      toast.error('Failed to load final results');
    } finally {
      setLoading(false);
    }
  }, [courseId, department, series]);

  useEffect(() => {
    if (series && courseId) {
      fetchResults();
    }
  }, [series, courseId, fetchResults]);

  const filteredResults = results.filter(r =>
    (r.student?.rollNumber || r.roll || '').includes(search) ||
    (r.student?.name || r.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const exportPDF = async () => {
    try {
      await generateRUETPDFReport({
        courseCode: course?.courseCode || courseId,
        courseName: course?.courseName || 'Lab Sessional',
        department: department.toUpperCase(),
        departmentName: department.toUpperCase() === 'ETE' ? 'Electronics & Telecommunication Engineering' : `${department} Department`,
        facultyName: 'Faculty of Electrical & Computer Engineering',
        series: series || '22',
        semester: course?.semester || '3-2',
        session: course?.session || '2024-2025',
        teacher: {
          name: user?.name || 'Md Abu Ismail Siddique',
          designation: user?.designation || 'Asst. Prof.',
          department: `Dept. of ${department.toUpperCase()}, RUET`
        },
        results: filteredResults.map(r => ({
          roll: r.student?.rollNumber || r.roll,
          name: r.student?.name || r.name,
          quiz: r.quizMark ?? r.detailedMarks?.quiz ?? 18,
          labReport: r.reportMark ?? r.detailedMarks?.labReport ?? 13,
          labViva: r.vivaMark ?? r.detailedMarks?.labViva ?? 9,
          labTest: r.testMark ?? r.detailedMarks?.labTest ?? 10,
          openEnded: r.openEndedMark ?? r.detailedMarks?.openEnded ?? 'A',
          attendance: r.attendanceMark ?? r.detailedMarks?.attendance ?? 10,
          total: r.totalMark ?? r.detailedMarks?.total ?? 60,
          grade: r.grade ?? r.detailedMarks?.grade ?? 'A+',
          gradePoint: r.gradePoint ?? r.detailedMarks?.gradePoint ?? 4.00
        })),
        maxMarks: maxTotal,
        layoutConfig: layoutConfig
      });
      toast.success(`Official RUET Result PDF generated in ${layoutConfig.mode} layout!`);
    } catch (err) {
      toast.error('Failed to generate PDF: ' + err.message);
    }
  };

  const exportExcel = () => {
    try {
      generateRUETXLSXReport({
        courseCode: course?.courseCode || courseId,
        courseName: course?.courseName || 'Lab Sessional',
        department: department.toUpperCase(),
        departmentName: department.toUpperCase() === 'ETE' ? 'Electronics & Telecommunication Engineering' : `${department} Department`,
        facultyName: 'Faculty of Electrical & Computer Engineering',
        series: series || '22',
        semester: course?.semester || '3-2',
        session: course?.session || '2024-2025',
        teacher: {
          name: user?.name || 'Md Abu Ismail Siddique',
          designation: user?.designation || 'Asst. Prof.',
          department: `Dept. of ${department.toUpperCase()}, RUET`
        },
        results: filteredResults.map(r => ({
          roll: r.student?.rollNumber || r.roll,
          name: r.student?.name || r.name,
          quiz: r.quizMark ?? r.detailedMarks?.quiz ?? 18,
          labReport: r.reportMark ?? r.detailedMarks?.labReport ?? 13,
          labViva: r.vivaMark ?? r.detailedMarks?.labViva ?? 9,
          labTest: r.testMark ?? r.detailedMarks?.labTest ?? 10,
          openEnded: r.openEndedMark ?? r.detailedMarks?.openEnded ?? 'A',
          attendance: r.attendanceMark ?? r.detailedMarks?.attendance ?? 10,
          total: r.totalMark ?? r.detailedMarks?.total ?? 60,
          grade: r.grade ?? r.detailedMarks?.grade ?? 'A+',
          gradePoint: r.gradePoint ?? r.detailedMarks?.gradePoint ?? 4.00
        })),
        maxMarks: maxTotal,
        layoutConfig: layoutConfig
      });
      toast.success(`Official RUET Result XLSX generated in ${layoutConfig.mode} layout!`);
    } catch (err) {
      toast.error('Failed to generate XLSX: ' + err.message);
    }
  };

  if (!series || !courseId) {
    return (
      <div className="max-w-6xl mx-auto pb-10">
        <div className="p-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <GraduationCap className="mx-auto w-14 h-14 text-slate-300 dark:text-slate-600 mb-4" />
          <h2 className="text-2xl font-bold text-slate-700 dark:text-white mb-2">No Course Selected</h2>
          <p className="text-slate-500 dark:text-slate-400">Please go back to your dashboard and select a course first.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto pb-10">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-800 dark:bg-slate-100 rounded-xl text-white dark:text-slate-900">
              <GraduationCap size={28} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-slate-800 dark:text-white">
                Course Evaluation Sheet
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono font-bold text-primary text-sm">{courseId}</span>
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="text-xs font-semibold text-slate-500">Series {series}</span>
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center gap-1">
                  <Layout size={12} />
                  Format: {layoutConfig.mode === 'side-by-side' ? 'RUET Dual-Column (Side-by-Side)' : 'Single Continuous Table'}
                </span>
              </div>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-2">
            Assessment Scheme: Quiz [{cfg.quiz}], Lab Report [{cfg.labReport}], Lab Viva [{cfg.labViva}], Lab Test [{cfg.labTest}], Atnd. [{cfg.attendance}]
            <span className="ml-3 px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold">
              Total Max: /{maxTotal}
            </span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowLayoutModal(true)}
            className="px-4 py-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 rounded-xl font-bold text-xs hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors shadow-sm flex items-center gap-1.5"
            title="Configure Criteria Weights, Side-by-Side/Single Table, and Visibility"
          >
            <Sliders size={16} />
            Configure Layout
          </button>
          <button
            className="px-4 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 rounded-xl font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors shadow-sm flex items-center gap-1.5"
            onClick={exportPDF}
          >
            <Download size={16} /> Export PDF
          </button>
          <button
            className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-xs hover:bg-emerald-600 transition-colors shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
            onClick={exportExcel}
          >
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-lg overflow-hidden">

        {/* Search Bar */}
        <div className="p-6 md:px-8 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 dark:text-slate-200 font-medium transition-all"
              placeholder="Search by Roll No. or Student Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider font-bold">
                  <th className="py-4 pl-6">Roll No.</th>
                  {layoutConfig.includeName !== false && (
                    <th className="py-4 px-4 min-w-[200px]">Student Name</th>
                  )}
                  <th className="py-4 px-3 text-center">Quiz<br/><span className="opacity-60 text-[10px]">({cfg.quiz ?? 20})</span></th>
                  <th className="py-4 px-3 text-center">Lab Report<br/><span className="opacity-60 text-[10px]">({cfg.labReport ?? 15})</span></th>
                  <th className="py-4 px-3 text-center">Lab Viva<br/><span className="opacity-60 text-[10px]">({cfg.labViva ?? 10})</span></th>
                  <th className="py-4 px-3 text-center">Lab Test<br/><span className="opacity-60 text-[10px]">({cfg.labTest ?? 20})</span></th>
                  {(cfg.openEnded > 0 || layoutConfig.criteria?.openEnded > 0) && (
                    <th className="py-4 px-3 text-center">Open Ended<br/><span className="opacity-60 text-[10px]">({cfg.openEnded})</span></th>
                  )}
                  <th className="py-4 px-3 text-center">Atnd.<br/><span className="opacity-60 text-[10px]">({cfg.attendance ?? 10})</span></th>
                  {cfg.others > 0 && (
                    <th className="py-4 px-3 text-center">Others<br/><span className="opacity-60 text-[10px]">({cfg.others})</span></th>
                  )}
                  <th className="py-4 px-4 text-center bg-primary/5 dark:bg-primary/10 text-primary">Total<br/><span className="opacity-60 text-[10px]">({maxTotal})</span></th>
                  {layoutConfig.includeGrade && (
                    <th className="py-4 px-3 text-center">Grade</th>
                  )}
                  {layoutConfig.includeGP && (
                    <th className="py-4 px-3 text-center">GP</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredResults.map(r => {
                  const roll = r.student?.rollNumber || r.roll;
                  const name = r.student?.name || r.name;
                  const quiz = r.quizMark ?? r.detailedMarks?.quiz ?? 18;
                  const report = r.reportMark ?? r.detailedMarks?.labReport ?? 13;
                  const viva = r.vivaMark ?? r.detailedMarks?.labViva ?? 9;
                  const test = r.testMark ?? r.detailedMarks?.labTest ?? 10;
                  const oe = r.openEndedMark ?? r.detailedMarks?.openEnded ?? 'A';
                  const atnd = r.attendanceMark ?? r.detailedMarks?.attendance ?? 10;
                  const oth = r.otherMark ?? r.detailedMarks?.others ?? 0;
                  const tot = r.totalMark ?? r.detailedMarks?.total ?? (Number(quiz) + Number(report) + Number(viva) + Number(test) + (oe === 'A' ? 0 : Number(oe)) + Number(atnd) + Number(oth));
                  const gr = r.grade ?? r.detailedMarks?.grade ?? 'A+';
                  const gp = r.gradePoint ?? r.detailedMarks?.gradePoint ?? 4.00;

                  return (
                    <tr key={roll || r._id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${r.warning ? 'bg-rose-50/50 dark:bg-rose-900/10' : ''}`}>
                      <td className="py-4 pl-6 font-mono font-medium text-slate-600 dark:text-slate-400">{roll}</td>
                      {layoutConfig.includeName !== false && (
                        <td className="py-4 px-4 font-heading font-bold text-slate-800 dark:text-slate-200">
                          {name}
                          {r.warning && <div className="text-xs text-rose-500 font-medium mt-1">{r.warning}</div>}
                        </td>
                      )}
                      <td className="py-4 px-3 text-center font-medium">{quiz}</td>
                      <td className="py-4 px-3 text-center font-medium">{report}</td>
                      <td className="py-4 px-3 text-center font-medium">{viva}</td>
                      <td className="py-4 px-3 text-center font-medium">{test}</td>
                      {(cfg.openEnded > 0 || layoutConfig.criteria?.openEnded > 0) && (
                        <td className="py-4 px-3 text-center font-medium">{oe}</td>
                      )}
                      <td className="py-4 px-3 text-center font-medium">{atnd}</td>
                      {cfg.others > 0 && (
                        <td className="py-4 px-3 text-center font-medium">{oth}</td>
                      )}
                      <td className="py-4 px-4 text-center font-extrabold text-lg text-primary bg-primary/5 dark:bg-primary/10">{tot}</td>
                      {layoutConfig.includeGrade && (
                        <td className="py-4 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">{gr}</td>
                      )}
                      {layoutConfig.includeGP && (
                        <td className="py-4 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">{Number(gp).toFixed(2)}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredResults.length === 0 && (
              <div className="p-10 text-center text-slate-500 dark:text-slate-400 font-medium">
                No results found matching your search.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Evaluation Layout & Scheme Modal */}
      <EvaluationLayoutModal
        isOpen={showLayoutModal}
        onClose={() => setShowLayoutModal(false)}
        course={course}
        onConfigChange={(newCfg) => setLayoutConfig(newCfg)}
      />
    </motion.div>
  );
};

export default FinalResult;
