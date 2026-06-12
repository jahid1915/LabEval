import { useState, useEffect, useCallback, useContext } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { Download, Search, GraduationCap } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const DEFAULT_CONFIG = {
  performance: 5,
  quiz:        30,
  report:      10,
  attendance:  5,
  test:        20,
  others:      5,
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

  // Config comes embedded in each result row (from backend)
  const cfg = results[0]?.config || DEFAULT_CONFIG;

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
    r.student.rollNumber.includes(search) ||
    r.student.name.toLowerCase().includes(search.toLowerCase())
  );

  const exportPDF = async () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    // Load logo
    let logoLoaded = false;
    let logoBase64 = '';
    try {
      logoBase64 = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (e) => reject(e);
        img.src = '/RUET.png';
      });
      logoLoaded = true;
    } catch (err) {
      console.warn('Failed to load RUET logo:', err);
    }

    // PDF layout coordinates
    let startY = 15;

    if (logoLoaded) {
      doc.addImage(logoBase64, 'PNG', 14, startY, 22, 22);

      // Metadata next to the logo
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Rajshahi University of Engineering & Technology (RUET)', 42, startY + 4);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Course Name: ${course?.courseName || 'N/A'} (${courseId})`, 42, startY + 9);
      doc.text(`Teacher Name: ${user?.name || 'N/A'}`, 42, startY + 14);
      doc.text(`Series: ${series}    |    Department: ${department.toUpperCase()}`, 42, startY + 19);

      startY += 26; // move table start down
    } else {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`Final Results - ${courseId}`, 14, startY);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Course Name: ${course?.courseName || 'N/A'}`, 14, startY + 6);
      doc.text(`Teacher Name: ${user?.name || 'N/A'}`, 14, startY + 11);
      doc.text(`Series: ${series}    |    Department: ${department.toUpperCase()}`, 14, startY + 16);

      startY += 22;
    }

    const tableColumn = [
      'Roll', 'Name',
      `Att(${cfg.attendance})`,
      `Rep(${cfg.report})`,
      `Perf(${cfg.performance})`,
      `Quiz(${cfg.quiz})`,
      `Test(${cfg.test})`,
      `Oth(${cfg.others})`,
      'Total(/75)'
    ];

    const tableRows = filteredResults.map(r => [
      r.student.rollNumber,
      r.student.name,
      r.attendanceMark,
      r.reportMark,
      r.perfMark,
      r.quizMark,
      r.testMark,
      r.otherMark,
      r.totalMark,
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: startY,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59] }, // Slate-800 look
      alternateRowStyles: { fillColor: [248, 250, 252] }, // Slate-50 background for alternate rows
    });

    doc.save(`Results_${courseId}.pdf`);
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredResults.map(r => ({
      'Roll No':      r.student.rollNumber,
      'Name':         r.student.name,
      [`Attendance (/${cfg.attendance})`]: r.attendanceMark,
      [`Report (/${cfg.report})`]:         r.reportMark,
      [`Performance (/${cfg.performance})`]: r.perfMark,
      [`Quiz (/${cfg.quiz})`]:             r.quizMark,
      [`Test (/${cfg.test})`]:             r.testMark,
      [`Others (/${cfg.others})`]:         r.otherMark,
      'Total (/75)':  r.totalMark,
      'Warning':      r.warning || '',
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    XLSX.writeFile(workbook, `Results_${courseId}.xlsx`);
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
            <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-slate-800 dark:text-white">Final Results</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg mt-2">
            Results for <span className="text-primary font-bold">{courseId}</span>
            <span className="ml-3 px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-bold">Total: /75</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            className="px-5 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 rounded-xl font-bold text-sm hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors shadow-sm flex items-center gap-2"
            onClick={exportPDF}
          >
            <Download size={18} /> Export PDF
          </button>
          <button
            className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors shadow-md shadow-emerald-500/20 flex items-center gap-2"
            onClick={exportExcel}
          >
            <Download size={18} /> Export Excel
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
                  <th className="py-4 px-4 min-w-[200px]">Student Name</th>
                  <th className="py-4 px-3 text-center">Att<br/><span className="opacity-60 text-[10px]">({cfg.attendance})</span></th>
                  <th className="py-4 px-3 text-center">Rep<br/><span className="opacity-60 text-[10px]">({cfg.report})</span></th>
                  <th className="py-4 px-3 text-center">Perf<br/><span className="opacity-60 text-[10px]">({cfg.performance})</span></th>
                  <th className="py-4 px-3 text-center">Quiz<br/><span className="opacity-60 text-[10px]">({cfg.quiz})</span></th>
                  <th className="py-4 px-3 text-center">Test<br/><span className="opacity-60 text-[10px]">({cfg.test})</span></th>
                  <th className="py-4 px-3 text-center">Oth<br/><span className="opacity-60 text-[10px]">({cfg.others})</span></th>
                  <th className="py-4 px-4 text-center bg-primary/5 dark:bg-primary/10 text-primary">Total<br/><span className="opacity-60 text-[10px]">(75)</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredResults.map(r => (
                  <tr key={r.student._id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${r.warning ? 'bg-rose-50/50 dark:bg-rose-900/10' : ''}`}>
                    <td className="py-4 pl-6 font-mono font-medium text-slate-600 dark:text-slate-400">{r.student.rollNumber}</td>
                    <td className="py-4 px-4 font-heading font-bold text-slate-800 dark:text-slate-200">
                      {r.student.name}
                      {r.warning && <div className="text-xs text-rose-500 font-medium mt-1">{r.warning}</div>}
                    </td>
                    <td className="py-4 px-3 text-center font-medium">{r.attendanceMark}</td>
                    <td className="py-4 px-3 text-center font-medium">{r.reportMark}</td>
                    <td className="py-4 px-3 text-center font-medium">{r.perfMark}</td>
                    <td className="py-4 px-3 text-center font-medium">{r.quizMark}</td>
                    <td className="py-4 px-3 text-center font-medium">{r.testMark}</td>
                    <td className="py-4 px-3 text-center font-medium">{r.otherMark}</td>
                    <td className="py-4 px-4 text-center font-extrabold text-lg text-primary bg-primary/5 dark:bg-primary/10">{r.totalMark}</td>
                  </tr>
                ))}
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
    </motion.div>
  );
};

export default FinalResult;
