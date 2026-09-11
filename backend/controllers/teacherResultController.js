const Student    = require('../models/Student');
const Attendance = require('../models/Attendance');
const Report     = require('../models/Report');
const Performance = require('../models/Performance');
const Quiz       = require('../models/Quiz');
const Test       = require('../models/Test');
const Others     = require('../models/Others');
const Course     = require('../models/Course');
const CourseOffering = require('../models/CourseOffering');
const FinalResult = require('../models/FinalResult');
const { logAudit } = require('../middleware/auditMiddleware');

// Default assessment config (must sum to 75)
const DEFAULT_CONFIG = {
  performance: 5,
  quiz:        30,
  report:      10,
  attendance:  5,
  test:        20,
  others:      5,
};

const resolveConfig = (sourceDoc) => ({
  performance: sourceDoc?.assessmentConfig?.performance ?? DEFAULT_CONFIG.performance,
  quiz:        sourceDoc?.assessmentConfig?.quiz        ?? DEFAULT_CONFIG.quiz,
  report:      sourceDoc?.assessmentConfig?.report      ?? DEFAULT_CONFIG.report,
  attendance:  sourceDoc?.assessmentConfig?.attendance  ?? DEFAULT_CONFIG.attendance,
  test:        sourceDoc?.assessmentConfig?.test        ?? DEFAULT_CONFIG.test,
  others:      sourceDoc?.assessmentConfig?.others      ?? DEFAULT_CONFIG.others,
});

const getPercentageMark = (percentage, maxMark) => {
  if (percentage >= 90) return maxMark;
  if (percentage >= 80) return Math.round((maxMark * 0.9) * 100) / 100;
  if (percentage >= 70) return Math.round((maxMark * 0.8) * 100) / 100;
  if (percentage >= 60) return Math.round((maxMark * 0.7) * 100) / 100;
  return 0;
};

// @desc Calculate and get final results for a course (Total: 75)
// @route GET /api/teacher/results/:courseId
const getFinalResults = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { department, series, offeringId } = req.query;

    let query = {};
    if (department) query.department = department.toUpperCase();
    if (series)     query.series = series;

    // Fetch offering or course config
    let configDoc = null;
    let offeringDoc = null;
    if (offeringId && offeringId.match(/^[0-9a-fA-F]{24}$/)) {
      offeringDoc = await CourseOffering.findById(offeringId);
      configDoc = offeringDoc;
    }
    if (!configDoc) {
      offeringDoc = await CourseOffering.findOne({ courseCode: courseId.trim().toUpperCase() });
      configDoc = offeringDoc || await Course.findOne({ courseCode: courseId.trim().toUpperCase() });
    }

    const cfg = resolveConfig(configDoc);

    const students     = await Student.find(query).sort({ rollNumber: 1 });
    const attendances  = await Attendance.find({ course: courseId });
    const reports      = await Report.find({ course: courseId });
    const performances = await Performance.find({ course: courseId });
    const quizzes      = await Quiz.find({ course: courseId });
    const tests        = await Test.find({ course: courseId });
    const others       = await Others.find({ course: courseId });
    const finalSaved   = await FinalResult.find({ course: courseId });

    // Total unique attendance days recorded
    const uniqueDates = [...new Set(attendances.map(a => a.dayName))];
    const totalClassesTaken = uniqueDates.length || 1;

    const results = students.map(student => {
      const stuId = student._id.toString();

      // Attendance
      const stuAtt      = attendances.filter(a => a.student.toString() === stuId);
      const presentCount = stuAtt.filter(a => a.status === 'Present').length;
      const attPct       = (presentCount / totalClassesTaken) * 100;
      const attMark      = getPercentageMark(attPct, cfg.attendance);

      // Report
      const stuRep       = reports.filter(r => r.student.toString() === stuId);
      const submittedCnt = stuRep.filter(r => r.status === 'Submitted').length;
      const repPct       = (submittedCnt / totalClassesTaken) * 100;
      const repMark      = getPercentageMark(repPct, cfg.report);

      // Performance (average)
      const stuPerf  = performances.filter(p => p.student.toString() === stuId);
      const perfMark = stuPerf.length > 0
        ? Math.round((stuPerf.reduce((s, p) => s + p.marks, 0) / stuPerf.length) * 100) / 100
        : 0;

      // Quiz
      const quizMark = quizzes.find(q => q.student.toString() === stuId)?.marks || 0;

      // Test
      const testMark = tests.find(t => t.student.toString() === stuId)?.marks || 0;

      // Others
      const stuOthers  = others.filter(o => o.student.toString() === stuId);
      const otherMark  = Math.min(stuOthers.reduce((s, o) => s + o.marks, 0), cfg.others);

      // Total out of 75
      const totalMark = Math.round((attMark + repMark + perfMark + quizMark + testMark + otherMark) * 100) / 100;

      // Find if already saved in FinalResult
      const saved = finalSaved.find(f => f.student.toString() === stuId);

      return {
        student: { _id: student._id, name: student.name, rollNumber: student.rollNumber },
        attendanceMark: attMark,
        reportMark:     repMark,
        perfMark,
        quizMark,
        testMark,
        otherMark,
        totalMark,
        attPct: Math.round(attPct),
        warning: attPct < 60 ? 'Attendance below 60%' : null,
        config: cfg,
        status: saved?.status || (offeringDoc?.isMarksPublished ? 'published' : 'draft'),
        isPublished: saved?.isPublished || !!offeringDoc?.isMarksPublished
      };
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Save / Submit / Sync Mark Sheet
// @route POST /api/teacher/results/:courseId/submit
const submitMarkSheet = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { records, status = 'submitted' } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ message: 'records array is required' });
    }

    const offeringDoc = await CourseOffering.findOne({ courseCode: courseId.trim().toUpperCase() });

    const ops = records.map(async (r) => {
      return FinalResult.findOneAndUpdate(
        { student: r.studentId, course: courseId },
        {
          student: r.studentId,
          course: courseId,
          courseOffering: offeringDoc?._id || null,
          attendanceMarks: r.attendanceMark || 0,
          reportMarks: r.reportMark || 0,
          performanceMarks: r.perfMark || 0,
          quizMarks: r.quizMark || 0,
          testMarks: r.testMark || 0,
          othersMarks: r.otherMark || 0,
          totalMarks: r.totalMark || 0,
          status,
          teacher: req.user._id
        },
        { upsert: true, returnDocument: 'after' }
      );
    });

    await Promise.all(ops);

    await logAudit({
      req,
      action: 'SUBMIT_MARK_SHEET',
      entity: 'FinalResult',
      details: `${req.user.name} submitted marks for ${courseId} [Status: ${status}]`
    });

    res.json({ message: `Mark sheet ${status} successfully`, count: records.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getFinalResults,
  submitMarkSheet
};
