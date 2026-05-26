import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { Download, Search, GraduationCap } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const FinalResult = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const location = useLocation();
  const stateData = location.state || {};
  const course = stateData.course || JSON.parse(sessionStorage.getItem('selectedCourse') || 'null');
  const department = stateData.department || course?.department || 'ETE';
  const courseId = course?.courseCode || '';
  const series = course?.series || ''; 

  useEffect(() => {
    if (series && courseId) {
      fetchResults();
    }
  }, [series, courseId]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/teacher/results/${courseId}?department=${department}&series=${series}`);
      setResults(res.data);
    } catch (error) {
      toast.error('Failed to load final results');
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter(r => 
    r.student.rollNumber.includes(search) || 
    r.student.name.toLowerCase().includes(search.toLowerCase())
  );

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Final Results - ${courseId}`, 14, 15);
    
    const tableColumn = ["Roll", "Name", "Att", "Rep", "Perf", "Viva", "Quiz", "Test", "Oth", "Total", "Grade"];
    const tableRows = [];

    filteredResults.forEach(r => {
      const rowData = [
        r.student.rollNumber,
        r.student.name,
        r.attendanceMark,
        r.reportMark,
        r.perfMark,
        r.vivaMark,
        r.quizMark,
        r.testMark,
        r.otherMark,
        r.totalMark,
        r.grade
      ];
      tableRows.push(rowData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] }
    });
    
    doc.save(`Results_${courseId}.pdf`);
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredResults.map(r => ({
      Roll: r.student.rollNumber,
      Name: r.student.name,
      Attendance: r.attendanceMark,
      Report: r.reportMark,
      Performance: r.perfMark,
      Viva: r.vivaMark,
      Quiz: r.quizMark,
      Test: r.testMark,
      Others: r.otherMark,
      Total: r.totalMark,
      Grade: r.grade,
      Warning: r.warning || ''
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
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
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg mt-2">Calculated grades and export panel for <span className="text-primary font-bold">{courseId}</span></p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 rounded-xl font-bold text-sm hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors shadow-sm flex items-center gap-2" onClick={exportPDF}>
            <Download size={18} /> Export PDF
          </button>
          <button className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors shadow-md shadow-emerald-500/20 flex items-center gap-2" onClick={exportExcel}>
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
           <div className="p-20 flex justify-center"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider font-bold">
                  <th className="py-4 pl-6">Roll No.</th>
                  <th className="py-4 px-4 min-w-[200px]">Student Name</th>
                  <th className="py-4 px-3 text-center">Att<br/><span className="opacity-60 text-[10px]">(10)</span></th>
                  <th className="py-4 px-3 text-center">Rep<br/><span className="opacity-60 text-[10px]">(10)</span></th>
                  <th className="py-4 px-3 text-center">Perf<br/><span className="opacity-60 text-[10px]">(5)</span></th>
                  <th className="py-4 px-3 text-center">Viva<br/><span className="opacity-60 text-[10px]">(25)</span></th>
                  <th className="py-4 px-3 text-center">Quiz<br/><span className="opacity-60 text-[10px]">(20)</span></th>
                  <th className="py-4 px-3 text-center">Test<br/><span className="opacity-60 text-[10px]">(20)</span></th>
                  <th className="py-4 px-3 text-center">Oth<br/><span className="opacity-60 text-[10px]">(10)</span></th>
                  <th className="py-4 px-4 text-center bg-primary/5 dark:bg-primary/10 text-primary">Total<br/><span className="opacity-60 text-[10px]">(100)</span></th>
                  <th className="py-4 pr-6 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredResults.map(r => (
                  <tr key={r.student._id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${r.warning ? "bg-rose-50/50 dark:bg-rose-900/10" : ""}`}>
                    <td className="py-4 pl-6 font-mono font-medium text-slate-600 dark:text-slate-400">{r.student.rollNumber}</td>
                    <td className="py-4 px-4 font-heading font-bold text-slate-800 dark:text-slate-200">
                      {r.student.name}
                      {r.warning && <div className="text-xs text-rose-500 font-medium mt-1">{r.warning}</div>}
                    </td>
                    <td className="py-4 px-3 text-center font-medium">{r.attendanceMark}</td>
                    <td className="py-4 px-3 text-center font-medium">{r.reportMark}</td>
                    <td className="py-4 px-3 text-center font-medium">{r.perfMark}</td>
                    <td className="py-4 px-3 text-center font-medium">{r.vivaMark}</td>
                    <td className="py-4 px-3 text-center font-medium">{r.quizMark}</td>
                    <td className="py-4 px-3 text-center font-medium">{r.testMark}</td>
                    <td className="py-4 px-3 text-center font-medium">{r.otherMark}</td>
                    <td className="py-4 px-4 text-center font-extrabold text-lg text-primary bg-primary/5 dark:bg-primary/10">{r.totalMark}</td>
                    <td className="py-4 pr-6 text-center font-extrabold text-lg text-slate-800 dark:text-white">{r.grade}</td>
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
