import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { Save, Check, X, Undo2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useLocation } from 'react-router-dom';

const Report = () => {
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [history, setHistory] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayName, setDayName] = useState('Day-1');
  const [rollGroup, setRollGroup] = useState('1-30'); 

  const location = useLocation();
  const { course, department } = location.state || {};
  const courseId = course?.courseCode || 'Unknown Course';
  const series = course?.series || 'Unknown'; 

  useEffect(() => {
    fetchData();
  }, [currentDate, rollGroup]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stuRes, recRes] = await Promise.all([
        api.get(`/teacher/students/any?department=${department || 'CSE'}&series=${series}`),
        api.get(`/teacher/records/report/${courseId}`)
      ]);
      
      let filteredStudents = stuRes.data;
      if (rollGroup === '1-30') {
        filteredStudents = filteredStudents.filter(s => {
          const last3 = parseInt(s.rollNumber.slice(-3));
          return last3 >= 1 && last3 <= 30;
        });
      } else {
        filteredStudents = filteredStudents.filter(s => {
          const last3 = parseInt(s.rollNumber.slice(-3));
          return last3 >= 31 && last3 <= 60;
        });
      }

      setStudents(filteredStudents);
      setRecords(recRes.data.filter(r => r.date.startsWith(currentDate) || r.dayName === dayName));
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getStudentStatus = (studentId) => {
    const record = records.find(r => r.student._id === studentId || r.student === studentId);
    return record ? record.status : 'Not Submitted';
  };

  const handleToggle = (studentId) => {
    const currentStatus = getStudentStatus(studentId);
    const newStatus = currentStatus === 'Submitted' ? 'Not Submitted' : 'Submitted';
    
    setHistory([...history, [...records]]);

    const newRecords = [...records];
    const existingIndex = newRecords.findIndex(r => r.student._id === studentId || r.student === studentId);
    
    if (existingIndex > -1) {
      newRecords[existingIndex].status = newStatus;
    } else {
      newRecords.push({ student: studentId, status: newStatus, dayName, date: currentDate });
    }
    setRecords(newRecords);
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const prevRecords = history[history.length - 1];
      setRecords(prevRecords);
      setHistory(history.slice(0, -1));
    }
  };

  const handleSelectAll = (status) => {
    setHistory([...history, [...records]]);
    const newRecords = students.map(s => ({
      student: s._id,
      status: status,
      dayName,
      date: currentDate
    }));
    setRecords(newRecords);
  };

  const handleSave = async () => {
    try {
      const promises = records.map(record => {
        const studentId = record.student._id || record.student;
        return api.post('/teacher/report', {
          studentId,
          courseId,
          date: currentDate,
          dayName,
          status: record.status
        });
      });
      await Promise.all(promises);
      toast.success('Reports saved successfully');
      setHistory([]); 
    } catch (err) {
      toast.error('Failed to save reports');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400">
              <FileText size={28} />
            </div>
            <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-slate-800 dark:text-white">Report Tracking</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg mt-2">Manage daily report submissions for <span className="text-emerald-500 font-bold">{courseId}</span></p>
        </div>

        {/* Group Selector */}
        <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center">
          <button 
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${rollGroup === '1-30' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            onClick={() => setRollGroup('1-30')}
          >
            Roll 01-30
          </button>
          <button 
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${rollGroup === '31-60' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            onClick={() => setRollGroup('31-60')}
          >
            Roll 31-60
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-lg overflow-hidden">
        
        {/* Action Bar */}
        <div className="p-6 md:px-8 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20 flex flex-col xl:flex-row gap-6 justify-between items-center">
          
          <div className="flex items-center gap-4 w-full xl:w-auto">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 ml-1">Class Day</label>
              <input 
                type="text" 
                className="w-32 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none text-slate-700 dark:text-slate-200 font-semibold transition-all" 
                value={dayName}
                onChange={(e) => setDayName(e.target.value)}
                placeholder="Day-1"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 ml-1">Date</label>
              <input 
                type="date" 
                className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none text-slate-700 dark:text-slate-200 font-semibold transition-all" 
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 scrollbar-hide">
             <button className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-xl font-semibold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors whitespace-nowrap" onClick={() => handleSelectAll('Submitted')}>
               Mark All Submitted
             </button>
             <button className="px-5 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 rounded-xl font-semibold text-sm hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors whitespace-nowrap" onClick={() => handleSelectAll('Not Submitted')}>
               Mark All Missing
             </button>
             <button className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50" onClick={handleUndo} disabled={history.length === 0} title="Undo">
               <Undo2 size={20} />
             </button>
             <button className="ml-auto xl:ml-2 px-6 py-2.5 bg-slate-800 dark:bg-emerald-500 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap" onClick={handleSave}>
               <Save size={18} />
               Save Records
             </button>
          </div>
        </div>
        
        {loading ? (
          <div className="p-20 flex justify-center"><div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div></div>
        ) : (
          <div className="overflow-x-auto p-6 md:p-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wider font-semibold">
                  <th className="pb-4 pl-4">Roll No.</th>
                  <th className="pb-4">Student Name</th>
                  <th className="pb-4 text-center">
                    <span className="block text-slate-800 dark:text-slate-200 mb-1">{dayName}</span>
                    <span className="text-xs opacity-70 font-medium">{format(new Date(currentDate), 'dd MMM yyyy')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {students.map((student) => {
                  const status = getStudentStatus(student._id);
                  const isSubmitted = status === 'Submitted';
                  return (
                    <tr key={student._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="py-5 pl-4 font-mono font-medium text-slate-600 dark:text-slate-400">{student.rollNumber}</td>
                      <td className="py-5 font-heading font-bold text-slate-800 dark:text-slate-200">{student.name}</td>
                      <td className="py-5 text-center">
                        <button 
                          className={`w-36 py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 transform group-hover:scale-105 shadow-sm ${
                            isSubmitted 
                              ? 'bg-emerald-500 text-white shadow-emerald-500/30' 
                              : 'bg-rose-50 dark:bg-rose-900/30 text-rose-500 shadow-none'
                          }`}
                          onClick={() => handleToggle(student._id)}
                        >
                          {isSubmitted ? 'SUBMITTED' : 'MISSING'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Report;
