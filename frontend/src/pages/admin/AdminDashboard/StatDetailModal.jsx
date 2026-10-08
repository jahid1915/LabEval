import React from 'react';
import {
  BookOpen, Users, CheckCircle, Clock, GraduationCap, ClipboardList,
  X, Search, Mail, Phone, Edit, Eye, AlertTriangle, UserPlus, RefreshCw
} from 'lucide-react';

export default function StatDetailModal({
  activeStatModal,
  setActiveStatModal,
  statModalSearch,
  setStatModalSearch,
  statModalFilter,
  setStatModalFilter,
  courses,
  teachers,
  students,
  stats,
  requestsList,
  loadingRequests,
  loadingStudentsStat,
  deptCode,
  assignedCoursesCount,
  unassignedCoursesCount,
  setAssignModalCourse,
  setViewSyllabusCourse,
  handleViewTeacherProfile,
  setEditTeacher,
  handleRevokeAssignment,
  setEditStudent,
  selectedRequestDetail,
  setSelectedRequestDetail,
}) {
  return (
    <>
      {/* ────────────────── STAT CARDS DETAIL POPUP MODAL ────────────────── */}
      {activeStatModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full shadow-2xl flex flex-col max-h-[88vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            
            {/* ── Modal Header ── */}
            <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`p-2.5 rounded-xl border shadow-sm ${
                  activeStatModal === 'courses' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60' :
                  activeStatModal === 'teachers' ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-900/60' :
                  activeStatModal === 'assigned' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60' :
                  activeStatModal === 'unassigned' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60' :
                  activeStatModal === 'students' ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900/60' :
                  'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60'
                }`}>
                  {activeStatModal === 'courses' && <BookOpen size={20} />}
                  {activeStatModal === 'teachers' && <Users size={20} />}
                  {activeStatModal === 'assigned' && <CheckCircle size={20} />}
                  {activeStatModal === 'unassigned' && <Clock size={20} />}
                  {activeStatModal === 'students' && <GraduationCap size={20} />}
                  {activeStatModal === 'requests' && <ClipboardList size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                      {activeStatModal === 'courses' && 'Total Courses Catalog'}
                      {activeStatModal === 'teachers' && 'Faculty Members Roster'}
                      {activeStatModal === 'assigned' && 'Assigned Courses Directory'}
                      {activeStatModal === 'unassigned' && 'Unassigned Courses (Pending Allocation)'}
                      {activeStatModal === 'students' && 'Enrolled Students Roster'}
                      {activeStatModal === 'requests' && 'Student Mark Review & Evaluation Requests'}
                    </h3>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {activeStatModal === 'courses' && `${courses.length} Courses`}
                      {activeStatModal === 'teachers' && `${teachers.length} Faculty`}
                      {activeStatModal === 'assigned' && `${assignedCoursesCount} Allocated`}
                      {activeStatModal === 'unassigned' && `${unassignedCoursesCount} Pending`}
                      {activeStatModal === 'students' && `${stats?.totalStudents || students.length} Students`}
                      {activeStatModal === 'requests' && `${requestsList.length} Requests`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {deptCode} Department &bull; Rajshahi University of Engineering & Technology
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setActiveStatModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                title="Close Window (Esc)">
                <X size={18} />
              </button>
            </div>

            {/* ── Modal Filter & Search Toolbar ── */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#0f172a] flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={
                    activeStatModal === 'courses' ? "Search by course code or title..." :
                    activeStatModal === 'teachers' ? "Search by teacher name, ID, or email..." :
                    activeStatModal === 'assigned' ? "Search by course code or faculty name..." :
                    activeStatModal === 'unassigned' ? "Search unassigned courses..." :
                    activeStatModal === 'students' ? "Search by roll number, name, or series..." :
                    "Search by student roll, course, or teacher..."
                  }
                  value={statModalSearch}
                  onChange={(e) => setStatModalSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                {statModalSearch && (
                  <button onClick={() => setStatModalSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Sub-Filters per Modal Type */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {activeStatModal === 'courses' && (
                  <>
                    {['all', 'assigned', 'unassigned', 'theory', 'sessional'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setStatModalFilter(f)}
                        className={`px-3 py-1.5 rounded-lg font-semibold uppercase text-[10px] tracking-wider transition-all ${
                          statModalFilter === f
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}>
                        {f}
                      </button>
                    ))}
                  </>
                )}

                {activeStatModal === 'teachers' && (
                  <>
                    {[
                      { key: 'all', label: `All (${teachers.length})` },
                      { key: 'on_duty', label: `On Duty (${teachers.filter(t => t.dutyStatus !== 'ON_LEAVE').length})` },
                      { key: 'on_leave', label: `On Leave (${teachers.filter(t => t.dutyStatus === 'ON_LEAVE').length})` }
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setStatModalFilter(f.key)}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-[11px] transition-all ${
                          statModalFilter === f.key
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}>
                        {f.label}
                      </button>
                    ))}
                  </>
                )}

                {activeStatModal === 'unassigned' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Semester:</span>
                    <select
                      value={statModalFilter}
                      onChange={(e) => setStatModalFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200">
                      <option value="all">All Semesters</option>
                      {['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'].map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>
                )}

                {activeStatModal === 'students' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Series Batch:</span>
                    <select
                      value={statModalFilter}
                      onChange={(e) => setStatModalFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200">
                      <option value="all">All Batches</option>
                      {['25', '24', '23', '22', '21', '20', '19', '18'].map(s => (
                        <option key={s} value={s}>Series '{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                {activeStatModal === 'requests' && (
                  <>
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'pending', label: 'Pending' },
                      { key: 'accepted', label: 'Accepted' },
                      { key: 'rejected', label: 'Rejected' }
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setStatModalFilter(f.key)}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-[11px] transition-all ${
                          statModalFilter === f.key
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}>
                        {f.label}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* ── Modal Scrollable Content Area ── */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              
              {/* 1. COURSES VIEW */}
              {activeStatModal === 'courses' && (() => {
                const filtered = courses.filter(c => {
                  const s = statModalSearch.toLowerCase();
                  const matchesSearch = !s ||
                    c.courseCode?.toLowerCase().includes(s) ||
                    c.courseName?.toLowerCase().includes(s);
                  const isSessional = (c.type || '').toLowerCase().includes('sessional');
                  const matchesFilter = statModalFilter === 'all' ||
                    (statModalFilter === 'assigned' && c.isAssigned) ||
                    (statModalFilter === 'unassigned' && !c.isAssigned) ||
                    (statModalFilter === 'theory' && !isSessional) ||
                    (statModalFilter === 'sessional' && isSessional);
                  return matchesSearch && matchesFilter;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400">
                      <BookOpen size={36} className="mx-auto mb-2 opacity-40 text-blue-500" />
                      <p className="text-sm font-semibold">No courses match your search or filter</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                          <th className="py-3 px-4">Course Code & Name</th>
                          <th className="py-3 px-3">Type & Credit</th>
                          <th className="py-3 px-3">Semester</th>
                          <th className="py-3 px-4">Assigned Instructor</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-[#111c38]">
                        {filtered.map(c => (
                          <tr key={c._id || c.courseCode} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded text-[11px] mr-2">
                                {c.courseCode}
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-white">{c.courseName}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mr-1.5 ${
                                (c.type || '').toLowerCase().includes('sessional')
                                  ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
                                  : 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                              }`}>
                                {c.type || 'Theory'}
                              </span>
                              <span className="text-slate-500 font-medium">{c.credit || c.credits || 1.5} Cr</span>
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                              Sem {c.semesterLevel || c.semester || '—'}
                            </td>
                            <td className="py-3 px-4">
                              {c.isAssigned ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                  <div>
                                    <p className="font-bold text-slate-900 dark:text-white text-xs">
                                      {c.assignedTeacher?.name || c.assignment?.teacherName || 'Assigned'}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                      ID: {c.assignedTeacher?.teacherId || c.assignment?.teacherId || '—'}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                  <Clock size={10} /> Pending Assignment
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => { setActiveStatModal(null); setAssignModalCourse(c); }}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] shadow-sm transition-all"
                                  title={c.isAssigned ? "Change assigned instructor" : "Assign teacher to course"}>
                                  {c.isAssigned ? 'Reassign' : '+ Assign'}
                                </button>
                                <button
                                  onClick={() => { setActiveStatModal(null); setViewSyllabusCourse(c); }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  title="View Course Syllabus">
                                  <Eye size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* 2. FACULTY MEMBERS VIEW */}
              {activeStatModal === 'teachers' && (() => {
                const filtered = teachers.filter(t => {
                  const s = statModalSearch.toLowerCase();
                  const matchesSearch = !s ||
                    t.name?.toLowerCase().includes(s) ||
                    t.teacherId?.toLowerCase().includes(s) ||
                    t.email?.toLowerCase().includes(s) ||
                    t.designation?.toLowerCase().includes(s);
                  const matchesFilter = statModalFilter === 'all' ||
                    (statModalFilter === 'on_duty' && t.dutyStatus !== 'ON_LEAVE') ||
                    (statModalFilter === 'on_leave' && t.dutyStatus === 'ON_LEAVE');
                  return matchesSearch && matchesFilter;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400">
                      <Users size={36} className="mx-auto mb-2 opacity-40 text-violet-500" />
                      <p className="text-sm font-semibold">No faculty members found</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                          <th className="py-3 px-4">Faculty Member</th>
                          <th className="py-3 px-3">Designation & Dept</th>
                          <th className="py-3 px-3">Contact Details</th>
                          <th className="py-3 px-3">Duty Status</th>
                          <th className="py-3 px-3">Courses</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-[#111c38]">
                        {filtered.map(t => {
                          const assignedForThisTeacher = courses.filter(
                            c => c.assignedTeacher?._id === t._id || c.assignment?.teacherId === t.teacherId
                          ).length;

                          return (
                            <tr key={t._id || t.teacherId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold flex items-center justify-center text-xs">
                                    {t.name ? t.name.charAt(0).toUpperCase() : 'T'}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 dark:text-white">{t.name}</p>
                                    <p className="font-mono text-[10px] text-slate-400">ID: {t.teacherId}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <p className="font-medium text-slate-800 dark:text-slate-200">{t.designation || 'Faculty'}</p>
                                <p className="text-[10px] text-slate-400">{t.department || deptCode}</p>
                              </td>
                              <td className="py-3 px-3">
                                <p className="text-slate-600 dark:text-slate-300 flex items-center gap-1 font-mono text-[11px]">
                                  <Mail size={11} className="text-slate-400" /> {t.email || '—'}
                                </p>
                                {t.contactNo && (
                                  <p className="text-slate-400 text-[10px] flex items-center gap-1 mt-0.5">
                                    <Phone size={10} /> {t.contactNo}
                                  </p>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                {t.dutyStatus === 'ON_LEAVE' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    <Clock size={10} /> On Leave
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    <CheckCircle size={10} /> On Duty
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-bold text-slate-800 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px]">
                                  {assignedForThisTeacher} Courses
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => { setActiveStatModal(null); handleViewTeacherProfile(t); }}
                                    className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-[11px] shadow-sm">
                                    Profile
                                  </button>
                                  <button
                                    onClick={() => { setActiveStatModal(null); setEditTeacher(t); }}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    title="Edit Faculty Details">
                                    <Edit size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* 3. ASSIGNED COURSES VIEW */}
              {activeStatModal === 'assigned' && (() => {
                const assignedList = courses.filter(c => c.isAssigned);
                const filtered = assignedList.filter(c => {
                  const s = statModalSearch.toLowerCase();
                  const teacherName = c.assignedTeacher?.name || c.assignment?.teacherName || '';
                  return !s ||
                    c.courseCode?.toLowerCase().includes(s) ||
                    c.courseName?.toLowerCase().includes(s) ||
                    teacherName.toLowerCase().includes(s);
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400">
                      <CheckCircle size={36} className="mx-auto mb-2 opacity-40 text-emerald-500" />
                      <p className="text-sm font-semibold">No assigned courses found</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                          <th className="py-3 px-4">Assigned Course</th>
                          <th className="py-3 px-3">Type & Credit</th>
                          <th className="py-3 px-4">Designated Faculty</th>
                          <th className="py-3 px-3">Session & Sem</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-[#111c38]">
                        {filtered.map(c => (
                          <tr key={c._id || c.courseCode} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-[11px] mr-2">
                                {c.courseCode}
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-white">{c.courseName}</span>
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-300">
                              {c.type || 'Theory'} &bull; {c.credit || c.credits || 1.5} Cr
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-900 dark:text-white">
                                {c.assignedTeacher?.name || c.assignment?.teacherName}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                ID: {c.assignedTeacher?.teacherId || c.assignment?.teacherId || '—'}
                              </p>
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                              {c.assignment?.academicSession || '2024-2025'} &bull; Sem {c.assignment?.semester || c.semesterLevel || '3-2'}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => { setActiveStatModal(null); setAssignModalCourse(c); }}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px]">
                                  Reassign
                                </button>
                                <button
                                  onClick={() => handleRevokeAssignment(c)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-semibold text-[11px]"
                                  title="Revoke Teacher Assignment">
                                  Revoke
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* 4. UNASSIGNED COURSES VIEW */}
              {activeStatModal === 'unassigned' && (() => {
                const unassignedList = courses.filter(c => !c.isAssigned);
                const filtered = unassignedList.filter(c => {
                  const s = statModalSearch.toLowerCase();
                  const matchesSearch = !s ||
                    c.courseCode?.toLowerCase().includes(s) ||
                    c.courseName?.toLowerCase().includes(s);
                  const matchesSemester = statModalFilter === 'all' ||
                    (c.semesterLevel === statModalFilter || c.semester === statModalFilter);
                  return matchesSearch && matchesSemester;
                });

                return (
                  <div className="space-y-3.5">
                    {/* Notice alert */}
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                      <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                      <div>
                        <h4 className="font-bold text-amber-900 dark:text-amber-200 text-xs">Faculty Assignment Required</h4>
                        <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                          Unassigned courses cannot receive student evaluation marks or attendance recording. Click <b>+ Assign Faculty</b> to allocate a teacher directly.
                        </p>
                      </div>
                    </div>

                    {filtered.length === 0 ? (
                      <div className="py-12 text-center text-slate-400">
                        <CheckCircle size={36} className="mx-auto mb-2 opacity-40 text-emerald-500" />
                        <p className="text-sm font-semibold">All courses in this selection have been assigned!</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                              <th className="py-3 px-4">Course Code & Name</th>
                              <th className="py-3 px-3">Type & Credit</th>
                              <th className="py-3 px-3">Curriculum Semester</th>
                              <th className="py-3 px-3">Status</th>
                              <th className="py-3 px-4 text-right">Quick Allocation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-[#111c38]">
                            {filtered.map(c => (
                              <tr key={c._id || c.courseCode} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="py-3 px-4">
                                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded text-[11px] mr-2">
                                    {c.courseCode}
                                  </span>
                                  <span className="font-semibold text-slate-900 dark:text-white">{c.courseName}</span>
                                </td>
                                <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-300">
                                  {c.type || 'Theory'} &bull; {c.credit || c.credits || 1.5} Cr
                                </td>
                                <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                                  Semester {c.semesterLevel || c.semester || '—'}
                                </td>
                                <td className="py-3 px-3">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                    <Clock size={10} /> Needs Faculty
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => { setActiveStatModal(null); setAssignModalCourse(c); }}
                                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 ml-auto">
                                    <UserPlus size={12} /> Assign Faculty
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 5. STUDENTS VIEW */}
              {activeStatModal === 'students' && (() => {
                if (loadingStudentsStat) {
                  return (
                    <div className="py-16 text-center text-slate-500">
                      <RefreshCw size={28} className="mx-auto mb-2 animate-spin text-cyan-500" />
                      <p className="text-sm font-semibold">Loading student roster...</p>
                    </div>
                  );
                }

                const filtered = students.filter(s => {
                  const query = statModalSearch.toLowerCase();
                  const matchesSearch = !query ||
                    s.rollNumber?.toLowerCase().includes(query) ||
                    s.name?.toLowerCase().includes(query) ||
                    s.series?.toString().includes(query);
                  const matchesSeries = statModalFilter === 'all' || s.series?.toString() === statModalFilter;
                  return matchesSearch && matchesSeries;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400">
                      <GraduationCap size={36} className="mx-auto mb-2 opacity-40 text-cyan-500" />
                      <p className="text-sm font-semibold">No students found matching your criteria</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                          <th className="py-3 px-4">Roll Number</th>
                          <th className="py-3 px-4">Student Name</th>
                          <th className="py-3 px-3">Series Batch</th>
                          <th className="py-3 px-3">Semester & Sec</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-[#111c38]">
                        {filtered.map(s => (
                          <tr key={s._id || s.rollNumber} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                              <span className="bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded text-[11px]">
                                {s.rollNumber}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              {s.name}
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                              Series '{s.series}
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-300">
                              Sem {s.semester || '3-2'} &bull; Sec {s.section || 'A'}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                s.status === 'inactive'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              }`}>
                                {s.regularStatus || s.status || 'Active'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => { setActiveStatModal(null); setEditStudent(s); }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] inline-flex items-center gap-1">
                                <Edit size={11} /> Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* 6. MARK REQUESTS VIEW */}
              {activeStatModal === 'requests' && (() => {
                if (loadingRequests) {
                  return (
                    <div className="py-16 text-center text-slate-500">
                      <RefreshCw size={28} className="mx-auto mb-2 animate-spin text-rose-500" />
                      <p className="text-sm font-semibold">Loading mark review requests...</p>
                    </div>
                  );
                }

                const filtered = requestsList.filter(r => {
                  const s = statModalSearch.toLowerCase();
                  const matchesSearch = !s ||
                    r.studentRoll?.toLowerCase().includes(s) ||
                    r.studentName?.toLowerCase().includes(s) ||
                    r.course?.toLowerCase().includes(s) ||
                    r.courseName?.toLowerCase().includes(s) ||
                    r.teacherName?.toLowerCase().includes(s);
                  const matchesFilter = statModalFilter === 'all' ||
                    r.status?.toLowerCase() === statModalFilter.toLowerCase();
                  return matchesSearch && matchesFilter;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400">
                      <ClipboardList size={36} className="mx-auto mb-2 opacity-40 text-rose-500" />
                      <p className="text-sm font-semibold">No mark review requests match this filter</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Requested Course</th>
                          <th className="py-3 px-3">Faculty Reviewer</th>
                          <th className="py-3 px-3">Request Date</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-4 text-right">Marks Breakdown</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-[#111c38]">
                        {filtered.map(r => (
                          <tr key={r._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                                {r.studentRoll}
                              </p>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {r.studentName || r.student?.name}
                              </p>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded text-[10px] mr-1.5">
                                {r.course}
                              </span>
                              <span className="text-slate-700 dark:text-slate-200 font-medium">
                                {r.courseName}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-800 dark:text-slate-200">{r.teacherName || r.teacherRef?.name || r.teacher}</p>
                            </td>
                            <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                              {r.requestDate ? new Date(r.requestDate).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                r.status === 'Accepted' || r.status === 'Completed'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : r.status === 'Rejected'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setSelectedRequestDetail(r)}
                                className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-semibold text-[11px] shadow-sm flex items-center gap-1 ml-auto">
                                <Eye size={12} /> View Marks
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

            </div>

            {/* ── Modal Footer ── */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {activeStatModal === 'courses' && `Total ${courses.length} courses registered`}
                {activeStatModal === 'teachers' && `Total ${teachers.length} faculty registered`}
                {activeStatModal === 'assigned' && `${assignedCoursesCount} courses allocated`}
                {activeStatModal === 'unassigned' && `${unassignedCoursesCount} courses requiring instructor`}
                {activeStatModal === 'students' && `${stats?.totalStudents || students.length} students enrolled`}
                {activeStatModal === 'requests' && `${requestsList.length} total review requests`}
              </span>
              <button
                onClick={() => setActiveStatModal(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 font-semibold text-xs transition-colors">
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ────────────────── MARK REQUEST DETAILED BREAKDOWN MODAL ────────────────── */}
      {selectedRequestDetail && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white">
                    Evaluation Marks Breakdown
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedRequestDetail.studentRoll} &bull; {selectedRequestDetail.course}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedRequestDetail(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Student Name</span>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedRequestDetail.studentName || selectedRequestDetail.student?.name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Course Title</span>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedRequestDetail.courseName || selectedRequestDetail.course}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Instructor</span>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedRequestDetail.teacherName || selectedRequestDetail.teacher}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Review Status</span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">{selectedRequestDetail.status}</p>
                </div>
              </div>

              {selectedRequestDetail.reason && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Student Note / Reason:</span>
                  <p className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    "{selectedRequestDetail.reason}"
                  </p>
                </div>
              )}

              {/* Marks Table */}
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">Submitted Performance Scores</span>
                {selectedRequestDetail.detailedMarks ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Lab Quiz', val: selectedRequestDetail.detailedMarks.quiz ?? 0 },
                      { label: 'Lab Viva', val: selectedRequestDetail.detailedMarks.labViva ?? 0 },
                      { label: 'Lab Report', val: selectedRequestDetail.detailedMarks.labReport ?? 0 },
                      { label: 'Lab Test', val: selectedRequestDetail.detailedMarks.labTest ?? 0 },
                      { label: 'Attendance', val: selectedRequestDetail.detailedMarks.attendance ?? 0 },
                      { label: 'Assignment', val: selectedRequestDetail.detailedMarks.assignment ?? 0 },
                      { label: 'Midterm', val: selectedRequestDetail.detailedMarks.midterm ?? 0 },
                      { label: 'Final Exam', val: selectedRequestDetail.detailedMarks.final ?? 0 },
                      { label: 'Total Score', val: selectedRequestDetail.detailedMarks.total ?? 0, highlight: true }
                    ].map((m, idx) => (
                      <div key={idx} className={`p-2 rounded-xl text-center border ${
                        m.highlight
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium'
                      }`}>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">{m.label}</span>
                        <span className="text-sm font-bold">{m.val}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <p>No detailed mark breakdown uploaded yet by faculty.</p>
                  </div>
                )}
              </div>

              {selectedRequestDetail.remarks && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Teacher Remarks:</span>
                  <p className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                    "{selectedRequestDetail.remarks}"
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRequestDetail(null)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20">
                Back to Requests
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
