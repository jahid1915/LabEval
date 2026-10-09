/**
 * Head Course Offering Controller
 * Implements Department Head course offering workflow:
 * - Semester course catalog inspection with offering & assignment status
 * - Series, session, semester course offering creation
 * - Debounced teacher autocomplete
 * - Eligible student preview
 * - Atomic activation & automatic enrollment synchronization
 * - Course offering cancellation & history
 */

const Course = require('../models/Course');
const SessionalCourse = require('../models/SessionalCourse');
const ElectiveCourse = require('../models/ElectiveCourse');
const CourseOffering = require('../models/CourseOffering');
const TeacherAssignment = require('../models/TeacherAssignment');
const Department = require('../models/Department');
const AcademicSession = require('../models/AcademicSession');
const Series = require('../models/Series');
const Semester = require('../models/Semester');
const { getEligibleStudentsForOffering } = require('../services/academicEligibilityService');
const { syncEnrollmentsForOffering, cancelOfferingEnrollments } = require('../services/enrollmentConsistencyService');
const { assignTeacherToOffering, searchDepartmentTeachers } = require('../services/teachingAssignmentService');
const { logAudit } = require('../middleware/auditMiddleware');
const { normalizeSemesterLevel, parseCourseCode } = require('../utils/courseCodeParser');

const getHeadDept = (req) => {
  return (req.user?.departmentCode || req.user?.department || 'ETE').toUpperCase();
};

/**
 * GET /api/head/courses
 * Returns all master courses for the Head's department, annotated with active offering & teacher assignment status.
 */
const getHeadCourses = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const { semester, search } = req.query;

    const courseQuery = {
      departmentCode: deptCode,
      status: 'active'
    };

    if (semester && semester !== 'ALL') {
      const sClean = semester.trim();
      courseQuery.$or = [
        { semesterLevel: sClean },
        { semester: sClean },
        { semesterLevel: { $regex: sClean.replace(/semester/i, '').trim(), $options: 'i' } }
      ];
    }

    if (search && search.trim()) {
      const s = search.trim();
      courseQuery.$and = [
        {
          $or: [
            { courseCode: { $regex: s, $options: 'i' } },
            { courseName: { $regex: s, $options: 'i' } }
          ]
        }
      ];
    }

    const courses = await Course.find(courseQuery).sort({ semesterLevel: 1, courseCode: 1 }).lean();

    // Fetch active offerings for these courses in Head's department
    const courseIds = courses.map(c => c._id);
    const activeOfferings = await CourseOffering.find({
      course: { $in: courseIds },
      departmentCode: deptCode,
      status: 'active'
    }).sort({ createdAt: -1 }).lean();

    const offeringMap = new Map();
    activeOfferings.forEach(off => {
      const key = off.course.toString();
      if (!offeringMap.has(key)) offeringMap.set(key, off);
    });

    // Fetch active teacher assignments for these offerings
    const offeringIds = activeOfferings.map(o => o._id);
    const assignments = await TeacherAssignment.find({
      courseOffering: { $in: offeringIds },
      status: 'active'
    }).populate('teacher', 'name teacherId designation avatarUrl').lean();

    const assignmentMap = new Map();
    assignments.forEach(a => {
      assignmentMap.set(a.courseOffering.toString(), a);
    });

    const enrichedCourses = courses.map(c => {
      const activeOff = offeringMap.get(c._id.toString());
      const activeAssign = activeOff ? assignmentMap.get(activeOff._id.toString()) : null;

      let offeringStatus = 'UNOFFERED';
      if (activeOff) {
        offeringStatus = activeAssign ? 'ACTIVE' : 'PENDING_TEACHER';
      }

      return {
        _id: c._id,
        courseCode: c.courseCode,
        courseTitle: c.courseName || c.courseTitle,
        courseName: c.courseName || c.courseTitle,
        credit: c.credit || c.creditHours || 3.0,
        courseType: c.courseType || 'Theory',
        isElective: Boolean(c.isElective),
        isSessional: Boolean(c.isSessional),
        semesterLevel: c.semesterLevel || semester || 'General',
        departmentCode: c.departmentCode,
        offeringStatus,
        activeOffering: activeOff ? {
          _id: activeOff._id,
          series: activeOff.seriesName,
          session: activeOff.sessionName,
          semester: activeOff.semesterName,
          studentCount: activeOff.enrollmentCount || 0,
          status: activeOff.status
        } : null,
        assignedTeacher: activeAssign ? {
          teacherId: activeAssign.teacherId,
          name: activeAssign.teacherName || activeAssign.teacher?.name,
          designation: activeAssign.teacher?.designation || ''
        } : null
      };
    });

    return res.json({
      success: true,
      department: deptCode,
      courses: enrichedCourses
    });
  } catch (error) {
    console.error('getHeadCourses error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/head/course-offerings
 * Lists all course offerings for Head's department (current and past).
 */
const getHeadCourseOfferings = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const { status, series, session, semester } = req.query;

    const query = { departmentCode: deptCode };
    if (status) query.status = status;
    if (series) query.seriesName = series;
    if (session) query.sessionName = session;
    if (semester) query.semesterName = semester;

    const offerings = await CourseOffering.find(query)
      .populate('course')
      .sort({ createdAt: -1 })
      .lean();

    const offeringIds = offerings.map(o => o._id);
    const assignments = await TeacherAssignment.find({
      courseOffering: { $in: offeringIds },
      status: 'active'
    }).populate('teacher', 'name teacherId designation').lean();

    const assignMap = new Map();
    assignments.forEach(a => assignMap.set(a.courseOffering.toString(), a));

    const result = offerings.map(off => ({
      ...off,
      teacherAssignment: assignMap.get(off._id.toString()) || null
    }));

    return res.json({ success: true, offerings: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/head/course-offerings
 * Creates a course offering and optionally assigns teacher and activates immediately.
 */
const createCourseOffering = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const {
      courseId,
      academicSession, // e.g. "2022-2023"
      series,          // e.g. "22"
      semester,        // e.g. "5th Semester"
      teacherId,       // optional teacher to assign immediately
      activate = true
    } = req.body;

    if (!courseId || !series) {
      return res.status(400).json({ success: false, message: 'courseId and series are required' });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course Master record not found' });

    if (course.departmentCode && course.departmentCode.toUpperCase() !== deptCode) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Course belongs to another department' });
    }

    const cleanSeries = String(series).trim();
    const cleanSession = academicSession ? String(academicSession).trim() : `20${cleanSeries}-20${parseInt(cleanSeries) + 1}`;
    const cleanSemester = semester ? String(semester).trim() : (course.semesterLevel ? `${course.semesterLevel} Semester` : '1st Semester');

    // Check duplicate offering constraint
    const existing = await CourseOffering.findOne({
      course: course._id,
      departmentCode: deptCode,
      seriesName: cleanSeries,
      sessionName: cleanSession,
      semesterName: cleanSemester,
      status: { $ne: 'cancelled' }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_OFFERING',
          message: `This course (${course.courseCode}) is already offered to Series ${cleanSeries} for ${cleanSession} (${cleanSemester}).`
        }
      });
    }

    const deptDoc = await Department.findOne({ code: deptCode });
    const sessDoc = await AcademicSession.findOne({ name: cleanSession });
    const seriesDoc = await Series.findOne({ name: cleanSeries, departmentCode: deptCode });

    // Create CourseOffering record
    const offering = await CourseOffering.create({
      course: course._id,
      courseCode: course.courseCode,
      courseName: course.courseName,
      department: deptDoc ? deptDoc._id : null,
      departmentCode: deptCode,
      series: seriesDoc ? seriesDoc._id : null,
      seriesName: cleanSeries,
      academicSession: sessDoc ? sessDoc._id : null,
      sessionName: cleanSession,
      semesterName: cleanSemester,
      status: activate ? 'active' : 'draft',
      enrollmentSyncStatus: 'IDLE',
      createdBy: req.user?._id
    });

    // Assign teacher if provided
    let teacherAssignment = null;
    if (teacherId) {
      teacherAssignment = await assignTeacherToOffering({
        courseOfferingId: offering._id,
        teacherId,
        role: 'PRIMARY_TEACHER',
        assignedBy: req.user,
        req
      });
    }

    // Automatically synchronize student enrollments if activate is true
    let syncResult = null;
    if (activate) {
      syncResult = await syncEnrollmentsForOffering(offering._id);
    }

    await logAudit({
      req,
      action: 'COURSE_OFFERING_CREATED',
      entity: 'CourseOffering',
      entityId: offering._id,
      details: `Created offering for ${offering.courseCode} Series ${offering.seriesName} (${offering.semesterName})`
    });

    return res.status(201).json({
      success: true,
      offering,
      teacherAssignment,
      syncResult,
      message: `Course offering ${offering.courseCode} created successfully.`
    });
  } catch (error) {
    console.error('createCourseOffering error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/head/course-offerings/:id/eligible-students
 * Previews eligible students before or after activating an offering.
 */
const getEligibleStudentsPreview = async (req, res) => {
  try {
    const offering = await CourseOffering.findById(req.params.id);
    if (!offering) return res.status(404).json({ success: false, message: 'Offering not found' });

    const deptCode = getHeadDept(req);
    if (offering.departmentCode !== deptCode) {
      return res.status(403).json({ success: false, message: 'Unauthorized department access' });
    }

    const { page = 1, limit = 50 } = req.query;
    const skip = (Math.max(1, parseInt(page) || 1) - 1) * parseInt(limit || 50);

    const { total, students } = await getEligibleStudentsForOffering({
      departmentCode: offering.departmentCode,
      series: offering.seriesName,
      academicSession: offering.sessionName,
      semester: offering.semesterName
    }, { skip, limit: parseInt(limit || 50) });

    return res.json({
      success: true,
      offeringId: offering._id,
      courseCode: offering.courseCode,
      seriesName: offering.seriesName,
      total,
      students
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/head/course-offerings/:id/activate
 * Activates offering and triggers idempotent enrollment consistency sync.
 */
const activateCourseOffering = async (req, res) => {
  try {
    const offering = await CourseOffering.findById(req.params.id);
    if (!offering) return res.status(404).json({ success: false, message: 'Offering not found' });

    const deptCode = getHeadDept(req);
    if (offering.departmentCode !== deptCode) {
      return res.status(403).json({ success: false, message: 'Unauthorized department access' });
    }

    const syncResult = await syncEnrollmentsForOffering(offering._id);

    await logAudit({
      req,
      action: 'COURSE_OFFERING_ACTIVATED',
      entity: 'CourseOffering',
      entityId: offering._id,
      details: `Activated offering for ${offering.courseCode} Series ${offering.seriesName}. Enrolled ${syncResult.finalEnrollmentCount} students.`
    });

    return res.json({
      success: true,
      offering,
      syncResult,
      message: `Course offering ${offering.courseCode} activated with ${syncResult.finalEnrollmentCount} students enrolled.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/head/course-offerings/:id/assign-teacher
 */
const assignTeacher = async (req, res) => {
  try {
    const { teacherId, role = 'PRIMARY_TEACHER' } = req.body;
    if (!teacherId) return res.status(400).json({ success: false, message: 'teacherId is required' });

    const offering = await CourseOffering.findById(req.params.id);
    if (!offering) return res.status(404).json({ success: false, message: 'Offering not found' });

    const deptCode = getHeadDept(req);
    if (offering.departmentCode !== deptCode) {
      return res.status(403).json({ success: false, message: 'Unauthorized department access' });
    }

    const assignment = await assignTeacherToOffering({
      courseOfferingId: offering._id,
      teacherId,
      role,
      assignedBy: req.user,
      req
    });

    return res.json({ success: true, assignment, message: `Teacher assigned successfully.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/head/course-offerings/:id/cancel
 */
const cancelOffering = async (req, res) => {
  try {
    const offering = await CourseOffering.findById(req.params.id);
    if (!offering) return res.status(404).json({ success: false, message: 'Offering not found' });

    const deptCode = getHeadDept(req);
    if (offering.departmentCode !== deptCode) {
      return res.status(403).json({ success: false, message: 'Unauthorized department access' });
    }

    const reason = req.body.reason || 'CANCELLED_BY_DEPARTMENT_HEAD';
    const result = await cancelOfferingEnrollments(offering._id, reason);

    await logAudit({
      req,
      action: 'COURSE_OFFERING_CANCELLED',
      entity: 'CourseOffering',
      entityId: offering._id,
      details: `Cancelled offering for ${offering.courseCode} Series ${offering.seriesName}. Reason: ${reason}`
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/head/teachers/search
 * Debounced search for teachers in Head's department.
 */
const searchTeachers = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const query = req.query.q || '';
    const teachers = await searchDepartmentTeachers(deptCode, query, 15);
    return res.json({ success: true, teachers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/head/courses/sessional
 * Lists all separated Sessional Courses for the Head's department with active offering status.
 */
const getHeadSessionalCourses = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const { semester, search, series } = req.query;

    const query = {
      departmentCode: deptCode,
      isActive: true
    };

    if (semester && semester !== 'ALL') {
      const norm = normalizeSemesterLevel(semester);
      query.$or = [
        { semesterLevel: norm },
        { semesterLevel: semester.trim() }
      ];
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$and = [
        {
          $or: [
            { courseCode: { $regex: s, $options: 'i' } },
            { courseTitle: { $regex: s, $options: 'i' } }
          ]
        }
      ];
    }

    const sessionalCourses = await SessionalCourse.find(query)
      .sort({ semesterLevel: 1, courseCode: 1 })
      .lean();

    // Enrich with active offerings and teacher assignments in this department
    const courseCodes = sessionalCourses.map(c => c.courseCode);
    const offeringQuery = {
      courseCode: { $in: courseCodes },
      departmentCode: deptCode,
      status: 'active'
    };
    if (series && series !== 'ALL') offeringQuery.seriesName = series.trim();

    const activeOfferings = await CourseOffering.find(offeringQuery).sort({ createdAt: -1 }).lean();
    const offeringMap = new Map();
    activeOfferings.forEach(off => {
      if (!offeringMap.has(off.courseCode)) offeringMap.set(off.courseCode, off);
    });

    const offeringIds = activeOfferings.map(o => o._id);
    const assignments = await TeacherAssignment.find({
      courseOffering: { $in: offeringIds },
      status: 'active'
    }).populate('teacher', 'name teacherId designation avatarUrl').lean();

    const assignmentMap = new Map();
    assignments.forEach(a => assignmentMap.set(a.courseOffering.toString(), a));

    const enriched = sessionalCourses.map(c => {
      const activeOff = offeringMap.get(c.courseCode);
      const activeAssign = activeOff ? assignmentMap.get(activeOff._id.toString()) : null;

      let offeringStatus = 'UNOFFERED';
      if (activeOff) {
        offeringStatus = activeAssign ? 'ACTIVE' : 'PENDING_TEACHER';
      }

      return {
        ...c,
        offeringStatus,
        activeOffering: activeOff ? {
          _id: activeOff._id,
          series: activeOff.seriesName,
          session: activeOff.sessionName,
          semester: activeOff.semesterName || activeOff.semesterLevel,
          studentCount: activeOff.enrollmentCount || 0,
          status: activeOff.status
        } : null,
        assignedTeacher: activeAssign ? {
          teacherId: activeAssign.teacherId,
          name: activeAssign.teacherName || activeAssign.teacher?.name,
          designation: activeAssign.teacher?.designation || ''
        } : null
      };
    });

    return res.json({
      success: true,
      department: deptCode,
      count: enriched.length,
      courses: enriched
    });
  } catch (error) {
    console.error('getHeadSessionalCourses error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/head/courses/elective
 * Lists all separated Elective Courses for the Head's department.
 */
const getHeadElectiveCourses = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const { semester, electiveGroup, search, series } = req.query;

    const query = {
      departmentCode: deptCode,
      isActive: true
    };

    if (semester && semester !== 'ALL') {
      const norm = normalizeSemesterLevel(semester);
      query.$or = [
        { semesterLevel: norm },
        { semesterLevel: semester.trim() }
      ];
    }

    if (electiveGroup && electiveGroup !== 'ALL') {
      query.electiveGroup = { $regex: electiveGroup.trim(), $options: 'i' };
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$and = [
        {
          $or: [
            { courseCode: { $regex: s, $options: 'i' } },
            { courseTitle: { $regex: s, $options: 'i' } }
          ]
        }
      ];
    }

    const electiveCourses = await ElectiveCourse.find(query)
      .sort({ electiveGroup: 1, semesterLevel: 1, courseCode: 1 })
      .lean();

    const courseCodes = electiveCourses.map(c => c.courseCode);
    const offeringQuery = {
      courseCode: { $in: courseCodes },
      departmentCode: deptCode,
      status: 'active'
    };
    if (series && series !== 'ALL') offeringQuery.seriesName = series.trim();

    const activeOfferings = await CourseOffering.find(offeringQuery).sort({ createdAt: -1 }).lean();
    const offeringMap = new Map();
    activeOfferings.forEach(off => {
      if (!offeringMap.has(off.courseCode)) offeringMap.set(off.courseCode, off);
    });

    const offeringIds = activeOfferings.map(o => o._id);
    const assignments = await TeacherAssignment.find({
      courseOffering: { $in: offeringIds },
      status: 'active'
    }).populate('teacher', 'name teacherId designation avatarUrl').lean();

    const assignmentMap = new Map();
    assignments.forEach(a => assignmentMap.set(a.courseOffering.toString(), a));

    const enriched = electiveCourses.map(c => {
      const activeOff = offeringMap.get(c.courseCode);
      const activeAssign = activeOff ? assignmentMap.get(activeOff._id.toString()) : null;

      let offeringStatus = 'UNOFFERED';
      if (activeOff) {
        offeringStatus = activeAssign ? 'ACTIVE' : 'PENDING_TEACHER';
      }

      return {
        ...c,
        offeringStatus,
        activeOffering: activeOff ? {
          _id: activeOff._id,
          series: activeOff.seriesName,
          session: activeOff.sessionName,
          semester: activeOff.semesterName || activeOff.semesterLevel,
          studentCount: activeOff.enrollmentCount || 0,
          status: activeOff.status
        } : null,
        assignedTeacher: activeAssign ? {
          teacherId: activeAssign.teacherId,
          name: activeAssign.teacherName || activeAssign.teacher?.name,
          designation: activeAssign.teacher?.designation || ''
        } : null
      };
    });

    return res.json({
      success: true,
      department: deptCode,
      count: enriched.length,
      courses: enriched
    });
  } catch (error) {
    console.error('getHeadElectiveCourses error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getHeadCourses,
  getHeadSessionalCourses,
  getHeadElectiveCourses,
  getHeadCourseOfferings,
  createCourseOffering,
  getEligibleStudentsPreview,
  activateCourseOffering,
  assignTeacher,
  cancelOffering,
  searchTeachers
};
