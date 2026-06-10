import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { Save, Check, X, Undo2, Users, FileText, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { useLocation } from 'react-router-dom';

const Attendance = () => {
  const [students, setStudents] = useState([]);
  const [attRecords, setAttRecords] = useState([]);
  const [repRecords, setRepRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayName, setDayName] = useState('Day-1');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [rollGroup, setRollGroup] = useState('1-30');

  // Get course from location.state OR sessionStorage fallback
  const location = useLocation();
  const stateData = location.state || {};
  const course = stateData.course || JSON.parse(sessionStorage.getItem('selectedCourse') || 'null');
  const department = stateData.department || course?.department || 'ETE';
  const courseId = course?.courseCode || 'No Course Selected';
  const series = course?.series || '';

  const fetchData = useCallback(async () => {
    if (!series) { setLoading(false); return; }
    setLoading(true);
    try {
      const [stuRes, attRes, repRes] = await Promise.all([
        api.get(`/teacher/students/any?department=${department}&series=${series}`),
        api.get(`/teacher/records/attendance/${courseId}`),
        api.get(`/teacher/records/report/${courseId}`)
      ]);

      let allStudents = stuRes.data;
      let filteredStudents;
      if (rollGroup === '1-30') {
        filteredStudents = allStudents.filter(s => {
          const last3 = parseInt(s.rollNumber.slice(-3));
          return last3 >= 1 && last3 <= 30;
        });
      } else {
        filteredStudents = allStudents.filter(s => {
          const last3 = parseInt(s.rollNumber.slice(-3));
          return last3 >= 31 && last3 <= 60;
        });
      }

      setStudents(filteredStudents);

      let currentDay = dayName;
      if (isInitialLoad && attRes.data.length > 0) {
        // Find the maximum day number across all records for this course
        const dayNumbers = attRes.data
          .map(r => r.dayName)
          .filter(name => name && name.startsWith('Day-'))
          .map(name => parseInt(name.replace('Day-', ''), 10))
          .filter(n => !isNaN(n));
          
        if (dayNumbers.length > 0) {
          const maxDay = Math.max(...dayNumbers);
          currentDay = `Day-${maxDay + 1}`;
          setDayName(currentDay);
        }
        setIsInitialLoad(false);
      } else if (isInitialLoad) {
        setIsInitialLoad(false);
      }

      const dayAttRecords = attRes.data.filter(r => r.dayName === currentDay);
      const dayRepRecords = repRes.data.filter(r => r.dayName === currentDay);

      // Reconcile: if a student already has Present attendance from DB but no report
      // record, auto-initialize report as Submitted so both groups behave the same way
      const reconciledRepRecords = [...dayRepRecords];
      dayAttRecords.forEach(att => {
        if (att.status === 'Present') {
          const stuId = att.student?._id || att.student;
          const hasRep = reconciledRepRecords.some(r => (r.student?._id || r.student) === stuId);
          if (!hasRep) {
            reconciledRepRecords.push({ student: stuId, status: 'Submitted', dayName, date: currentDate });
          }
        }
      });

      setAttRecords(dayAttRecords);
      setRepRecords(reconciledRepRecords);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [currentDate, rollGroup, dayName, courseId, department, series, isInitialLoad]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const getAttStatus = (studentId) => {
    const record = attRecords.find(r => (r.student?._id || r.student) === studentId);
    return record ? record.status : null; // null = untouched/neutral
  };

  const getRepStatus = (studentId) => {
    const record = repRecords.find(r => (r.student?._id || r.student) === studentId);
    return record ? record.status : null; // null = untouched/neutral
  };

  const handleAttToggle = (studentId) => {
    const currentStatus = getAttStatus(studentId);
    // Cycle: null → Present, Present → Absent, Absent → Present
    const newStatus = currentStatus === 'Present' ? 'Absent' : 'Present';
    setHistory(h => [...h, { att: [...attRecords], rep: [...repRecords] }]);

    // Update attendance
    setAttRecords(prev => {
      const idx = prev.findIndex(r => (r.student?._id || r.student) === studentId);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], status: newStatus };
        return updated;
      }
      return [...prev, { student: studentId, status: newStatus, dayName, date: currentDate }];
    });

    // Auto-set report to Submitted on FIRST click (null→Present) or any time marked Present
    if (newStatus === 'Present') {
      setRepRecords(prev => {
        const idx = prev.findIndex(r => (r.student?._id || r.student) === studentId);
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], status: 'Submitted' };
          return updated;
        }
        return [...prev, { student: studentId, status: 'Submitted', dayName, date: currentDate }];
      });
    }
  };

  const handleRepToggle = (studentId) => {
    // Can only toggle if attendance has been set
    const currentRepStatus = getRepStatus(studentId);
    const newStatus = currentRepStatus === 'Submitted' ? 'Not Submitted' : 'Submitted';
    setHistory(h => [...h, { att: [...attRecords], rep: [...repRecords] }]);
    setRepRecords(prev => {
      const idx = prev.findIndex(r => (r.student?._id || r.student) === studentId);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], status: newStatus };
        return updated;
      }
      return [...prev, { student: studentId, status: newStatus, dayName, date: currentDate }];
    });
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setAttRecords(prev.att);
      setRepRecords(prev.rep);
      setHistory(h => h.slice(0, -1));
    }
  };

  const handleSelectAll = (status) => {
    setHistory(h => [...h, { att: [...attRecords], rep: [...repRecords] }]);
    setAttRecords(students.map(s => ({ student: s._id, status, dayName, date: currentDate })));
    // Auto-submit all reports when marking all present
    if (status === 'Present') {
      setRepRecords(students.map(s => ({ student: s._id, status: 'Submitted', dayName, date: currentDate })));
    }
  };

  const handleSave = async () => {
    try {
      const attPromises = students.map(s => {
        const studentId = s._id;
        const status = getAttStatus(studentId);
        return api.post('/teacher/attendance', { studentId, courseId, date: currentDate, dayName, status });
      });
      const repPromises = students.map(s => {
        const studentId = s._id;
        const status = getRepStatus(studentId);
        return api.post('/teacher/report', { studentId, courseId, date: currentDate, dayName, status });
      });
      await Promise.all([...attPromises, ...repPromises]);
      toast.success('Attendance & reports saved!');
      setHistory([]);
    } catch {
      toast.error('Failed to save records');
    }
  };

  if (!series) {
    return (
      <div className="max-w-6xl mx-auto pb-10">
        <div className="p-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
          <BookOpen className="mx-auto w-14 h-14 text-slate-300 mb-4" />
          <h2 className="text-2xl font-bold text-slate-700 dark:text-white mb-2">No Course Selected</h2>
          <p className="text-slate-500">Please go back to your dashboard and select a course first.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400">
              <Users size={28} />
            </div>
            <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-slate-800 dark:text-white">Lab Attendance</h1>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium text-lg">Course:</span>
            <span className="px-4 py-1 bg-primary/10 text-primary font-extrabold rounded-lg text-lg tracking-wide">{courseId}</span>
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-lg text-sm">Series {series} &bull; {department}</span>
          </div>
        </div>

        {/* Group Selector */}
        <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1">
          <button 
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${rollGroup === '1-30' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            onClick={() => setRollGroup('1-30')}
          >
            Roll 01-30
          </button>
          <button 
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${rollGroup === '31-60' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
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
          
          <div className="flex items-center gap-4 w-full xl:w-auto flex-wrap">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 ml-1">Class Day</label>
              <input 
                type="text" 
                className="w-32 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 dark:text-slate-200 font-semibold transition-all" 
                value={dayName}
                onChange={(e) => setDayName(e.target.value)}
                placeholder="Day-1"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 ml-1">Date</label>
              <input 
                type="date" 
                className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 dark:text-slate-200 font-semibold transition-all" 
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 scrollbar-hide">
             <button className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-xl font-semibold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors whitespace-nowrap" onClick={() => handleSelectAll('Present')}>
               Mark All Present
             </button>
             <button className="px-5 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 rounded-xl font-semibold text-sm hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors whitespace-nowrap" onClick={() => handleSelectAll('Absent')}>
               Mark All Absent
             </button>
             <button className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50" onClick={handleUndo} disabled={history.length === 0} title="Undo">
               <Undo2 size={20} />
             </button>
             <button className="ml-auto xl:ml-2 px-6 py-2.5 bg-slate-800 dark:bg-primary text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap" onClick={handleSave}>
               <Save size={18} />
               Save All
             </button>
          </div>
        </div>

        
        {loading ? (
          <div className="p-20 flex justify-center"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>
        ) : students.length === 0 ? (
          <div className="p-16 text-center text-slate-500 dark:text-slate-400">
            <Users className="mx-auto w-12 h-12 mb-3 opacity-30" />
            <p className="font-semibold">No students found for this group.</p>
          </div>
        ) : (
          <div className="overflow-x-auto p-6 md:p-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wider font-semibold">
                  <th className="pb-4 pl-4 w-28">Roll No.</th>
                  <th className="pb-4">Student Name</th>
                  <th className="pb-4 text-center">
                    <span className="block text-slate-800 dark:text-slate-200 mb-1">Attendance & Report</span>
                    <span className="text-xs opacity-70 font-medium">{dayName} &bull; {format(new Date(currentDate + 'T00:00:00'), 'dd MMM yyyy')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {students.map((student) => {
                  const attStatus = getAttStatus(student._id);
                  const repStatus = getRepStatus(student._id);
                  const isPresent = attStatus === 'Present';
                  const isSubmitted = repStatus === 'Submitted';
                  const attIsSet = attStatus !== null;
                  return (
                    <tr key={student._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="py-4 pl-4 font-mono font-semibold text-slate-600 dark:text-slate-400">{student.rollNumber}</td>
                      <td className="py-4 font-heading font-bold text-slate-800 dark:text-slate-200">{student.name}</td>
                      <td className="py-4 pr-6">
                        <div className="flex items-center justify-center gap-3">

                          {/* Attendance Toggle — neutral gray until clicked */}
                          <button 
                            title={isPresent ? 'Mark Absent' : 'Mark Present'}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                              !attIsSet
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-600'
                                : isPresent 
                                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' 
                                  : 'bg-rose-100 dark:bg-rose-900/30 text-rose-500'
                            }`}
                            onClick={() => handleAttToggle(student._id)}
                          >
                            {!attIsSet 
                              ? <span className="text-lg font-bold opacity-40">—</span>
                              : isPresent 
                                ? <Check size={22} strokeWidth={3} /> 
                                : <X size={22} strokeWidth={2.5} />}
                          </button>

                          {/* Separator */}
                          <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>

                          {/* Report Pill — neutral until attendance clicked, then auto-green */}
                          <button 
                            title="Click to toggle Report submission"
                            disabled={!attIsSet}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs tracking-wide transition-all duration-200 ${
                              !attIsSet
                                ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-300 dark:text-slate-600 border border-dashed border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                : isSubmitted
                                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 cursor-pointer'
                                  : 'bg-rose-50 dark:bg-rose-900/20 text-rose-500 border border-rose-200 dark:border-rose-800 cursor-pointer'
                            }`}
                            onClick={() => attIsSet && handleRepToggle(student._id)}
                          >
                            <FileText size={12} />
                            {!attIsSet ? 'Report' : isSubmitted ? 'Report ✓' : 'Report ✗'}
                          </button>

                        </div>
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

export default Attendance;
