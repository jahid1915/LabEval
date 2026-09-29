import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  CheckCircle2, Clock, BookOpen, Sparkles, Check, RefreshCw, Info, Lock, Radio
} from 'lucide-react';
import api from '../../api/axios';
import { getSocket } from '../../utils/socket';
import RuetLogo from '../../components/RuetLogo';

export default function StudentElectiveSelection() {
  const [loading, setLoading] = useState(true);
  const [offerings, setOfferings] = useState([]);
  const [selectedCourseForVote, setSelectedCourseForVote] = useState(null); // { offering, course }
  const [voteConfirmModalOpen, setVoteConfirmModalOpen] = useState(false);
  const [votingLoading, setVotingLoading] = useState(false);

  // Load student's eligible elective offerings
  const loadEligibleOfferings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/electives/student/eligible');
      if (res.data.success) {
        setOfferings(res.data.data || []);
      }
    } catch {
      toast.error('Failed to load eligible elective courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEligibleOfferings();
  }, [loadEligibleOfferings]);

  // Real-time socket updates
  useEffect(() => {
    const socket = getSocket();
    offerings.forEach(off => {
      socket.emit('joinElectiveRoom', off._id);
    });

    const handleVoteUpdate = () => {
      loadEligibleOfferings();
    };

    socket.on('elective:voted', handleVoteUpdate);
    socket.on('elective:finalized', handleVoteUpdate);
    socket.on('elective:reopened', handleVoteUpdate);

    return () => {
      offerings.forEach(off => {
        socket.emit('leaveElectiveRoom', off._id);
      });
      socket.off('elective:voted', handleVoteUpdate);
      socket.off('elective:finalized', handleVoteUpdate);
      socket.off('elective:reopened', handleVoteUpdate);
    };
  }, [offerings, loadEligibleOfferings]);

  // Open Vote Confirmation Modal (Requirement 8)
  const initiateVote = (offering, course) => {
    if (!offering.isOpen) {
      toast.warning('Voting is currently closed or finalized for this course.');
      return;
    }
    setSelectedCourseForVote({ offering, course });
    setVoteConfirmModalOpen(true);
  };

  // Submit Vote (Requirement 8 & 9)
  const submitVote = async () => {
    if (!selectedCourseForVote) return;
    const { offering, course } = selectedCourseForVote;

    setVotingLoading(true);
    try {
      const res = await api.post(`/electives/student/${offering._id}/vote`, {
        courseId: course._id
      });

      if (res.data.success) {
        toast.success(res.data.message || `✓ Vote Submitted for ${course.courseName}!`);
        setVoteConfirmModalOpen(false);
        setSelectedCourseForVote(null);
        await loadEligibleOfferings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit vote');
    } finally {
      setVotingLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ── HEADER BANNER ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <RuetLogo size={52} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-heading font-black text-slate-900 dark:text-white">
                Elective Course Selection
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                Student Voting
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Select and vote for your preferred elective courses for your current academic semester
            </p>
          </div>
        </div>

        <button
          onClick={loadEligibleOfferings}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 transition self-start sm:self-auto"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── VOTING RULES ADVISORY BANNER (Requirement 9) ────────────────────── */}
      <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl p-4 flex items-start gap-3.5">
        <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 shrink-0">
          <Info size={18} />
        </div>
        <div className="text-xs text-purple-900 dark:text-purple-200 space-y-1">
          <p className="font-bold">Voting Guidelines & Rules:</p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-purple-800/80 dark:text-purple-300/80">
            <li>You can submit <strong>one active vote</strong> per elective offering cycle.</li>
            <li>You may <strong>change your vote</strong> at any time while voting is OPEN.</li>
            <li>Once Admin finalizes allocations, voting is locked and your approved elective will be added to your active courses.</li>
          </ul>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <RefreshCw className="animate-spin text-purple-600 mb-3" size={28} />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading your eligible elective courses...</p>
        </div>
      ) : offerings.length === 0 ? (
        <div className="text-center p-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <BookOpen size={44} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">No Elective Courses Offered</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            There are currently no active elective courses offered to your department and series. Please check back when your department publishes elective offerings.
          </p>
        </div>
      ) : (
        /* ── OFFERINGS LIST ─────────────────────────────────────────────────── */
        <div className="space-y-8">
          {offerings.map(offering => {
            const hasVoted = offering.hasVoted;
            const votedCourseId = offering.votedCourseId;
            const isFinalized = offering.isFinalized;
            const isOpen = offering.isOpen;

            // Find current choice course
            const currentChoice = offering.availableCourses.find(c => c._id === votedCourseId) || offering.mySelection?.selectedCourse;

            return (
              <div
                key={offering._id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                {/* Offering Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/20">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                        {offering.departmentCode} • Semester {offering.semester}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        Series {offering.eligibleSeries?.join(', ') || offering.series}
                      </span>
                    </div>

                    <h2 className="text-xl font-heading font-black text-slate-900 dark:text-white">
                      {offering.electiveGroup}
                    </h2>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isFinalized ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 size={14} /> Allocation Finalized
                      </span>
                    ) : hasVoted ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <Check size={14} /> ✓ Vote Submitted
                      </span>
                    ) : isOpen ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                        <Clock size={14} /> Voting Open
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        <Lock size={14} /> Voting Closed
                      </span>
                    )}
                  </div>
                </div>

                {/* Voted Confirmation Notice (Requirement 8) */}
                {hasVoted && (
                  <div className="mx-6 mt-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-300 font-bold shrink-0">
                        <Check size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                          ✓ Vote Submitted
                        </p>
                        <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90">
                          Your current choice: <strong>{currentChoice?.courseName || offering.mySelection?.courseName}</strong> ({currentChoice?.courseCode || offering.mySelection?.courseCode})
                        </p>
                      </div>
                    </div>

                    {isOpen && !isFinalized && (
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        You can change your selection below until voting closes
                      </span>
                    )}
                  </div>
                )}

                {/* Available Electives Cards (Requirement 7) */}
                <div className="p-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                    Available Electives
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {offering.availableCourses.map(course => {
                      const isSelected = votedCourseId === course._id;
                      const teacherDisplay = course.teacherName || offering.teacherName || offering.assignedTeacher?.name || 'Assigned by Department';

                      return (
                        <div
                          key={course._id}
                          className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                            isSelected
                              ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-500 shadow-md shadow-purple-500/10 ring-1 ring-purple-500'
                              : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            {/* Course Code & Credit */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-mono font-black text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60">
                                {course.courseCode}
                              </span>
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                Credit: {course.credit}
                              </span>
                            </div>

                            {/* Course Title */}
                            <h4 className="font-heading font-black text-base text-slate-900 dark:text-white mb-2">
                              {course.courseName}
                            </h4>

                            {/* Teacher Info */}
                            <div className="text-xs text-slate-600 dark:text-slate-400 mb-4 flex items-center gap-1.5">
                              <span className="text-slate-400">Teacher:</span>
                              <strong className="text-slate-800 dark:text-slate-200 font-bold">{teacherDisplay}</strong>
                            </div>
                          </div>

                          {/* Action Button / Radio (Requirement 7 & 8) */}
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                            {isSelected ? (
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 size={16} /> Selected Choice
                                </span>
                                {isFinalized && (
                                  <span className="text-[10px] font-bold text-slate-400">Enrolled ✓</span>
                                )}
                              </div>
                            ) : isOpen && !isFinalized ? (
                              <button
                                type="button"
                                onClick={() => initiateVote(offering, course)}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition shadow-sm"
                              >
                                <Radio size={14} className="text-purple-600" /> Select this course
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Not selected</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── VOTE CONFIRMATION MODAL (Requirement 8) ─────────────────────────── */}
      <AnimatePresence>
        {voteConfirmModalOpen && selectedCourseForVote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-5"
            >
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 mx-auto mb-2">
                  <Sparkles size={24} />
                </div>
                <h3 className="font-heading font-black text-xl text-slate-900 dark:text-white">
                  Confirm Your Elective Choice
                </h3>
                <p className="text-xs text-slate-500">
                  Please review your selected course before submitting
                </p>
              </div>

              {/* Exact user prompt requirement text layout */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2 text-center">
                <span className="text-xs text-slate-400 font-semibold block">You selected:</span>
                <h4 className="font-heading font-black text-lg text-slate-900 dark:text-white">
                  {selectedCourseForVote.course.courseName}
                </h4>
                <p className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">
                  {selectedCourseForVote.course.courseCode}
                </p>
                <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-700">
                  Teacher: {selectedCourseForVote.course.teacherName || selectedCourseForVote.offering.teacherName || 'Assigned by Dept'}
                </p>
              </div>

              <p className="text-xs text-center text-slate-600 dark:text-slate-400 font-medium">
                Do you want to submit this choice?
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setVoteConfirmModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={votingLoading}
                  onClick={submitVote}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black shadow-md shadow-purple-500/25 flex items-center justify-center gap-2"
                >
                  {votingLoading ? <RefreshCw className="animate-spin" size={14} /> : null}
                  Submit Vote
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
