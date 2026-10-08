import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  BookOpen, ChevronDown, ChevronUp, GraduationCap,
  RefreshCw, Calendar, Award, User, Building2, FileText,
  AlertCircle, TrendingUp, CheckCircle, Clock
} from 'lucide-react';

const GRADE_COLORS = {
  'A+': 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
  'A':  'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
  'A-': 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
  'B+': 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
  'B':  'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
  'B-': 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800',
  'C+': 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
  'C':  'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
  'D':  'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800',
  'F':  'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
};

function GradeBadge({ grade }) {
  if (!grade) return <span className="text-slate-400 dark:text-slate-600 text-xs">—</span>;
  const colorClass = GRADE_COLORS[grade] || 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900 dark:border-slate-700';
  return (
    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${colorClass}`}>
      {grade}
    </span>
  );
}

function StatusBadge({ status, isPublished }) {
  if (isPublished || status === 'published') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle size={9} /> Published
      </span>
    );
  }
  if (status === 'submitted' || status === 'reviewed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
        <Clock size={9} /> Submitted
      </span>
    );
  }
  return null;
}

function SemesterCard({ semesterData, isExpanded, onToggle }) {
  const { semester, academicSession, courses } = semesterData;
  const publishedCount = courses.filter(c => c.isPublished).length;
  const hasGrades = courses.some(c => c.grade);

  // Calculate semester GPA if grades available
  const coursesWithGP = courses.filter(c => c.gradePoint !== null && c.gradePoint !== undefined);
  const totalCredits = coursesWithGP.length > 0 ? coursesWithGP.length * 1.5 : 0; // approx
  const weightedGP = coursesWithGP.reduce((sum, c) => sum + (c.gradePoint || 0), 0);
  const avgGP = coursesWithGP.length > 0 ? (weightedGP / coursesWithGP.length).toFixed(2) : null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Semester Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Calendar size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[14px] text-slate-900 dark:text-white">
                Semester {semester}
              </span>
              {academicSession && (
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {academicSession}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">
              {courses.length} course{courses.length !== 1 ? 's' : ''} · {publishedCount} published
              {avgGP && ` · SGPA: ${avgGP}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasGrades && avgGP && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <Award size={12} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400">SGPA {avgGP}</span>
            </div>
          )}
          {isExpanded
            ? <ChevronUp size={16} className="text-slate-400 dark:text-slate-500" />
            : <ChevronDown size={16} className="text-slate-400 dark:text-slate-500" />
          }
        </div>
      </button>

      {/* Semester Courses */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-800">
          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Course Code</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Course Name</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Teacher</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Grade</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">GP</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Marks</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {courses.map((course, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[12px]">
                        {course.courseCode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800 dark:text-slate-200 leading-tight block">
                        {course.courseName}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{course.courseType}</span>
                    </td>
                    <td className="px-4 py-3">
                      {course.teacherName && course.teacherName !== 'N/A' ? (
                        <div>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{course.teacherName}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">
                            {course.teacherId}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 text-xs">Not assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <GradeBadge grade={course.grade} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {course.gradePoint !== null && course.gradePoint !== undefined
                          ? Number(course.gradePoint).toFixed(2)
                          : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {course.totalMarks > 0 ? (
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {course.totalMarks}/{course.maxTotalMarks}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StatusBadge status={course.status} isPublished={course.isPublished} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden p-3 space-y-2">
            {courses.map((course, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[12px]">
                      {course.courseCode}
                    </span>
                    <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                      {course.courseName}
                    </p>
                  </div>
                  <GradeBadge grade={course.grade} />
                </div>
                {course.teacherName && course.teacherName !== 'N/A' && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <User size={10} />
                    <span>{course.teacherName}</span>
                    {course.teacherId && <span className="font-mono">({course.teacherId})</span>}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {course.gradePoint !== null && course.gradePoint !== undefined && (
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      GP: <strong>{Number(course.gradePoint).toFixed(2)}</strong>
                    </span>
                  )}
                  {course.totalMarks > 0 && (
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      Marks: <strong>{course.totalMarks}/{course.maxTotalMarks}</strong>
                    </span>
                  )}
                  <StatusBadge status={course.status} isPublished={course.isPublished} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentAcademicHistory() {
  const { user } = useContext(AuthContext);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSemesters, setExpandedSemesters] = useState(new Set());

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/student/history');
      setHistory(data);
      // Auto-expand the most recent semester
      if (data.semesters?.length > 0) {
        const key = `${data.semesters[0].semester}__${data.semesters[0].academicSession}`;
        setExpandedSemesters(new Set([key]));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load academic history');
      toast.error('Failed to load academic history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const toggleSemester = (key) => {
    setExpandedSemesters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    if (!history?.semesters) return;
    const keys = history.semesters.map(s => `${s.semester}__${s.academicSession}`);
    setExpandedSemesters(new Set(keys));
  };

  const collapseAll = () => setExpandedSemesters(new Set());

  return (
    <div className="space-y-5 pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} className="text-blue-600 dark:text-blue-400" />
              <h1 className="text-[16px] font-bold text-slate-900 dark:text-white">Academic History</h1>
            </div>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              {user?.name} &bull; Roll: {user?.rollNumber} &bull; Dept. of {user?.department}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Collapse All
            </button>
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[12px] font-medium flex items-center gap-1.5 hover:border-blue-500 transition-colors"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        {history && !loading && (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-blue-500" />
              <span className="text-[12px] text-slate-600 dark:text-slate-400">
                <strong className="text-slate-900 dark:text-white">{history.semesters?.length || 0}</strong> Semesters
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen size={13} className="text-indigo-500" />
              <span className="text-[12px] text-slate-600 dark:text-slate-400">
                <strong className="text-slate-900 dark:text-white">{history.totalResults || 0}</strong> Courses
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Award size={13} className="text-emerald-500" />
              <span className="text-[12px] text-slate-600 dark:text-slate-400">
                <strong className="text-slate-900 dark:text-white">
                  {history.semesters?.flatMap(s => s.courses).filter(c => c.isPublished).length || 0}
                </strong> Published Results
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-2">
                  <div className="w-32 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="w-24 h-3 bg-slate-100 dark:bg-slate-700 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <AlertCircle size={28} className="mx-auto mb-2 text-red-400" />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
          <button onClick={fetchHistory} className="mt-3 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors">
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && history?.semesters?.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
          <TrendingUp size={36} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
          <h3 className="text-[15px] font-semibold text-slate-700 dark:text-slate-300 mb-1">No Academic History Yet</h3>
          <p className="text-[13px] text-slate-400 dark:text-slate-600 max-w-sm mx-auto">
            Your academic records will appear here once results are submitted and published by your teachers.
          </p>
        </div>
      )}

      {/* Semester Records */}
      {!loading && !error && history?.semesters?.length > 0 && (
        <div className="space-y-3">
          {history.semesters.map((semData, idx) => {
            const key = `${semData.semester}__${semData.academicSession}`;
            return (
              <SemesterCard
                key={key}
                semesterData={semData}
                isExpanded={expandedSemesters.has(key)}
                onToggle={() => toggleSemester(key)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
