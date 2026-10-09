const mongoose = require('mongoose');
const Student = require('../models/Student');
const FinalEnrollment = require('../models/FinalEnrollment');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const Report = require('../models/Report');
const Performance = require('../models/Performance');
const Quiz = require('../models/Quiz');
const Test = require('../models/Test');
const Others = require('../models/Others');
const { resolveConfig, validateMark, ASSESSMENT_LIMITS } = require('../config/assessmentConfig');

// @desc  Get students by dept + series query or by course enrollment roster
// @route GET /api/teacher/students/any?department=ETE&series=22&courseId=ETE3221
// @route GET /api/teacher/students/:courseId (legacy)
//
// SECURITY: Teachers can only retrieve students from their own department.
// Admins and department heads have unrestricted access.
// A teacher cannot supply a foreign department to bypass this restriction.
const getStudentsByCourse = async (req, res) => {
  try {
    const { department, series, courseId: queryCourseId } = req.query;
    const courseId = req.params.courseId || queryCourseId;

    // ── Authorization: scope department to the authenticated teacher ────────
    const isAdmin = ['admin', 'super_admin', 'department_head'].includes(req.user.role);
    const teacherDept = (
      req.user.department ||
      req.user.departmentCode ||
      req.user.teacherProfile?.department ||
      ''
    ).trim().toUpperCase();

    let resolvedDept;
    if (isAdmin) {
      // Admins can query any department they specify, or all if none specified
      resolvedDept = department ? department.toUpperCase() : null;
    } else {
      // Teachers: ignore client-supplied department if it doesn't match their own
      if (!teacherDept) {
        return res.status(403).json({
          success: false,
          message: 'Teacher department not configured. Contact administrator.',
          code: 'TEACHER_DEPT_MISSING'
        });
      }
      if (department && department.toUpperCase() !== teacherDept) {
        return res.status(403).json({
          success: false,
          message: `Access denied: You can only access students in your department (${teacherDept}).`,
          code: 'DEPARTMENT_ISOLATION_VIOLATION'
        });
      }
      resolvedDept = teacherDept;
    }

    // If a course is specified, check if it has approved elective enrollments in FinalEnrollment
    if (courseId && courseId !== 'any') {
      const cleanCourse = courseId.trim();
      const courseDoc = await Course.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(cleanCourse) ? [{ _id: cleanCourse }] : []),
          { courseCode: cleanCourse.toUpperCase() }
        ]
      });

      if (courseDoc) {
        const enrollments = await FinalEnrollment.find({
          courseId: courseDoc._id,
          status: 'active'
        }).populate('studentId').lean();

        if (enrollments.length > 0) {
          let enrolledStudents = enrollments
            .map(e => e.studentId)
            .filter(Boolean);

          // Enforce department scope on enrollment results too
          if (resolvedDept) {
            enrolledStudents = enrolledStudents.filter(
              s => (s.department || '').toUpperCase() === resolvedDept
            );
          }

          return res.json(
            enrolledStudents
              .sort((a, b) => (a.rollNumber > b.rollNumber ? 1 : -1))
              .map(s => ({
                _id: s._id,
                name: s.name,
                rollNumber: s.rollNumber,
                department: s.department,
                series: s.series,
                section: s.section,
                status: s.status
              }))
          );
        }
      }
    }

    // Fallback: query students by dept/series with enforced scope
    const query = { status: 'active' };
    if (resolvedDept) query.department = resolvedDept;
    if (series)       query.series     = series;

    if (!resolvedDept && !series) {
      // Would return ALL students — deny for non-admins, return empty for safety
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Department scope is required to fetch students.',
          code: 'SCOPE_REQUIRED'
        });
      }
    }

    const students = await Student.find(query)
      .select('name rollNumber department series section status')
      .sort({ rollNumber: 1 })
      .lean();

    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ── Bulk Attendance + Report save ─────────────────────────────────
// @desc  Save attendance + auto-report for all students in one request via single bulkWrite
// @route POST /api/teacher/attendance/bulk
// @body  { courseId, date, dayName, records: [{ studentId, attended, reportSubmitted }] }
const bulkSaveAttendance = async (req, res) => {
  try {
    const { courseId, date, dayName, records } = req.body;
    if (!courseId || !date || !dayName || !Array.isArray(records)) {
      return res.status(400).json({ message: 'courseId, date, dayName, and records[] are required' });
    }

    const dateObj = new Date(date);
    const attendanceOps = [];
    const reportOps = [];

    for (const { studentId, attended, reportSubmitted } of records) {
      if (!studentId) continue;
      const attStatus = attended ? 'Present' : 'Absent';
      const repStatus = reportSubmitted ? 'Submitted' : 'Not Submitted';

      attendanceOps.push({
        updateOne: {
          filter: { student: studentId, course: courseId, dayName },
          update: {
            $set: {
              student: studentId,
              course: courseId,
              date: dateObj,
              dayName,
              status: attStatus,
              teacher: req.user._id
            }
          },
          upsert: true
        }
      });

      reportOps.push({
        updateOne: {
          filter: { student: studentId, course: courseId, dayName },
          update: {
            $set: {
              student: studentId,
              course: courseId,
              date: dateObj,
              dayName,
              status: repStatus,
              teacher: req.user._id
            }
          },
          upsert: true
        }
      });
    }

    await Promise.all([
      attendanceOps.length > 0 ? Attendance.bulkWrite(attendanceOps, { ordered: false }) : Promise.resolve(),
      reportOps.length > 0 ? Report.bulkWrite(reportOps, { ordered: false }) : Promise.resolve()
    ]);

    res.json({ message: 'Attendance and reports saved successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Generic upsert for single-record models ────────────────────────
const saveLabRecord = async (req, res, Model) => {
  try {
    const { studentId, courseId, date, marks, status, type, dayName } = req.body;

    // ── Server-side marks validation (reject, do NOT silently clamp) ─────
    if (marks !== undefined && marks !== null) {
      const CourseOffering = require('../models/CourseOffering');
      const cleanCourse = (courseId || '').trim().toUpperCase();
      const courseDoc = await Course.findOne({ courseCode: cleanCourse })
                     || await CourseOffering.findOne({ courseCode: cleanCourse });
      const cfg = resolveConfig(courseDoc);

      // Map model name → config key → max limit
      const componentMap = {
        Performance: 'performance',
        Quiz:        'quiz',
        Test:        'test',
        Others:      'others',
      };
      const configKey = componentMap[Model.modelName];
      if (configKey) {
        const err = validateMark(marks, configKey, cfg);
        if (err) {
          return res.status(400).json({ success: false, message: err, code: 'MARKS_VALIDATION_ERROR' });
        }
      }
    }

    let query = { student: studentId, course: courseId };
    if (dayName) query.dayName = dayName;
    if (type)    query.type    = type;

    let record = await Model.findOne(query);
    if (record) {
      if (marks  !== undefined) record.marks  = marks;
      if (status !== undefined) record.status = status;
      record.teacher = req.user._id;
      await record.save();
    } else {
      const data = { student: studentId, course: courseId, teacher: req.user._id, date: date || new Date() };
      if (marks  !== undefined) data.marks  = marks;
      if (status !== undefined) data.status = status;
      if (type   !== undefined) data.type   = type;
      if (dayName !== undefined) data.dayName = dayName;
      record = await Model.create(data);
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const saveAttendance  = (req, res) => saveLabRecord(req, res, Attendance);
const saveReport      = (req, res) => saveLabRecord(req, res, Report);
const savePerformance = (req, res) => saveLabRecord(req, res, Performance);
const saveQuiz        = (req, res) => saveLabRecord(req, res, Quiz);
const saveTest        = (req, res) => saveLabRecord(req, res, Test);
const saveOthers      = (req, res) => saveLabRecord(req, res, Others);

// @desc  Get Lab Records by model name
// @route GET /api/teacher/records/:model/:courseId
const getRecords = async (req, res) => {
  try {
    const { model, courseId } = req.params;
    const modelMap = {
      attendance:  Attendance,
      report:      Report,
      performance: Performance,
      quiz:        Quiz,
      test:        Test,
      others:      Others,
    };
    const ModelToUse = modelMap[model.toLowerCase()];
    if (!ModelToUse) return res.status(400).json({ message: 'Invalid model type' });

    const records = await ModelToUse.find({ course: courseId })
      .populate('student', 'name rollNumber')
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStudentsByCourse,
  bulkSaveAttendance,
  saveAttendance,
  saveReport,
  savePerformance,
  saveQuiz,
  saveTest,
  saveOthers,
  getRecords,
};
