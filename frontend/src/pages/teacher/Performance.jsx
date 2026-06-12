import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { Save, Users, Activity, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const Performance = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [perfRecords, setPerfRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({ performance: 5, quiz: 30, report: 10, attendance: 5, test: 20, others: 5 });
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayName, setDayName] = useState('Day-1');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [rollGroup, setRollGroup] = useState('1-30');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      const [stuRes, perfRes, configRes] = await Promise.all([
        api.get(`/teacher/students/any?department=${department}&series=${series}`),
        api.get(`/teacher/records/performance/${courseId}`),
        course?._id ? api.get(`/teacher/courses/${course._id}/config`) : Promise.resolve({ data: null })
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
      if (isInitialLoad && perfRes.data.length > 0) {
        const dayNumbers = perfRes.data
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

      const dayPerfRecords = perfRes.data.filter(r => r.dayName === currentDay);
      setPerfRecords(dayPerfRecords);
      if (configRes?.data?.config) {
        setConfig(configRes.data.config);
      }
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [rollGroup, dayName, courseId, department, series, isInitialLoad]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleMarksSelect = (studentId, marks) => {
    setPerfRecords(prev => {
      const existingIdx = prev.findIndex(r => (r.student?._id || r.student) === studentId);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], marks };
        return updated;
      } else {
        return [...prev, { student: studentId, marks, dayName, date: currentDate }];
      }
    });
  };

  const getStudentMarks = (studentId) => {
    const record = perfRecords.find(r => (r.student?._id || r.student) === studentId);
    return record ? record.marks : 0;
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const promises = students.map(student => {
        const marks = getStudentMarks(student._id);
        if (marks > 0) {
          return api.post('/teacher/performance', {
            studentId: student._id,
            courseId,
            date: currentDate,
            dayName,
            marks
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      toast.success('Performance marks saved successfully!');
    } catch {
      toast.error('Failed to save performance marks');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.rollNumber.includes(searchQuery)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <button 
            onClick={() => navigate('/teacher')}
            className="flex items-center gap-2 text-slate-500 hover:text-primary font-semibold mb-4 transition-colors"
          >
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-heading font-extrabold text-slate-800 dark:text-white">Daily Lab Performance</h1>
            <span className="px-3 py-1 bg-primary/10 text-primary font-bold rounded-lg text-sm">{courseId}</span>
          </div>
          <p className="text-slate-500 mt-2">continuous lab evaluation and daily class skills tracker</p>
        </div>

        {/* Date and Day selectors */}
        <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">DATE</label>
            <input 
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">DAY NUMBER</label>
            <select
              value={dayName}
              onChange={(e) => setDayName(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold outline-none focus:ring-1 focus:ring-primary"
            >
              {[...Array(15)].map((_, i) => (
                <option key={i} value={`Day-${i+1}`}>{`Day-${i+1}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">ROLL GROUP</label>
            <div className="flex p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <button 
                onClick={() => setRollGroup('1-30')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${rollGroup === '1-30' ? 'bg-white dark:bg-slate-600 text-primary shadow-sm' : 'text-slate-500'}`}
              >
                1-30
              </button>
              <button 
                onClick={() => setRollGroup('31-60')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${rollGroup === '31-60' ? 'bg-white dark:bg-slate-600 text-primary shadow-sm' : 'text-slate-500'}`}
              >
                31-60
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users className="text-slate-400" />
            <h3 className="font-heading font-bold text-lg text-slate-700 dark:text-white">Student Marks Roll Sheet ({rollGroup})</h3>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input 
              type="text"
              placeholder="Search roll or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-60 px-4 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <button 
              onClick={saveAll}
              disabled={saving}
              className="btn btn-primary btn-md font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              {saving ? <span className="loading loading-spinner loading-sm"></span> : <Save size={16} />}
              Save All
            </button>
          </div>
        </div>

        {/* Evaluation Table */}
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <span className="loading loading-spinner text-primary loading-lg mb-4"></span>
            <p className="text-slate-500 font-medium">Fetching students list...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Activity className="mx-auto w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold">No Students Found</h3>
            <p className="text-sm text-slate-400 mt-1">Make sure you have seeded student records for department: {department} and series: {series}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full text-slate-700 dark:text-slate-300">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-700 text-slate-600 dark:text-slate-200">
                  <th className="font-bold">Roll Number</th>
                  <th className="font-bold">Name</th>
                  <th className="font-bold text-center">Continuous Performance Evaluation Marks</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const studentMarks = getStudentMarks(student._id);
                  return (
                    <tr key={student._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                      <td className="font-bold font-mono text-slate-800 dark:text-slate-100">{student.rollNumber}</td>
                      <td className="font-semibold text-slate-700 dark:text-slate-300">{student.name}</td>
                      <td className="py-4">
                        <div className="flex items-center justify-center gap-3">
                          {Array.from({ length: Math.max(1, Math.floor(config.performance || 5)) }, (_, i) => i + 1).map((val) => {
                            const isSelected = studentMarks === val;
                            return (
                              <button
                                key={val}
                                onClick={() => handleMarksSelect(student._id, val)}
                                className={`w-10 h-10 rounded-full font-bold border transition-all duration-200 flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-md scale-110 shadow-emerald-500/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 hover:border-emerald-400 hover:text-emerald-500'}`}
                              >
                                {val}
                              </button>
                            );
                          })}
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
    </div>
  );
};

export default Performance;
