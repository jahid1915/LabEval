const Student  = require('../models/Student');
const Attendance = require('../models/Attendance');
const Report     = require('../models/Report');
const Performance = require('../models/Performance');
const Quiz       = require('../models/Quiz');
const Test       = require('../models/Test');
const Others     = require('../models/Others');
const Viva       = require('../models/Viva');

// ── RUET Official Grade Scale (out of 100) ─────────────────────────
const calculateGrade = (total) => {
  if (total >= 80) return 'A+';
  if (total >= 75) return 'A';
  if (total >= 70) return 'A-';
  if (total >= 65) return 'B+';
  if (total >= 60) return 'B';
  if (total >= 55) return 'B-';
  if (total >= 50) return 'C+';
  if (total >= 45) return 'C';
  if (total >= 40) return 'D';
  return 'F';
};

const getGradePoint = (grade) => {
  const map = { 'A+':4.00, 'A':3.75, 'A-':3.50, 'B+':3.25, 'B':3.00, 'B-':2.75, 'C+':2.50, 'C':2.25, 'D':2.00, 'F':0.00 };
  return map[grade] ?? 0;
};

// Att/Report percentage → mark out of 10
const getPercentageMark = (percentage) => {
  if (percentage >= 90) return 10;
  if (percentage >= 80) return 9;
  if (percentage >= 70) return 8;
  if (percentage >= 60) return 7;
  return 0; // below 60% → not eligible
};

// @desc    Calculate and get final results for a course (Total: 100)
// @route   GET /api/teacher/results/:courseId
// Mark Distribution:
//   Attendance: 10, Report: 10, Performance: 5, Viva: 25,
//   Quiz: 20, Test: 20, Others: 10  =>  Total: 100
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
    const vivas        = await Viva.find({ course: courseId });

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

      // Viva (max 25) — latest record wins
      const vivaMark = vivas.find(v => v.student.toString() === stuId)?.marks || 0;

      // Quiz (max 20) — latest record wins
      const quizMark = quizzes.find(q => q.student.toString() === stuId)?.marks || 0;

      // Test (max 20) — latest record wins
      const testMark = tests.find(t => t.student.toString() === stuId)?.marks || 0;

      // Others (max 10) — sum across sub-types, capped at 10
      const stuOthers  = others.filter(o => o.student.toString() === stuId);
      const otherMark  = Math.min(stuOthers.reduce((s, o) => s + o.marks, 0), 10);

      // Total out of 100
      const totalMark = Math.round((attMark + repMark + perfMark + vivaMark + quizMark + testMark + otherMark) * 100) / 100;
      const grade     = calculateGrade(totalMark);
      const gradePoint = getGradePoint(grade);

      return {
        student: { _id: student._id, name: student.name, rollNumber: student.rollNumber },
        attendanceMark:  attMark,
        reportMark:      repMark,
        perfMark,
        vivaMark,
        quizMark,
        testMark,
        otherMark,
        totalMark,
        grade,
        gradePoint,
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
