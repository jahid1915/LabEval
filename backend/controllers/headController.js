const mongoose = require('mongoose');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const CourseOffering = require('../models/CourseOffering');
const TeacherAssignment = require('../models/TeacherAssignment');
const Department = require('../models/Department');
const Series = require('../models/Series');
const AcademicSession = require('../models/AcademicSession');
const Attendance = require('../models/Attendance');
const Performance = require('../models/Performance');
const User = require('../models/User');
const { logAudit } = require('../middleware/auditMiddleware');
const bcrypt = require('bcryptjs');

/**
 * Helper to get the strictly isolated department code of the authenticated Department Head.
 * Never trust client-provided department parameters.
 */
const getHeadDept = (req) => {
  if (!req.user) return null;
  return req.user.departmentCode ? req.user.departmentCode.toUpperCase() : (req.user.department ? req.user.department.toUpperCase() : null);
};

// ── GET /api/head/stats ───────────────────────────────────────────────
const getHeadDashboardStats = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    if (!deptCode) {
      return res.status(403).json({ success: false, message: 'Department head profile has no assigned department' });
    }

    const deptDoc = await Department.findOne({ code: deptCode }).populate('faculty', 'name code').lean();

    const [
      totalStudents,
      activeStudents,
      totalTeachers,
      totalCourses,
      totalSeries,
      sessionSummary
    ] = await Promise.all([
      Student.countDocuments({ department: deptCode }),
      Student.countDocuments({ department: deptCode, status: 'active' }),
      Teacher.countDocuments({ department: deptCode }),
      Course.countDocuments({ departmentCode: deptCode, status: 'active' }),
      Series.countDocuments({ departmentCode: deptCode }),
      Student.aggregate([
        { $match: { department: deptCode } },
        {
          $group: {
            _id: { session: '$session', series: '$series' },
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            inactive: { $sum: { $cond: [{ $ne: ['$status', 'active'] }, 1, 0] } }
          }
        },
        { $sort: { '_id.session': -1, '_id.series': -1 } }
      ])
    ]);

    // Group session summary by session name
    const sessionMap = new Map();
    sessionSummary.forEach(item => {
      const sessName = item._id.session || 'Unassigned Session';
      const seriesVal = item._id.series || 'N/A';
      if (!sessionMap.has(sessName)) {
        sessionMap.set(sessName, {
          sessionName: sessName,
          totalStudents: 0,
          activeStudents: 0,
          inactiveStudents: 0,
          series: []
        });
      }
      const sObj = sessionMap.get(sessName);
      sObj.totalStudents += item.total;
      sObj.activeStudents += item.active;
      sObj.inactiveStudents += item.inactive;
      sObj.series.push({
        series: seriesVal,
        total: item.total,
        active: item.active,
        inactive: item.inactive
      });
    });

    res.json({
      success: true,
      department: {
        code: deptCode,
        name: deptDoc?.name || `${deptCode} Department`,
        facultyName: deptDoc?.faculty?.name || 'Faculty of Electrical & Computer Engineering'
      },
      stats: {
        totalStudents,
        activeStudents,
        totalTeachers,
        totalCourses,
        totalSeries,
        academicSessionsCount: sessionMap.size
      },
      academicSessions: Array.from(sessionMap.values())
    });
  } catch (error) {
    console.error('getHeadDashboardStats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/head/academic-sessions ───────────────────────────────────
const getHeadAcademicSessions = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    if (!deptCode) {
      return res.status(403).json({ success: false, message: 'Unauthorized department access' });
    }

    const [allSessions, seriesList, studentAgg] = await Promise.all([
      AcademicSession.find().sort({ year: -1 }).lean(),
      Series.find({ departmentCode: deptCode }).lean(),
      Student.aggregate([
        { $match: { department: deptCode } },
        {
          $group: {
            _id: { session: '$session', series: '$series', status: '$status' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Aggregate counts by session and series
    const sessionMap = new Map();

    // Initialize with registered academic sessions
    allSessions.forEach(as => {
      sessionMap.set(as.name, {
        _id: as._id,
        name: as.name,
        year: as.year,
        isCurrent: as.isCurrent,
        status: as.status,
        department: deptCode,
        totalStudents: 0,
        activeStudents: 0,
        inactiveStudents: 0,
        seriesList: []
      });
    });

    // Helper to normalize academic session string (e.g., '2022-23' -> '2022-2023')
    const normalizeSessionStr = (val) => {
      if (!val) return '';
      const s = String(val).trim();
      const m = s.match(/^(\d{4})-(\d{2})$/);
      if (m) {
        const century = m[1].slice(0, 2);
        return `${m[1]}-${century}${m[2]}`;
      }
      return s;
    };

    studentAgg.forEach(item => {
      const sess = item._id.session;
      if (!sess) return;
      const normalizedSess = normalizeSessionStr(sess);

      let targetKey = sess;
      if (!sessionMap.has(targetKey)) {
        for (const [key, obj] of sessionMap.entries()) {
          if (normalizeSessionStr(obj.name) === normalizedSess) {
            targetKey = key;
            break;
          }
        }
      }

      if (!sessionMap.has(targetKey)) {
        sessionMap.set(sess, {
          _id: sess,
          name: sess,
          department: deptCode,
          isCurrent: false,
          totalStudents: 0,
          activeStudents: 0,
          inactiveStudents: 0,
          seriesList: []
        });
        targetKey = sess;
      }
      const sObj = sessionMap.get(targetKey);
      sObj.totalStudents += item.count;
      if (item._id.status === 'active') {
        sObj.activeStudents += item.count;
      } else {
        sObj.inactiveStudents += item.count;
      }

      let sItem = sObj.seriesList.find(x => x.series === item._id.series);
      if (!sItem) {
        sItem = { series: item._id.series, count: 0, active: 0, inactive: 0 };
        sObj.seriesList.push(sItem);
      }
      sItem.count += item.count;
      if (item._id.status === 'active') sItem.active += item.count;
      else sItem.inactive += item.count;
    });

    res.json({
      success: true,
      department: deptCode,
      sessions: Array.from(sessionMap.values())
    });
  } catch (error) {
    console.error('getHeadAcademicSessions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/head/academic-sessions/:sessionId/students ───────────────
const getHeadSessionStudents = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    if (!deptCode) {
      return res.status(403).json({ success: false, message: 'Unauthorized department access' });
    }

    const { sessionId } = req.params;
    const { series, semester, status, search, page = 1, limit = 50 } = req.query;

    let targetSessionName = sessionId;
    let sessionDoc = null;

    if (mongoose.Types.ObjectId.isValid(sessionId)) {
      sessionDoc = await AcademicSession.findById(sessionId).lean();
      if (sessionDoc) targetSessionName = sessionDoc.name;
    } else {
      sessionDoc = await AcademicSession.findOne({
        $or: [
          { name: sessionId },
          { name: sessionId.replace('-20', '-') },
          { name: sessionId.replace('-', '-20') }
        ]
      }).lean();
    }

    const query = { department: deptCode };

    if (sessionDoc) {
      query.$or = [
        { academicSessionRef: sessionDoc._id },
        { session: sessionDoc.name },
        { session: targetSessionName }
      ];
    } else {
      query.session = targetSessionName;
    }

    if (series) query.series = series;
    if (semester) query.semester = semester;
    if (status) query.status = status;

    if (search && search.trim()) {
      const s = search.trim();
      const searchOr = [
        { name: { $regex: s, $options: 'i' } },
        { rollNumber: { $regex: s, $options: 'i' } },
        { registrationNumber: { $regex: s, $options: 'i' } }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [total, students] = await Promise.all([
      Student.countDocuments(query),
      Student.find(query)
        .select('-password -enrolledCourses -__v')
        .sort({ rollNumber: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    // Breakdown for this session in this department
    const seriesStats = await Student.aggregate([
      { $match: { department: deptCode, session: targetSessionName } },
      {
        $group: {
          _id: '$series',
          count: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      department: deptCode,
      sessionName: targetSessionName,
      session: sessionDoc,
      students,
      seriesStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('getHeadSessionStudents error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/head/students ────────────────────────────────────────────
const getHeadStudents = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    if (!deptCode) {
      return res.status(403).json({ success: false, message: 'Unauthorized department access' });
    }

    const {
      series, session, semester, status, regularStatus, section,
      search, page = 1, limit = 25, sortBy = 'rollNumber', sortOrder = 'asc'
    } = req.query;

    const query = { department: deptCode };

    if (series) query.series = series;
    if (session) query.session = session;
    if (semester) query.semester = semester;
    if (status) query.status = status;
    if (regularStatus) query.regularStatus = regularStatus;
    if (section) query.section = section.toUpperCase();

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { rollNumber: { $regex: s, $options: 'i' } },
        { registrationNumber: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const isAll = limit === 'all' || req.query.all === 'true';
    const limitNum = isAll ? 500 : Math.min(100, Math.max(1, parseInt(limit) || 25));
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [total, students, statsAgg] = await Promise.all([
      Student.countDocuments(query),
      Student.find(query)
        .select('-password -enrolledCourses -__v')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Student.aggregate([
        { $match: { department: deptCode } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            regular: { $sum: { $cond: [{ $eq: ['$regularStatus', 'Regular'] }, 1, 0] } },
            irregular: { $sum: { $cond: [{ $eq: ['$regularStatus', 'Irregular'] }, 1, 0] } }
          }
        }
      ])
    ]);

    const statRecord = statsAgg[0] || { total: 0, active: 0, regular: 0, irregular: 0 };

    res.json({
      success: true,
      department: deptCode,
      students,
      stats: {
        total: statRecord.total,
        active: statRecord.active,
        regular: statRecord.regular,
        irregular: statRecord.irregular
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('getHeadStudents error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/head/students/:id ────────────────────────────────────────
const getHeadStudentById = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const student = await Student.findById(req.params.id).select('-password -enrolledCourses').lean();
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (student.department !== deptCode) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access restricted to students of your department only' });
    }

    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/head/students (RESTRICTED) ──────────────────────────────
const createHeadStudent = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Forbidden: Department Heads cannot add student master records. Student master data is managed by System Administrators. To request updates, please submit a Data Correction Request.',
    code: 'ROLE_RESTRICTION'
  });
};

// ── PUT /api/head/students/:id (RESTRICTED) ───────────────────────────
const updateHeadStudent = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Forbidden: Department Heads cannot modify student master records. Please submit a Data Correction Request to the System Administrator.',
    code: 'ROLE_RESTRICTION'
  });
};

// ── DELETE /api/head/students/:id (RESTRICTED) ────────────────────────
const deleteHeadStudent = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Forbidden: Department Heads cannot delete student master records.',
    code: 'ROLE_RESTRICTION'
  });
};

// ── POST /api/head/teaching-assignments ───────────────────────────────
const createHeadTeachingAssignment = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const {
      courseId,
      teacherId, // Can be specific teacher ObjectId, or 'MYSELF'
      role = 'PRIMARY_TEACHER',
      academicSession = '2024-2025',
      semester = '1st Semester',
      series = '22',
      notes = ''
    } = req.body;

    if (!courseId || !teacherId) {
      return res.status(400).json({ success: false, message: 'Course and Teacher are required' });
    }

    const deptDoc = await Department.findOne({ code: deptCode }).lean();

    // 1. Validate course belongs to department
    const courseDoc = await Course.findById(courseId).lean();
    if (!courseDoc) return res.status(404).json({ success: false, message: 'Course not found' });
    if (courseDoc.departmentCode && courseDoc.departmentCode !== deptCode) {
      return res.status(403).json({ success: false, message: 'Forbidden: Course belongs to another department' });
    }

    // 2. Resolve teacher (Head can assign to self or to department teacher - Section 18)
    let teacherDoc = null;
    if (teacherId === 'MYSELF' || teacherId === 'myself') {
      teacherDoc = await Teacher.findOne({
        department: deptCode,
        $or: [
          { _id: req.user.profileRef },
          { _id: deptDoc?.headTeacher },
          { teacherId: req.user.loginIdentifier?.toUpperCase() }
        ]
      });
      if (!teacherDoc && deptDoc?.headTeacher) {
        teacherDoc = await Teacher.findById(deptDoc.headTeacher);
      }
      if (!teacherDoc) {
        teacherDoc = await Teacher.findOne({ department: deptCode, status: { $ne: 'inactive' } });
      }
    } else {
      teacherDoc = await Teacher.findOne({
        _id: teacherId,
        department: deptCode,
        status: { $ne: 'inactive' }
      });
    }

    if (!teacherDoc) {
      return res.status(400).json({ success: false, message: 'Teacher not found or is inactive in your department' });
    }

    // 3. Find or create CourseOffering for this course, session, and semester
    const [seriesDoc, sessionDoc] = await Promise.all([
      Series.findOne({
        departmentCode: deptCode,
        $or: [{ name: series }, { name: String(parseInt(series, 10)) }]
      }).lean(),
      AcademicSession.findOne({
        $or: [
          { name: academicSession },
          { name: academicSession.replace('-20', '-') },
          { name: academicSession.replace('-', '-20') }
        ]
      }).lean()
    ]);

    let offeringDoc = await CourseOffering.findOne({
      course: courseDoc._id,
      $or: [
        { seriesName: series },
        ...(seriesDoc ? [{ series: seriesDoc._id }] : [])
      ]
    });

    if (!offeringDoc) {
      offeringDoc = await CourseOffering.create({
        course: courseDoc._id,
        courseCode: courseDoc.courseCode,
        courseName: courseDoc.courseTitle,
        academicSession: sessionDoc?._id || undefined,
        sessionName: academicSession,
        semesterName: semester,
        series: seriesDoc?._id || undefined,
        seriesName: series,
        department: deptDoc?._id,
        departmentCode: deptCode,
        faculty: deptDoc?.faculty,
        facultyCode: deptDoc?.faculty?.code || '',
        status: 'active'
      });
    }

    // 4. Check for duplicate assignment (Section 17)
    const existing = await TeacherAssignment.findOne({
      courseOffering: offeringDoc._id,
      teacher: teacherDoc._id,
      status: 'active'
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `${teacherDoc.name} is already assigned to ${courseDoc.courseCode} for ${academicSession} (${semester}).`
      });
    }

    const assignment = await TeacherAssignment.create({
      courseOffering: offeringDoc._id,
      courseId: courseDoc._id,
      courseCode: courseDoc.courseCode,
      courseName: courseDoc.courseTitle,
      teacher: teacherDoc._id,
      teacherId: teacherDoc.teacherId,
      teacherName: teacherDoc.name,
      role,
      department: deptDoc?._id,
      departmentCode: deptCode,
      faculty: deptDoc?.faculty,
      academicSession,
      semester,
      series,
      status: 'active',
      assignedBy: req.user._id,
      assignedByName: req.user.name || 'Department Head',
      notes
    });

    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user._id,
      userRole: 'department_head',
      userName: req.user.name,
      action: 'COURSE_ASSIGNED_TO_TEACHER',
      entity: 'TeacherAssignment',
      entityId: String(assignment._id),
      details: `Assigned ${courseDoc.courseCode} to ${teacherDoc.name} (${role}) for Session ${academicSession}, Series ${series}, Semester ${semester}`
    }).catch(e => console.error('AuditLog error:', e.message));

    res.status(201).json({
      success: true,
      message: `Course ${courseDoc.courseCode} successfully assigned to ${teacherDoc.name}.`,
      assignment
    });
  } catch (error) {
    console.error('createHeadTeachingAssignment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── DELETE /api/head/teaching-assignments/:id ─────────────────────────
const deleteHeadTeachingAssignment = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const assignment = await TeacherAssignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    if (assignment.departmentCode !== deptCode) {
      return res.status(403).json({ success: false, message: 'Forbidden: Assignment belongs to another department' });
    }

    assignment.status = 'revoked';
    await assignment.save();

    res.json({ success: true, message: 'Teaching assignment revoked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/head/teachers/workload ───────────────────────────────────
const getHeadTeacherWorkload = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const SupervisionAssignment = require('../models/SupervisionAssignment');

    const [teachers, assignments, supervisions] = await Promise.all([
      Teacher.find({ department: deptCode, status: { $ne: 'inactive' } }).select('name teacherId designation email').lean(),
      TeacherAssignment.find({ departmentCode: deptCode, status: 'active' }).populate('courseId', 'courseCode courseTitle credit').lean(),
      SupervisionAssignment.find({ departmentCode: deptCode, status: 'active' }).lean()
    ]);

    const workloadList = teachers.map(t => {
      const tCourses = assignments.filter(a => String(a.teacher) === String(t._id));
      const tSupervisions = supervisions.filter(s => String(s.teacher) === String(t._id));

      const totalCredits = tCourses.reduce((sum, c) => sum + (c.courseId?.credit || 3), 0);

      return {
        _id: t._id,
        name: t.name,
        teacherId: t.teacherId,
        designation: t.designation || 'Lecturer',
        email: t.email || '',
        coursesCount: tCourses.length,
        courses: tCourses.map(c => ({
          code: c.courseCode,
          title: c.courseName,
          role: c.role,
          session: c.academicSession,
          semester: c.semester
        })),
        totalCredits,
        supervisionCounts: {
          projectI: tSupervisions.filter(s => s.activityType === 'PROJECT_I').length,
          projectII: tSupervisions.filter(s => s.activityType === 'PROJECT_II').length,
          seminar: tSupervisions.filter(s => s.activityType === 'SEMINAR').length,
          thesis: tSupervisions.filter(s => s.activityType === 'THESIS').length,
          total: tSupervisions.length
        }
      };
    });

    res.json({
      success: true,
      department: deptCode,
      workload: workloadList.sort((a, b) => b.coursesCount - a.coursesCount)
    });
  } catch (error) {
    console.error('getHeadTeacherWorkload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/head/teachers ────────────────────────────────────────────
const getHeadTeachers = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const teachers = await Teacher.find({ department: deptCode })
      .select('-password -__v')
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, department: deptCode, teachers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/head/courses ─────────────────────────────────────────────
const getHeadCourses = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const courses = await Course.find({ departmentCode: deptCode })
      .sort({ courseCode: 1 })
      .lean();
    res.json({ success: true, department: deptCode, courses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/head/teaching-assignments ────────────────────────────────
const getHeadTeachingAssignments = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const assignments = await TeacherAssignment.find({ departmentCode: deptCode })
      .populate('teacher', 'name teacherId designation')
      .populate('courseOffering', 'courseCode courseName')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, department: deptCode, assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/head/analytics ───────────────────────────────────────────
const getHeadAnalytics = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const [studentsBySeries, studentsByStatus] = await Promise.all([
      Student.aggregate([
        { $match: { department: deptCode } },
        { $group: { _id: '$series', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Student.aggregate([
        { $match: { department: deptCode } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      department: deptCode,
      studentsBySeries,
      studentsByStatus
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getHeadDashboardStats,
  getHeadAcademicSessions,
  getHeadSessionStudents,
  getHeadStudents,
  getHeadStudentById,
  createHeadStudent,
  updateHeadStudent,
  deleteHeadStudent,
  getHeadTeachers,
  getHeadTeacherWorkload,
  getHeadCourses,
  getHeadTeachingAssignments,
  createHeadTeachingAssignment,
  deleteHeadTeachingAssignment,
  getHeadAnalytics
};
