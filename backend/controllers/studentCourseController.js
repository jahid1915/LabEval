const Course      = require('../models/Course');
const Teacher     = require('../models/Teacher');
const Request     = require('../models/Request');
const Attendance  = require('../models/Attendance');
const Report      = require('../models/Report');
const Performance = require('../models/Performance');
const Quiz        = require('../models/Quiz');
const Test        = require('../models/Test');
const Others      = require('../models/Others');

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

// @desc    Get all courses matching student's department & series, with request status and summary metrics
// @route   GET /api/student/courses
const getStudentCourses = async (req, res) => {
  try {
    const student = req.user;
    const { department, series } = student;

    // Find all courses matching the student's dept & series
    const courses = await Course.find({
      department: department.toUpperCase(),
      series:     series
    }).sort({ createdAt: -1 });

    // Get all requests by this student
    const requests = await Request.find({ student: student._id });
    const requestMap = {};
    requests.forEach(r => { requestMap[r.course] = r; });

    // Get teacher names for all unique teacherIds
    const teacherIds = [...new Set(courses.map(c => c.teacherId))];
    const teachers = await Teacher.find({ teacherId: { $in: teacherIds } }).select('teacherId name');
    const teacherNameMap = {};
    teachers.forEach(t => { teacherNameMap[t.teacherId] = t.name; });

    const courseCodes = courses.map(c => c.courseCode);

    // Fetch all records for this student and all matching courses in bulk
    const [
      allAttendances,
      allReports,
      allPerformances,
      allQuizzes,
      allTests,
      allOthers,
      allCourseAttendances
    ] = await Promise.all([
      Attendance.find({ student: student._id, course: { $in: courseCodes } }),
      Report.find({ student: student._id, course: { $in: courseCodes } }),
      Performance.find({ student: student._id, course: { $in: courseCodes } }),
      Quiz.find({ student: student._id, course: { $in: courseCodes } }),
      Test.find({ student: student._id, course: { $in: courseCodes } }),
      Others.find({ student: student._id, course: { $in: courseCodes } }),
      Attendance.find({ course: { $in: courseCodes } })
    ]);

    // Group records by courseCode for instant memory lookup
    const attByCourse    = {};
    const repByCourse    = {};
    const perfByCourse   = {};
    const quizByCourse   = {};
    const testByCourse   = {};
    const otherByCourse  = {};
    const allAttByCourse = {};

    courseCodes.forEach(code => {
      attByCourse[code]    = [];
      repByCourse[code]    = [];
      perfByCourse[code]   = [];
      quizByCourse[code]   = [];
      testByCourse[code]   = [];
      otherByCourse[code]  = [];
      allAttByCourse[code] = [];
    });

    allAttendances.forEach(a  => { if (attByCourse[a.course])    attByCourse[a.course].push(a); });
    allReports.forEach(r      => { if (repByCourse[r.course])    repByCourse[r.course].push(r); });
    allPerformances.forEach(p => { if (perfByCourse[p.course])   perfByCourse[p.course].push(p); });
    allQuizzes.forEach(q      => { if (quizByCourse[q.course])   quizByCourse[q.course].push(q); });
    allTests.forEach(t        => { if (testByCourse[t.course])   testByCourse[t.course].push(t); });
    allOthers.forEach(o       => { if (otherByCourse[o.course])  otherByCourse[o.course].push(o); });
    allCourseAttendances.forEach(a => { if (allAttByCourse[a.course]) allAttByCourse[a.course].push(a); });

    // Build response with summary calculations
    const result = courses.map(course => {
      const courseCode = course.courseCode;
      const cfg        = resolveConfig(course);

      const attendances  = attByCourse[courseCode]   || [];
      const reports      = repByCourse[courseCode]   || [];
      const performances = perfByCourse[courseCode]  || [];
      const quizzes      = quizByCourse[courseCode]  || [];
      const tests        = testByCourse[courseCode]  || [];
      const others       = otherByCourse[courseCode] || [];
      const allAtt       = allAttByCourse[courseCode] || [];

      const uniqueDates   = [...new Set(allAtt.map(a => a.dayName))];
      const totalClasses  = uniqueDates.length || 1;

      // Attendance percentage
      const presentCount = attendances.filter(a => a.status === 'Present').length;
      const attPct       = (presentCount / totalClasses) * 100;
      const attMark      = getPercentageMark(attPct, cfg.attendance);

      // Report percentage
      const submittedCount = reports.filter(r => r.status === 'Submitted').length;
      const repPct         = (submittedCount / totalClasses) * 100;
      const repMark        = getPercentageMark(repPct, cfg.report);

      // Performance average
      const perfMark = performances.length > 0
        ? Math.round((performances.reduce((s, p) => s + p.marks, 0) / performances.length) * 100) / 100
        : 0;

      // Quiz, Test, Others
      const quizMark  = quizzes.length > 0 ? quizzes[quizzes.length - 1].marks : 0;
      const testMark  = tests.length > 0 ? tests[tests.length - 1].marks : 0;
      const otherMark = Math.min(others.reduce((s, o) => s + o.marks, 0), cfg.others);

      // Total out of 75
      const totalMark = Math.round((attMark + repMark + perfMark + quizMark + testMark + otherMark) * 100) / 100;

      return {
        _id:         course._id,
        courseCode:   course.courseCode,
        courseName:  course.courseName,
        series:      course.series,
        department:  course.department,
        teacherId:   course.teacherId,
        teacherName: teacherNameMap[course.teacherId] || course.teacherId,
        attendancePercentage: Math.round(attPct),
        totalMarks: totalMark,
        request:     requestMap[course.courseCode]
          ? {
              _id:    requestMap[course.courseCode]._id,
              status: requestMap[course.courseCode].status
            }
          : null
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get full marks breakdown for a student in a course (only if Accepted)
// @route   GET /api/student/marks/:courseCode
const getStudentMarks = async (req, res) => {
  try {
    const studentId  = req.user._id;
    const courseCode  = req.params.courseCode;

    // Check that student has an Accepted request for this course
    const request = await Request.findOne({
      student: studentId,
      course:  courseCode,
      status:  'Accepted'
    });
    if (!request) {
      return res.status(403).json({ message: 'Marks access not granted. Request approval from your teacher first.' });
    }

    // Get course info (includes assessmentConfig)
    const course = await Course.findOne({ courseCode, department: req.user.department, series: req.user.series });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const cfg = resolveConfig(course);

    // Get teacher name
    const teacher = await Teacher.findOne({ teacherId: course.teacherId }).select('name teacherId');

    // Fetch all records for this student + course
    const attendances  = await Attendance.find({ student: studentId, course: courseCode }).sort({ date: 1 });
    const reports      = await Report.find({ student: studentId, course: courseCode }).sort({ date: 1 });
    const performances = await Performance.find({ student: studentId, course: courseCode }).sort({ date: 1 });
    const quizzes      = await Quiz.find({ student: studentId, course: courseCode });
    const tests        = await Test.find({ student: studentId, course: courseCode });
    const others       = await Others.find({ student: studentId, course: courseCode });

    // Also fetch ALL attendance for this course to get total classes
    const allAttendance = await Attendance.find({ course: courseCode });
    const uniqueDates   = [...new Set(allAttendance.map(a => a.dayName))];
    const totalClasses  = uniqueDates.length || 1;

    // ── Calculate marks ─────────────────────────────────────────────
    // Attendance (max = cfg.attendance)
    const presentCount = attendances.filter(a => a.status === 'Present').length;
    const attPct       = (presentCount / totalClasses) * 100;
    const attMark      = getPercentageMark(attPct, cfg.attendance);

    // Report (max = cfg.report)
    const submittedCount = reports.filter(r => r.status === 'Submitted').length;
    const repPct         = (submittedCount / totalClasses) * 100;
    const repMark        = getPercentageMark(repPct, cfg.report);

    // Performance (max = cfg.performance) — average
    const perfMark = performances.length > 0
      ? Math.round((performances.reduce((s, p) => s + p.marks, 0) / performances.length) * 100) / 100
      : 0;

    // Quiz (max = cfg.quiz) — latest record
    const quizMark = quizzes.length > 0 ? quizzes[quizzes.length - 1].marks : 0;

    // Test (max = cfg.test) — latest record
    const testMark = tests.length > 0 ? tests[tests.length - 1].marks : 0;

    // Others (max = cfg.others) — sum capped at configured max
    const otherMark = Math.min(others.reduce((s, o) => s + o.marks, 0), cfg.others);

    // Total out of 75
    const totalMark = Math.round((attMark + repMark + perfMark + quizMark + testMark + otherMark) * 100) / 100;

    res.json({
      course: {
        courseCode:   course.courseCode,
        courseName:  course.courseName,
        series:      course.series,
        department:  course.department,
        teacherName: teacher?.name || course.teacherId,
        teacherId:   course.teacherId,
      },
      marks: {
        attendance:  { mark: attMark,   max: cfg.attendance,  percentage: Math.round(attPct),  present: presentCount,    total: totalClasses },
        report:      { mark: repMark,   max: cfg.report,      percentage: Math.round(repPct),  submitted: submittedCount, total: totalClasses },
        performance: { mark: perfMark,  max: cfg.performance },
        quiz:        { mark: quizMark,  max: cfg.quiz },
        test:        { mark: testMark,  max: cfg.test },
        others:      { mark: otherMark, max: cfg.others },
      },
      totalMark,
      totalMax: 75,
      config: cfg,
      records: {
        attendances,
        reports,
        performances,
        quizzes,
        tests,
        others,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getStudentCourses, getStudentMarks };
