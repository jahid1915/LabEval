import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  BookOpen, Download, Search, RefreshCw, ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api/axios';
import RuetLogo from '../../components/RuetLogo';

export default function TeacherElectivesPage() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load course student roster (populated automatically from FinalEnrollment)
  const loadCourseRoster = useCallback(async (course) => {
    setSelectedCourse(course);
    setRosterLoading(true);
    try {
      const res = await api.get(`/electives/teacher/${course._id}/students`);
      if (res.data.success) {
        setRoster(res.data.data.students || []);
      }
    } catch {
      // Fallback to teacher/courses/:id/students
      try {
        const fRes = await api.get(`/teacher/courses/${course._id}/students`);
        setRoster(fRes.data?.data?.students || fRes.data?.students || []);
      } catch {
        toast.error('Failed to load course student roster');
      }
    } finally {
      setRosterLoading(false);
    }
  }, []);

  // Load teacher assigned elective courses
  const loadAssignedElectives = useCallback(async () => {
    setLoading(true);
    try {
      // First try the teacher electives endpoint
      const res = await api.get('/electives/teacher/my-electives');
      if (res.data.success) {
        const { assignments = [], offerings = [] } = res.data.data || {};
        // Pull unique courses
        const courseMap = new Map();
        assignments.forEach(a => {
          if (a.courseId && (a.courseId.isElective || a.isElective)) {
            courseMap.set(a.courseId._id, a.courseId);
          }
        });

        // Also check if any offerings contain courses assigned to teacher
        offerings.forEach(off => {
          off.availableCourses?.forEach(c => {
            courseMap.set(c._id, c);
          });
        });

        const list = Array.from(courseMap.values());
        setCourses(list);
        if (list.length > 0 && !selectedCourse) {
          loadCourseRoster(list[0]);
        }
      }
    } catch {
      // Fallback: check regular teacher courses
      try {
        const cRes = await api.get('/teacher/courses');
        const cList = (cRes.data?.data || cRes.data || []).filter(c => c.isElective || c.courseType === 'ELECTIVE');
        setCourses(cList);
        if (cList.length > 0) {
          loadCourseRoster(cList[0]);
        }
      } catch {
        toast.error('Failed to load assigned elective courses');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, loadCourseRoster]);

  useEffect(() => {
    loadAssignedElectives();
  }, [loadAssignedElectives]);

  // Export Roster to Excel (Requirement 56)
  const handleExportRoster = () => {
    if (!selectedCourse || roster.length === 0) {
      toast.info('No students to export.');
      return;
    }
    const wb = XLSX.utils.book_new();
    const rows = [
      ['Course Code', 'Course Name', 'Roll Number', 'Student Name', 'Email', 'Series', 'Semester', 'Department', 'Status'],
      ...roster.map(s => [
        selectedCourse.courseCode,
        selectedCourse.courseName,
        s.rollNumber,
        s.name,
        s.email,
        s.series,
        s.semester,
        s.department,
        s.regularStatus || 'Regular'
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 25 },
      { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Roster');
    XLSX.writeFile(wb, `Roster_${selectedCourse.courseCode}_${selectedCourse.courseName}.xlsx`);
    toast.success('Downloaded course student roster');
  };

  // Filtered Roster
  const filteredRoster = roster.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <RuetLogo size={52} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-heading font-black text-slate-900 dark:text-white">
                Assigned Elective Courses & Rosters
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                Teacher Panel
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Course rosters are automatically populated from approved student elective allocations without manual entry.
            </p>
          </div>
        </div>

        <button
          onClick={loadAssignedElectives}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Rosters
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <RefreshCw size={36} className="text-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500 font-semibold">Loading assigned elective courses…</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm space-y-3">
          <BookOpen size={48} className="mx-auto text-slate-300 dark:text-slate-700" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">No Assigned Elective Courses</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You do not currently have any elective courses assigned for this semester. Contact your department administrator if you are offering an elective course.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Assigned Electives List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              My Elective Courses ({courses.length})
            </h3>

            <div className="space-y-2">
              {courses.map(course => {
                const isSelected = selectedCourse?._id === course._id;
                return (
                  <button
                    key={course._id}
                    onClick={() => loadCourseRoster(course)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                        {course.courseCode}
                      </span>
                      <ChevronRight size={14} className={isSelected ? 'text-indigo-600' : 'text-slate-400'} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2">
                      {course.courseName}
                    </h4>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {course.department} · Semester {course.semester}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Automatic Course Student Roster */}
          <div className="lg:col-span-3">
            {selectedCourse ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
                {/* Roster Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-indigo-600">
                        {selectedCourse.courseCode}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 font-bold">
                        Automatic Enrollment Roster
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                      {selectedCourse.courseName}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedCourse.department} · Semester {selectedCourse.semester} · Total Students: <strong className="text-slate-800 dark:text-white">{roster.length}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportRoster}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 transition-colors"
                    >
                      <Download size={14} /> Export Excel
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="flex items-center justify-between gap-4">
                  <div className="relative w-72">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search student roll, name, email..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    Showing {filteredRoster.length} of {roster.length} students
                  </span>
                </div>

                {/* Student Roster Table */}
                {rosterLoading ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Loading student roster…
                  </div>
                ) : filteredRoster.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs italic">
                    No students currently enrolled in this elective course. Once Admin approves allocations, students will automatically appear here.
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/75 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-bold">#</th>
                          <th className="px-4 py-3 font-bold">Roll Number</th>
                          <th className="px-4 py-3 font-bold">Student Name</th>
                          <th className="px-4 py-3 font-bold">Email</th>
                          <th className="px-4 py-3 font-bold">Series</th>
                          <th className="px-4 py-3 font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredRoster.map((st, idx) => (
                          <tr key={st._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="px-4 py-2.5 font-mono font-bold text-slate-900 dark:text-white">{st.rollNumber}</td>
                            <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium">{st.name}</td>
                            <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{st.email || '—'}</td>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{st.series || '—'}</td>
                            <td className="px-4 py-2.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                                {st.regularStatus || 'Regular'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 text-xs">
                Select an elective course on the left to view its official student roster.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
