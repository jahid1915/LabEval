const Student  = require('../models/Student');
const Attendance = require('../models/Attendance');
const Report     = require('../models/Report');
const Performance = require('../models/Performance');
const Quiz       = require('../models/Quiz');
const Test       = require('../models/Test');
const Others     = require('../models/Others');

// Grade scale based on 75 total
const calculateGrade = (total) => {
  if (total >= 67.5) return 'A+';   // ≥90% of 75
  if (total >= 63.75) return 'A';   // ≥85%
  if (total >= 60) return 'A-';     // ≥80%
  if (total >= 56.25) return 'B+';  // ≥75%
  if (total >= 52.5) return 'B';    // ≥70%
  if (total >= 48.75) return 'B-';  // ≥65%
  if (total >= 45) return 'C+';     // ≥60%
  if (total >= 41.25) return 'C';   // ≥55%
  if (total >= 37.5) return 'D';    // ≥50%
  return 'F';
};

// Att/Report percentage → mark out of 10
const getPercentageMark = (percentage) => {
  if (percentage >= 90) return 10;
  if (percentage >= 80) return 9;
  if (percentage >= 70) return 8;
  if (percentage >= 60) return 7;
  return 0; // below 60% → not eligible
};

// @desc    Calculate and get final results for a course (Total: 75)
// @route   GET /api/teacher/results/:courseId
const getFinalResults = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { department, series } = req.query;

    let query = {};
    if (department) query.department = department;
    if (series)     query.series = series;

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

      // Attendance (max 10)
      const stuAtt      = attendances.filter(a => a.student.toString() === stuId);
      const presentCount = stuAtt.filter(a => a.status === 'Present').length;
      const attPct       = (presentCount / totalClassesTaken) * 100;
      const attMark      = getPercentageMark(attPct);

      // Report (max 10)
      const stuRep       = reports.filter(r => r.student.toString() === stuId);
      const submittedCnt = stuRep.filter(r => r.status === 'Submitted').length;
      const repPct       = (submittedCnt / totalClassesTaken) * 100;
      const repMark      = getPercentageMark(repPct);

      // Performance (max 5) — average of all daily marks
      const stuPerf  = performances.filter(p => p.student.toString() === stuId);
      const perfMark = stuPerf.length > 0
        ? Math.round((stuPerf.reduce((s, p) => s + p.marks, 0) / stuPerf.length) * 100) / 100
        : 0;

      // Quiz (max 20) — latest record wins
      const quizMark = quizzes.find(q => q.student.toString() === stuId)?.marks || 0;

      // Test (max 20) — latest record wins
      const testMark = tests.find(t => t.student.toString() === stuId)?.marks || 0;

      // Others (max 10) — sum across sub-types (Presentation + Project + Assignment, capped at 10)
      const stuOthers  = others.filter(o => o.student.toString() === stuId);
      const otherMark  = Math.min(stuOthers.reduce((s, o) => s + o.marks, 0), 10);

      // Total out of 75
      const totalMark = Math.round(attMark + repMark + perfMark + quizMark + testMark + otherMark);
      const grade     = calculateGrade(totalMark);

      return {
        student: { _id: student._id, name: student.name, rollNumber: student.rollNumber },
        attendanceMark:  attMark,
        reportMark:      repMark,
        perfMark,
        quizMark,
        testMark,
        otherMark,
        totalMark,
        grade,
        attPct:  Math.round(attPct),
        warning: attPct < 60 ? 'Attendance below 60%' : null,
      };
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getFinalResults };
