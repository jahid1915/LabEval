import React from 'react';
import { Award, X, Check } from 'lucide-react';

const labelClass = "block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5";
const inputClass = "w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30";

export function AssignCourseModal({
  assignModalCourse,
  setAssignModalCourse,
  deptCode,
  teachers,
  selectedTeacherId,
  setSelectedTeacherId,
  selectedSemester,
  setSelectedSemester,
  selectedSession,
  setSelectedSession,
  selectedSeries,
  setSelectedSeries,
  assigningLoading,
  handleAssignCourse,
}) {
  if (!assignModalCourse) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Award className="text-amber-500" size={20} />
            <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
              Assign Course to Teacher
            </h3>
          </div>
          <button onClick={() => setAssignModalCourse(null)} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Course Summary Card */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-700 dark:text-slate-200 space-y-1">
          <p className="font-mono font-bold text-amber-700 dark:text-amber-400 text-sm">
            {assignModalCourse.courseCode} &bull; {assignModalCourse.courseName || assignModalCourse.title}
          </p>
          <p className="text-slate-500">
            Course Type: <strong>Sessional</strong> &bull; Format: <strong>Laboratory & Practical</strong> &bull; Dept: <strong>{deptCode}</strong>
          </p>
        </div>

        <form onSubmit={handleAssignCourse} className="space-y-3.5">
          <div>
            <label className={labelClass}>
              Select Department Teacher (Section 11)
            </label>
            <select
              required
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className={inputClass}
            >
              <option value="">-- Choose Course Teacher --</option>
              {teachers.map((t) => (
                <option key={t.teacherId} value={t.teacherId}>
                  {t.name} ({t.teacherId}) - {t.designation || 'Instructor'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className={inputClass}
              >
                <option value="1-1">1-1</option>
                <option value="1-2">1-2</option>
                <option value="2-1">2-1</option>
                <option value="2-2">2-2</option>
                <option value="3-1">3-1</option>
                <option value="3-2">3-2</option>
                <option value="4-1">4-1</option>
                <option value="4-2">4-2</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Academic Session</label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className={inputClass}
              >
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Series Batch</label>
              <select
                value={selectedSeries}
                onChange={(e) => setSelectedSeries(e.target.value)}
                className={inputClass}
              >
                <option value="22">Series 22</option>
                <option value="23">Series 23</option>
                <option value="24">Series 24</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500">
            Rule (Section 12): Only Department Head assigns courses. Once assigned, this course immediately appears on the teacher's dashboard, and the teacher becomes the official evaluator for mark requests.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAssignModalCourse(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assigningLoading}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/30 flex items-center gap-1.5"
            >
              {assigningLoading ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <>
                  <Check size={14} />
                  Assign Course
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ViewSyllabusModal({
  viewSyllabusCourse,
  setViewSyllabusCourse,
}) {
  if (!viewSyllabusCourse) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="font-mono text-xs font-bold text-amber-500">{viewSyllabusCourse.courseCode}</span>
            <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
              {viewSyllabusCourse.courseName || viewSyllabusCourse.title}
            </h3>
          </div>
          <button onClick={() => setViewSyllabusCourse(null)} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-4 text-xs font-semibold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
            <span>Semester: <strong>{viewSyllabusCourse.semesterLevel || '3-2'}</strong></span>
            <span>Credits: <strong>{viewSyllabusCourse.credits}</strong></span>
            <span>Format: <strong>{viewSyllabusCourse.isSessional ? 'Sessional / Lab' : 'Theory'}</strong></span>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-white mb-1.5 uppercase tracking-wider text-[11px]">
              Course Syllabus & Outline:
            </h4>
            <p className="leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 whitespace-pre-line">
              {viewSyllabusCourse.syllabus || 'No syllabus text available for this sessional course.'}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => setViewSyllabusCourse(null)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
