const Student    = require('../models/Student');
const Attendance = require('../models/Attendance');
const Report     = require('../models/Report');
const Performance = require('../models/Performance');
const Quiz       = require('../models/Quiz');
const Test       = require('../models/Test');
const Others     = require('../models/Others');
const Course     = require('../models/Course');

// Default assessment config (must sum to 75)
const DEFAULT_CONFIG = {
  performance: 5,
  quiz:        30,
  report:      10,
  attendance:  5,
  test:        20,
  others:      5,
};

// Resolve effective config from course document (fallback to defaults)
const resolveConfig = (course) => ({
  performance: course?.assessmentConfig?.performance ?? DEFAULT_CONFIG.performance,
  quiz:        course?.assessmentConfig?.quiz        ?? DEFAULT_CONFIG.quiz,
  report:      course?.assessmentConfig?.report      ?? DEFAULT_CONFIG.report,
  attendance:  course?.assessmentConfig?.attendance  ?? DEFAULT_CONFIG.attendance,
  test:        course?.assessmentConfig?.test        ?? DEFAULT_CONFIG.test,
  others:      course?.assessmentConfig?.others      ?? DEFAULT_CONFIG.others,
});

// Att/Report percentage → mark scaled to configured max
const getPercentageMark = (percentage, maxMark) => {
  if (percentage >= 90) return maxMark;
  if (percentage >= 80) return Math.round((maxMark * 0.9) * 100) / 100;
  if (percentage >= 70) return Math.round((maxMark * 0.8) * 100) / 100;
  if (percentage >= 60) return Math.round((maxMark * 0.7) * 100) / 100;
  return 0; // below 60% → not eligible
};

// @desc    Calculate and get final results for a course (Total: 75)
// @route   GET /api/teacher/results/:courseId
// Mark Distribution: Attendance + Report + Performance + Quiz + Test + Others = 75 (teacher-configured)
const getFinalResults = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { department, series } = req.query;

    let query = {};
    if (department) query.department = department;
    if (series)     query.series = series;

    // Fetch course to get assessment config
    const course = await Course.findOne({ courseCode: courseId });
    const cfg    = resolveConfig(course);

    const students     = await Student.find(query).sort({ rollNumber: 1 });
    const attendances  = await Attendance.find({ course: courseId });
    const reports      = await Report.find({ course: courseId });
    const performances = await Performance.find({ course: courseId });
    const quizzes      = await Quiz.find({ course: courseId });
    const tests        = await Test.find({ course: courseId });
    const others       = await Others.find({ course: courseId });

    // Total classes = number of unique attendance days recorded
    const uniqueDates = [...new Set(attendances.map(a => a.dayName))];
    const totalClassesTaken = uniqueDates.length || 1;

    const results = students.map(student => {
      const stuId = student._id.toString();

      // Attendance (max = cfg.attendance) — percentage-based
      const stuAtt      = attendances.filter(a => a.student.toString() === stuId);
      const presentCount = stuAtt.filter(a => a.status === 'Present').length;
      const attPct       = (presentCount / totalClassesTaken) * 100;
      const attMark      = getPercentageMark(attPct, cfg.attendance);

      // Report (max = cfg.report) — percentage-based
      const stuRep       = reports.filter(r => r.student.toString() === stuId);
      const submittedCnt = stuRep.filter(r => r.status === 'Submitted').length;
      const repPct       = (submittedCnt / totalClassesTaken) * 100;
      const repMark      = getPercentageMark(repPct, cfg.report);

      // Performance (max = cfg.performance) — average of all daily marks
      const stuPerf  = performances.filter(p => p.student.toString() === stuId);
      const perfMark = stuPerf.length > 0
        ? Math.round((stuPerf.reduce((s, p) => s + p.marks, 0) / stuPerf.length) * 100) / 100
        : 0;

      // Quiz (max = cfg.quiz) — latest record wins
      const quizMark = quizzes.find(q => q.student.toString() === stuId)?.marks || 0;

      // Test (max = cfg.test) — latest record wins
      const testMark = tests.find(t => t.student.toString() === stuId)?.marks || 0;

      // Others (max = cfg.others) — sum across sub-types, capped at configured max
      const stuOthers  = others.filter(o => o.student.toString() === stuId);
      const otherMark  = Math.min(stuOthers.reduce((s, o) => s + o.marks, 0), cfg.others);

      // Total out of 75
      const totalMark = Math.round((attMark + repMark + perfMark + quizMark + testMark + otherMark) * 100) / 100;

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
      };
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getFinalResults };
