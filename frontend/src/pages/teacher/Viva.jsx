import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { Save, Mic, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const Viva = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [vivaRecords, setVivaRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [rollGroup, setRollGroup] = useState('1-30');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInput, setBulkInput] = useState('');

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
      const [stuRes, vivaRes] = await Promise.all([
        api.get(`/teacher/students/any?department=${department}&series=${series}`),
        api.get(`/teacher/records/viva/${courseId}`)
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
      setVivaRecords(vivaRes.data);
    } catch (err) {
      console.error("Error fetching Viva data:", err);
      toast.error('Failed to load data: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, [rollGroup, courseId, department, series]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleMarkChange = (studentId, value) => {
    if (value === '') {
      setVivaRecords(prev => prev.filter(r => (r.student?._id || r.student) !== studentId));
      return;
    }

    let numVal = parseFloat(value);
    if (!isNaN(numVal) && numVal > 25) {
      value = '25';
    }

    setVivaRecords(prev => {
      const existingIdx = prev.findIndex(r => (r.student?._id || r.student) === studentId);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], marks: value };
        return updated;
      } else {
        return [...prev, { student: studentId, marks: value, date: currentDate }];
      }
    });
  };

  const getStudentMark = (studentId) => {
    const record = vivaRecords.find(r => (r.student?._id || r.student) === studentId);
    return record && record.marks !== undefined ? record.marks : '';
  };

  const saveAll = async () => {
    // Validate marks before saving
    let hasError = false;
    students.forEach(student => {
      const marks = getStudentMark(student._id);
      if (marks !== '') {
        const numVal = parseFloat(marks);
        if (isNaN(numVal) || numVal < 13 || numVal > 25) {
          hasError = true;
        }
      }
    });

    if (hasError) {
      toast.error('All Board Viva marks must be in the range of 13 to 25!');
      return;
    }

    setSaving(true);
    try {
      const promises = students.map(student => {
        const marks = getStudentMark(student._id);
        if (marks !== '') {
          return api.post('/teacher/viva', {
            studentId: student._id,
            courseId,
            date: currentDate,
            marks: parseFloat(marks)
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      toast.success('Viva marks saved successfully!');
    } catch (err) {
      console.error("Error saving Board Viva marks:", err);
      toast.error('Failed to save viva marks');
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = () => {
    const dataToExport = filteredStudents.map(student => {
      const mark = getStudentMark(student._id);
      return {
        'Roll Number': student.rollNumber,
        'Name': student.name,
        'Board Viva Marks': mark === '' ? 'N/A' : parseFloat(mark)
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Board Viva Marks");
    XLSX.writeFile(workbook, `Board_Viva_Marks_${courseId}.xlsx`);
    toast.success('Excel file exported successfully!');
  };

  const handleBulkImport = () => {
    if (!bulkInput.trim()) {
      toast.warn('Please enter some scores first!');
      return;
    }

    const rows = bulkInput.split('\n');
    let importedCount = 0;
    const updatedRecords = [...vivaRecords];

    rows.forEach(row => {
      if (!row.trim()) return;
      const parts = row.split(/[\t,; ]+/);
      if (parts.length >= 2) {
        const roll = parts[0].trim();
        const markVal = parseFloat(parts[1].trim());

        if (roll && !isNaN(markVal)) {
          const student = students.find(s => s.rollNumber === roll);
          if (student) {
            const marks = Math.min(25, Math.max(13, markVal));
            const existingIdx = updatedRecords.findIndex(r => (r.student?._id || r.student) === student._id);
            if (existingIdx > -1) {
              updatedRecords[existingIdx] = { ...updatedRecords[existingIdx], marks };
            } else {
              updatedRecords.push({ student: student._id, marks, date: currentDate });
            }
            importedCount++;
          }
        }
      }
    });

    setVivaRecords(updatedRecords);
    setShowBulkModal(false);
    setBulkInput('');
    toast.success(`Loaded ${importedCount} viva marks from input! Remember to click Save All to commit.`);
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
            <h1 className="text-3xl font-heading font-extrabold text-slate-800 dark:text-white">Board Viva Marks</h1>
            <span className="px-3 py-1 bg-primary/10 text-primary font-bold rounded-lg text-sm">{courseId}</span>
          </div>
          <p className="text-slate-500 mt-2">Manage and record Board Viva evaluations (13-25 marks)</p>
        </div>

        {/* Configurations panel */}
        <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">VIVA DATE</label>
            <input 
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold outline-none focus:ring-1 focus:ring-primary"
            />
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
            <Mic className="text-slate-400" />
            <h3 className="font-heading font-bold text-lg text-slate-700 dark:text-white">Viva Marks Sheet ({rollGroup})</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <input 
              type="text"
              placeholder="Search roll or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-52 px-4 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <button 
              onClick={() => setShowBulkModal(true)}
              className="btn btn-outline btn-md font-bold rounded-xl border-slate-200 hover:bg-slate-100 flex items-center gap-2"
            >
              <FileSpreadsheet size={16} />
              Excel Copy-Paste
            </button>
            <button 
              onClick={exportExcel}
              className="btn btn-outline btn-md font-bold rounded-xl border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-400 flex items-center gap-2"
            >
              <FileSpreadsheet size={16} className="text-emerald-500" />
              Export Excel
            </button>
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
            <Mic className="mx-auto w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold">No Students Found</h3>
            <p className="text-sm text-slate-400 mt-1">Check that you have students in department: {department} and series: {series}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full text-slate-700 dark:text-slate-300">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-700 text-slate-600 dark:text-slate-200">
                  <th className="font-bold">Roll Number</th>
                  <th className="font-bold">Name</th>
                  <th className="font-bold text-center">Viva Marks (13-25)</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const studentMark = getStudentMark(student._id);
                  return (
                    <tr key={student._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                      <td className="font-bold font-mono text-slate-800 dark:text-slate-100">{student.rollNumber}</td>
                      <td className="font-semibold text-slate-700 dark:text-slate-300">{student.name}</td>
                      <td className="py-2 text-center">
                        <div className="flex items-center justify-center">
                          <input 
                            type="number"
                            min="13"
                            max="25"
                            step="0.5"
                            placeholder="N/A"
                            value={studentMark}
                            onChange={(e) => handleMarkChange(student._id, e.target.value)}
                            className={`w-24 px-4 py-2 border rounded-xl text-center font-bold outline-none focus:ring-2 transition-all ${
                              studentMark !== '' && (parseFloat(studentMark) < 13 || parseFloat(studentMark) > 25)
                                ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/20 text-rose-600 focus:ring-rose-500/30'
                                : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-primary/30'
                            }`}
                          />
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

      {/* Excel/CSV Copy-Paste Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="font-heading font-bold text-2xl text-slate-800 dark:text-white mb-2">Excel Import Utility</h3>
            <p className="text-slate-500 text-sm mb-6">
              Copy rows from Excel containing the <strong>Roll Number</strong> and <strong>Marks</strong>, then paste them below. Formats supported: tab-separated, comma-separated, space-separated.
              <br/><br/>
              <strong>Example:</strong>
              <pre className="mt-2 bg-slate-50 dark:bg-slate-700 p-2 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-300">
                2204001   22.5<br/>
                2204002   18.0
              </pre>
            </p>
            <textarea 
              rows="6"
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder="Paste data here..."
              className="w-full p-4 border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-white font-mono resize-none mb-6"
            ></textarea>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setShowBulkModal(false); setBulkInput(''); }}
                className="btn btn-ghost hover:bg-slate-100 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkImport}
                className="btn btn-primary rounded-xl font-bold shadow-lg shadow-primary/25"
              >
                Parse & Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Viva;
