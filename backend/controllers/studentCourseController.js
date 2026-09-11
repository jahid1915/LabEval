const Course      = require('../models/Course');
const CourseOffering = require('../models/CourseOffering');
const TeacherAssignment = require('../models/TeacherAssignment');
const Teacher     = require('../models/Teacher');
const Request     = require('../models/Request');
const Attendance  = require('../models/Attendance');
const Report      = require('../models/Report');
const Performance = require('../models/Performance');
const Quiz        = require('../models/Quiz');
const Test        = require('../models/Test');
const Others      = require('../models/Others');

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

// @desc    Get all courses matching student's department & series, with request status and summary metrics
// @route   GET /api/student/courses
const getStudentCourses = async (req, res) => {
  try {
    const student = req.user;
    const { department, series } = student;
    const cleanDept = department.toUpperCase();

    // 1. Fetch CourseOfferings for this dept & series
    const offerings = await CourseOffering.find({
      departmentCode: cleanDept,
      seriesName: series,
      status: 'active'
    }).sort({ createdAt: -1 });

    // 2. Fetch legacy courses
    const legacyCourses = await Course.find({
      department: cleanDept,
      series: series
    }).sort({ createdAt: -1 });

    // Build unified course list
    const combinedCourses = [];
    offerings.forEach(off => {
      combinedCourses.push({
        _id: off._id,
        offeringId: off._id,
        courseCode: off.courseCode,
        courseName: off.courseName,
        series: off.seriesName,
        department: off.departmentCode,
        sessionName: off.sessionName,
        semesterName: off.semesterName,
        assessmentConfig: off.assessmentConfig || DEFAULT_CONFIG,
        isMarksPublished: off.isMarksPublished,
        isOffering: true
      });
    });

    legacyCourses.forEach(lc => {
      if (!combinedCourses.some(c => c.courseCode === lc.courseCode)) {
        combinedCourses.push({
          _id: lc._id,
          courseCode: lc.courseCode,
          courseName: lc.courseName,
          series: lc.series,
          department: lc.departmentCode || lc.department,
          teacherId: lc.teacherId,
          assessmentConfig: lc.assessmentConfig || DEFAULT_CONFIG,
          isMarksPublished: false,
          isOffering: false
        });
      }
    });

    const courseCodes = combinedCourses.map(c => c.courseCode);

    // Get all requests by this student
    const requests = await Request.find({ student: student._id });
    const requestMap = {};
    requests.forEach(r => { requestMap[r.course] = r; });

    // Fetch teacher assignments for offerings
    const offeringIds = offerings.map(o => o._id);
    const assignments = await TeacherAssignment.find({ courseOffering: { $in: offeringIds }, status: 'active' })
      .populate('teacher', 'name teacherId designation');
    
    const offeringTeacherMap = {};
    assignments.forEach(a => {
      offeringTeacherMap[a.courseOffering.toString()] = a.teacher?.name || a.teacherId;
    });

    // Bulk fetch evaluation records
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

    const result = combinedCourses.map(course => {
      const courseCode = course.courseCode;
      const cfg = resolveConfig(course);

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

      const totalMark = Math.round((attMark + repMark + perfMark + quizMark + testMark + otherMark) * 100) / 100;

      const teacherName = course.offeringId 
        ? (offeringTeacherMap[course.offeringId.toString()] || 'Faculty Assigned')
        : (course.teacherId || 'Faculty');

      return {
        _id:         course._id,
        offeringId:  course.offeringId,
        courseCode:  course.courseCode,
        courseName:  course.courseName,
        series:      course.series,
        department:  course.department,
        teacherName,
        isMarksPublished: !!course.isMarksPublished,
        attendancePercentage: Math.round(attPct),
        totalMarks: totalMark,
        request: requestMap[course.courseCode]
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

// @desc    Get full marks breakdown for a student in a course
// @route   GET /api/student/marks/:courseCode
const getStudentMarks = async (req, res) => {
  try {
    const studentId  = req.user._id;
    const courseCode = req.params.courseCode.trim().toUpperCase();

    // Check course offering or legacy course
    const offering = await CourseOffering.findOne({
      courseCode,
      departmentCode: req.user.department,
      seriesName: req.user.series
    });

    const isPublished = offering?.isMarksPublished;

    // Check request status
    const request = await Request.findOne({
      student: studentId,
      course:  courseCode,
      status:  'Accepted'
    });

    // If neither published nor request accepted, require request
    if (!isPublished && !request) {
      return res.status(403).json({
        message: 'Marks access not granted yet. The teacher will publish marks soon, or you may request access.'
      });
    }

    const cfg = resolveConfig(offering || await Course.findOne({ courseCode }));

    // Fetch records
    const attendances  = await Attendance.find({ student: studentId, course: courseCode }).sort({ date: 1 });
    const reports      = await Report.find({ student: studentId, course: courseCode }).sort({ date: 1 });
    const performances = await Performance.find({ student: studentId, course: courseCode }).sort({ date: 1 });
    const quizzes      = await Quiz.find({ student: studentId, course: courseCode });
    const tests        = await Test.find({ student: studentId, course: courseCode });
    const others       = await Others.find({ student: studentId, course: courseCode });

    const allAttendance = await Attendance.find({ course: courseCode });
    const uniqueDates   = [...new Set(allAttendance.map(a => a.dayName))];
    const totalClasses  = uniqueDates.length || 1;

    // Attendance
    const presentCount = attendances.filter(a => a.status === 'Present').length;
    const attPct       = (presentCount / totalClasses) * 100;
    const attMark      = getPercentageMark(attPct, cfg.attendance);

    // Report
    const submittedCount = reports.filter(r => r.status === 'Submitted').length;
    const repPct         = (submittedCount / totalClasses) * 100;
    const repMark        = getPercentageMark(repPct, cfg.report);

    // Performance
    const perfMark = performances.length > 0
      ? Math.round((performances.reduce((s, p) => s + p.marks, 0) / performances.length) * 100) / 100
      : 0;

    // Quiz, Test, Others
    const quizMark  = quizzes.length > 0 ? quizzes[quizzes.length - 1].marks : 0;
    const testMark  = tests.length > 0 ? tests[tests.length - 1].marks : 0;
    const otherMark = Math.min(others.reduce((s, o) => s + o.marks, 0), cfg.others);

    const totalMark = Math.round((attMark + repMark + perfMark + quizMark + testMark + otherMark) * 100) / 100;

    res.json({
      course: {
        courseCode:  offering?.courseCode || courseCode,
        courseName:  offering?.courseName || courseCode,
        series:      offering?.seriesName || req.user.series,
        department:  offering?.departmentCode || req.user.department,
        isMarksPublished: !!isPublished
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
