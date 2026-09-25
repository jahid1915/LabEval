const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Report = require('../models/Report');
const Performance = require('../models/Performance');
const Quiz = require('../models/Quiz');
const Test = require('../models/Test');
const Others = require('../models/Others');
const Course = require('../models/Course');
const CourseOffering = require('../models/CourseOffering');
const FinalResult = require('../models/FinalResult');
const { calculateRUETGrade } = require('../utils/gradeCalculator');
const { logAudit } = require('../middleware/auditMiddleware');

// Default assessment config (RUET standard: Quiz 20, Report 15, Viva 10, Test 20, Open Ended 0, Attendance 10 = Total 65 or 75)
const DEFAULT_CONFIG = {
  quiz:        20,
  labReport:   15,
  labViva:     10,
  labTest:     20,
  openEnded:   0,
  attendance:  10,
  others:      0,
  // legacy fallback
  performance: 5,
  report:      10,
  test:        20,
};

const resolveConfig = (sourceDoc) => ({
  quiz:        sourceDoc?.assessmentConfig?.quiz        ?? sourceDoc?.defaultAssessmentConfig?.quiz        ?? DEFAULT_CONFIG.quiz,
  labReport:   sourceDoc?.assessmentConfig?.labReport   ?? sourceDoc?.defaultAssessmentConfig?.labReport   ?? DEFAULT_CONFIG.labReport,
  labViva:     sourceDoc?.assessmentConfig?.labViva     ?? sourceDoc?.defaultAssessmentConfig?.labViva     ?? DEFAULT_CONFIG.labViva,
  labTest:     sourceDoc?.assessmentConfig?.labTest     ?? sourceDoc?.defaultAssessmentConfig?.labTest     ?? DEFAULT_CONFIG.labTest,
  openEnded:   sourceDoc?.assessmentConfig?.openEnded   ?? sourceDoc?.defaultAssessmentConfig?.openEnded   ?? DEFAULT_CONFIG.openEnded,
  attendance:  sourceDoc?.assessmentConfig?.attendance  ?? sourceDoc?.defaultAssessmentConfig?.attendance  ?? DEFAULT_CONFIG.attendance,
  others:      sourceDoc?.assessmentConfig?.others      ?? sourceDoc?.defaultAssessmentConfig?.others      ?? DEFAULT_CONFIG.others,
});

const getPercentageMark = (percentage, maxMark) => {
  if (percentage >= 90) return maxMark;
  if (percentage >= 80) return Math.round((maxMark * 0.9) * 100) / 100;
  if (percentage >= 70) return Math.round((maxMark * 0.8) * 100) / 100;
  if (percentage >= 60) return Math.round((maxMark * 0.7) * 100) / 100;
  return 0;
};

// @desc Calculate and get final results for a course
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
    const maxTotalMarks = (cfg.quiz + cfg.labReport + cfg.labViva + cfg.labTest + cfg.attendance + cfg.others) || 65;

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

      // Find if already saved in FinalResult
      const saved = finalSaved.find(f => f.student.toString() === stuId);

      // Attendance
      const stuAtt      = attendances.filter(a => a.student.toString() === stuId);
      const presentCount = stuAtt.filter(a => a.status === 'Present').length;
      const attPct       = (presentCount / totalClassesTaken) * 100;
      const attMark      = saved?.attendanceMarks !== undefined ? saved.attendanceMarks : getPercentageMark(attPct, cfg.attendance);

      // Report
      const stuRep       = reports.filter(r => r.student.toString() === stuId);
      const submittedCnt = stuRep.filter(r => r.status === 'Submitted').length;
      const repPct       = (submittedCnt / totalClassesTaken) * 100;
      const repMark      = saved?.reportMarks !== undefined ? saved.reportMarks : getPercentageMark(repPct, cfg.labReport);

      // Viva
      const vivaMark = saved?.vivaMarks !== undefined ? saved.vivaMarks : 0;

      // Performance
      const stuPerf  = performances.filter(p => p.student.toString() === stuId);
      const perfMark = stuPerf.length > 0
        ? Math.round((stuPerf.reduce((s, p) => s + p.marks, 0) / stuPerf.length) * 100) / 100
        : 0;

      // Quiz
      const quizMark = saved?.quizMarks !== undefined ? saved.quizMarks : (quizzes.find(q => q.student.toString() === stuId)?.marks || 0);

      // Test
      const testMark = saved?.testMarks !== undefined ? saved.testMarks : (tests.find(t => t.student.toString() === stuId)?.marks || 0);

      // Open ended
      const openEndedMark = saved?.openEndedMarks !== undefined ? saved.openEndedMarks : 'A';

      // Others
      const stuOthers  = others.filter(o => o.student.toString() === stuId);
      const otherMark  = saved?.othersMarks !== undefined ? saved.othersMarks : Math.min(stuOthers.reduce((s, o) => s + o.marks, 0), cfg.others);

      // Total marks
      const numOE = (openEndedMark === 'A' || isNaN(Number(openEndedMark))) ? 0 : Number(openEndedMark);
      const totalMark = saved?.totalMarks !== undefined 
        ? saved.totalMarks 
        : Math.round((attMark + repMark + vivaMark + perfMark + quizMark + testMark + numOE + otherMark) * 100) / 100;

      const { grade, gradePoint } = calculateRUETGrade(totalMark, maxTotalMarks);

      return {
        student: { _id: student._id, name: student.name, rollNumber: student.rollNumber, series: student.series, department: student.department },
        attendanceMark: attMark,
        reportMark:     repMark,
        vivaMark:       vivaMark,
        perfMark,
        quizMark,
        testMark,
        openEndedMark,
        otherMark,
        totalMark,
        maxTotalMarks,
        grade: saved?.grade || grade,
        gradePoint: saved?.gradePoint !== undefined ? saved.gradePoint : gradePoint,
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

// @desc Save / Submit Mark Sheet (with RUET grade & grade point calculation)
// @route POST /api/teacher/results/:courseId/submit
const submitMarkSheet = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { records, status = 'submitted', semester, academicSession } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ message: 'records array is required' });
    }

    const cleanCourseCode = courseId.trim().toUpperCase();
    const offeringDoc = await CourseOffering.findOne({ courseCode: cleanCourseCode });
    const courseDoc = await Course.findOne({ courseCode: cleanCourseCode });

    const cfg = resolveConfig(offeringDoc || courseDoc);
    const maxTotalMarks = (cfg.quiz + cfg.labReport + cfg.labViva + cfg.labTest + cfg.attendance + cfg.others) || 65;

    const sanitizeMark = (val, max) => {
      if (val === undefined || val === null || val === '') return 0;
      const num = Number(val);
      if (isNaN(num) || !isFinite(num) || num < 0) return 0;
      return Math.min(max, Math.round(num * 100) / 100);
    };

    const ops = records.map(async (r) => {
      const q = sanitizeMark(r.quizMark, cfg.quiz);
      const rep = sanitizeMark(r.reportMark, cfg.labReport);
      const viv = sanitizeMark(r.vivaMark, cfg.labViva);
      const t = sanitizeMark(r.testMark, cfg.labTest);
      const oe = r.openEndedMark === 'A' ? 'A' : sanitizeMark(r.openEndedMark, cfg.openEnded || 20);
      const att = sanitizeMark(r.attendanceMark, cfg.attendance);
      const numOE = oe === 'A' ? 0 : oe;
      const rawTot = r.totalMark !== undefined && !isNaN(Number(r.totalMark)) ? Number(r.totalMark) : (q + rep + viv + t + numOE + att);
      const tot = sanitizeMark(rawTot, maxTotalMarks);
      const { grade, gradePoint } = calculateRUETGrade(tot, maxTotalMarks);

      const detailedMarks = {
        quiz: q,
        labReport: rep,
        labViva: viv,
        labTest: t,
        openEnded: oe,
        attendance: att,
        total: tot,
        grade,
        gradePoint
      };

      return FinalResult.findOneAndUpdate(
        { student: r.studentId, course: cleanCourseCode },
        {
          student: r.studentId,
          rollNumber: r.studentRoll || '',
          studentName: r.studentName || '',
          department: r.department || req.user.department,
          series: r.series || offeringDoc?.seriesName || '22',
          semester: semester || offeringDoc?.semesterName || courseDoc?.semesterLevel || '3-2',
          academicSession: academicSession || offeringDoc?.sessionName || '2024-2025',
          course: cleanCourseCode,
          courseName: offeringDoc?.courseName || courseDoc?.courseName || cleanCourseCode,
          courseOffering: offeringDoc?._id || null,
          teacher: req.user._id,
          teacherId: req.user.teacherId,
          teacherName: req.user.name,
          quizMarks: q,
          reportMarks: rep,
          vivaMarks: viv,
          testMarks: t,
          openEndedMarks: oe,
          attendanceMarks: att,
          totalMarks: tot,
          maxTotalMarks,
          grade,
          gradePoint,
          detailedMarks,
          status,
          isPublished: status === 'published',
          publishedAt: status === 'published' ? new Date() : null
        },
        { upsert: true, returnDocument: 'after' }
      );
    });

    await Promise.all(ops);

    await logAudit({
      req,
      action: 'SUBMIT_MARK_SHEET',
      entity: 'FinalResult',
      details: `${req.user.name} saved marks for ${cleanCourseCode} [Status: ${status}]`
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
