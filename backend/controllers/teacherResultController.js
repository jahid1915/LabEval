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
const {
  resolveConfig,
  sanitizeMark,
  TOTAL_MARKS
} = require('../config/assessmentConfig');


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
    // LabEval official: Attendance(5) + Reports(10) + Performance(5) + Quiz(30) + Test(20) + Others(5) = 75
    const maxTotalMarks = (cfg.attendance + cfg.report + cfg.performance + cfg.quiz + cfg.test + cfg.others) || 75;

    const [
      students,
      attendances,
      reports,
      performances,
      quizzes,
      tests,
      others,
      finalSaved
    ] = await Promise.all([
      Student.find(query).sort({ rollNumber: 1 }).select('name rollNumber department series').lean(),
      Attendance.find({ course: courseId }).select('student dayName status').lean(),
      Report.find({ course: courseId }).select('student dayName status').lean(),
      Performance.find({ course: courseId }).select('student marks').lean(),
      Quiz.find({ course: courseId }).select('student marks').lean(),
      Test.find({ course: courseId }).select('student marks').lean(),
      Others.find({ course: courseId }).select('student marks').lean(),
      FinalResult.find({ course: courseId }).lean()
    ]);

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

      // Report (labReport alias support)
      const stuRep       = reports.filter(r => r.student.toString() === stuId);
      const submittedCnt = stuRep.filter(r => r.status === 'Submitted').length;
      const repPct       = (submittedCnt / totalClassesTaken) * 100;
      const repMark      = saved?.reportMarks !== undefined ? saved.reportMarks : getPercentageMark(repPct, cfg.report);

      // Performance (new field)
      const stuPerf  = performances.filter(p => p.student.toString() === stuId);
      const perfMark = saved?.performanceMarks !== undefined ? saved.performanceMarks :
        (stuPerf.length > 0
          ? Math.min(Math.round((stuPerf.reduce((s, p) => s + p.marks, 0) / stuPerf.length) * 100) / 100, cfg.performance)
          : 0);

      // Quiz (summed from multiple quiz entries, capped at cfg.quiz)
      const stuQuizzes = quizzes.filter(q => q.student.toString() === stuId);
      const quizMark = saved?.quizMarks !== undefined ? saved.quizMarks :
        Math.min(stuQuizzes.reduce((s, q) => s + (q.marks || 0), 0), cfg.quiz);

      // Test (summed from multiple test entries, capped at cfg.test)
      const stuTests = tests.filter(t => t.student.toString() === stuId);
      const testMark = saved?.testMarks !== undefined ? saved.testMarks :
        Math.min(stuTests.reduce((s, t) => s + (t.marks || 0), 0), cfg.test);

      // Others
      const stuOthers  = others.filter(o => o.student.toString() === stuId);
      const otherMark  = saved?.othersMarks !== undefined ? saved.othersMarks :
        Math.min(stuOthers.reduce((s, o) => s + (o.marks || 0), 0), cfg.others);

      // Total marks = Attendance + Reports + Performance + Quiz + Test + Others
      const totalMark = saved?.totalMarks !== undefined
        ? saved.totalMarks
        : Math.round((attMark + repMark + perfMark + quizMark + testMark + otherMark) * 100) / 100;

      const { grade, gradePoint } = calculateRUETGrade(totalMark, maxTotalMarks);

      return {
        student: { _id: student._id, name: student.name, rollNumber: student.rollNumber, series: student.series, department: student.department },
        attendanceMark: attMark,
        reportMark:     repMark,
        perfMark,
        quizMark,
        testMark,
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
    // LabEval official: Attendance(5) + Reports(10) + Performance(5) + Quiz(30) + Test(20) + Others(5) = 75
    const maxTotalMarks = (cfg.attendance + cfg.report + cfg.performance + cfg.quiz + cfg.test + cfg.others) || 75;

    // sanitizeMark imported from config/assessmentConfig.js — clamps to [0, max], returns 0 for bad input

    const bulkOps = records.map((r) => {
      const att  = sanitizeMark(r.attendanceMark, cfg.attendance);
      const rep  = sanitizeMark(r.reportMark,     cfg.report);
      const perf = sanitizeMark(r.perfMark,        cfg.performance);
      const q    = sanitizeMark(r.quizMark,        cfg.quiz);
      const t    = sanitizeMark(r.testMark,        cfg.test);
      const oth  = sanitizeMark(r.otherMark,       cfg.others);

      const rawTot = r.totalMark !== undefined && !isNaN(Number(r.totalMark))
        ? Number(r.totalMark)
        : (att + rep + perf + q + t + oth);
      const tot = sanitizeMark(rawTot, maxTotalMarks);
      const { grade, gradePoint } = calculateRUETGrade(tot, maxTotalMarks);

      // Store detailedMarks in both legacy and new field names for compat
      const detailedMarks = {
        attendance: att,
        report:     rep,
        labReport:  rep,
        performance: perf,
        quiz:        q,
        test:        t,
        labTest:     t,
        others:      oth,
        total:       tot,
        grade,
        gradePoint
      };

      return {
        updateOne: {
          filter: { student: r.studentId, course: cleanCourseCode },
          update: {
            $set: {
              student: r.studentId,
              rollNumber: r.studentRoll || '',
              studentName: r.studentName || '',
              department: r.department || req.user.department,
              series: r.series || offeringDoc?.seriesName || '22',
              semester: semester || offeringDoc?.semesterName || courseDoc?.semesterLevel || '',
              academicSession: academicSession || offeringDoc?.sessionName || '2024-2025',
              course: cleanCourseCode,
              courseName: offeringDoc?.courseName || courseDoc?.courseName || cleanCourseCode,
              courseOffering: offeringDoc?._id || null,
              teacher: req.user._id,
              teacherId: req.user.teacherId,
              teacherName: req.user.name,
              attendanceMarks: att,
              reportMarks: rep,
              performanceMarks: perf,
              quizMarks: q,
              testMarks: t,
              othersMarks: oth,
              totalMarks: tot,
              maxTotalMarks,
              grade,
              gradePoint,
              detailedMarks,
              status,
              isPublished: status === 'published',
              publishedAt: status === 'published' ? new Date() : undefined
            }
          },
          upsert: true
        }
      };
    });

    if (bulkOps.length > 0) {
      await FinalResult.bulkWrite(bulkOps, { ordered: false });
    }

    await logAudit({
      req,
      action: 'SUBMIT_MARK_SHEET',
      entity: 'FinalResult',
      details: `${req.user.name} saved marks for ${cleanCourseCode} [Status: ${status}]`
    });

    res.json({ success: true, message: `Mark sheet ${status} successfully`, count: records.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getFinalResults,
  submitMarkSheet
};

