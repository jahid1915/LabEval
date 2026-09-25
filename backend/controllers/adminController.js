const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const CourseOffering = require('../models/CourseOffering');
const TeacherAssignment = require('../models/TeacherAssignment');
const Department = require('../models/Department');
const Series = require('../models/Series');
const Faculty = require('../models/Faculty');
const Attendance = require('../models/Attendance');
const Report = require('../models/Report');
const Performance = require('../models/Performance');
const Quiz = require('../models/Quiz');
const Test = require('../models/Test');
const Others = require('../models/Others');
const Request = require('../models/Request');
const LeaveRequest = require('../models/LeaveRequest');
const { logAudit } = require('../middleware/auditMiddleware');
const bcrypt = require('bcryptjs');

// Helper to get department isolation filter
const getDeptFilter = (req) => {
  if (req.user && req.user.departmentCode && req.user.role !== 'super_admin') {
    return req.user.departmentCode.toUpperCase();
  }
  return null;
};

// ── GET /api/admin/stats ──────────────────────────────────────────────
const getSystemStats = async (req, res) => {
  try {
    const deptFilter = getDeptFilter(req);

    const studentQuery = { status: 'active' };
    const teacherQuery = {};
    const courseQuery = { status: 'active' };
    const offeringQuery = { status: 'active' };
    const requestQuery = { status: 'Pending' };
    const leaveQuery = { status: 'pending' };

    if (deptFilter) {
      studentQuery.department = deptFilter;
      teacherQuery.department = deptFilter;
      courseQuery.departmentCode = deptFilter;
      offeringQuery.departmentCode = deptFilter;
      requestQuery.department = deptFilter;
    }

    const [
      totalStudents,
      totalTeachers,
      totalCourses,
      totalOfferings,
      totalAttendance,
      totalReports,
      totalRequests,
      pendingLeaves,
      teachersOnDuty,
      teachersOnLeave,
      departments
    ] = await Promise.all([
      Student.countDocuments(studentQuery),
      Teacher.countDocuments(teacherQuery),
      Course.countDocuments(courseQuery),
      CourseOffering.countDocuments(offeringQuery),
      Attendance.countDocuments(),
      Report.countDocuments(),
      Request.countDocuments(requestQuery),
      LeaveRequest.countDocuments(leaveQuery),
      Teacher.countDocuments({ ...teacherQuery, dutyStatus: 'ON_DUTY' }),
      Teacher.countDocuments({ ...teacherQuery, dutyStatus: 'ON_LEAVE' }),
      deptFilter 
        ? Department.find({ code: deptFilter, status: 'active' }).select('name code')
        : Department.find({ status: 'active' }).select('name code')
    ]);

    // Student distribution by department
    const studentDeptDistribution = await Student.aggregate([
      ...(deptFilter ? [{ $match: { department: deptFilter } }] : []),
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Student distribution by series
    const studentSeriesDistribution = await Student.aggregate([
      ...(deptFilter ? [{ $match: { department: deptFilter } }] : []),
      { $group: { _id: '$series', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);

    res.json({
      departmentCode: deptFilter || 'ALL',
      totalStudents,
      totalTeachers,
      totalCourses,
      totalOfferings,
      totalAttendance,
      totalReports,
      totalRequests,
      pendingLeaves,
      teachersOnDuty,
      teachersOnLeave,
      departments,
      studentDeptDistribution,
      studentSeriesDistribution
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── TEACHER MANAGEMENT ───────────────────────────────────────────────

// GET /api/admin/teachers — with pagination and N+1 fix
const getAllTeachers = async (req, res) => {
  try {
    const deptFilter = getDeptFilter(req);
    const { department, dutyStatus, search, page = 1, limit = 50 } = req.query;

    const isAll = limit === 'all' || req.query.all === 'true' || limit === '0' || req.query.noLimit === 'true';
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = isAll ? 2000 : Math.min(200, Math.max(1, parseInt(limit) || 50));
    const skip = isAll ? 0 : (pageNum - 1) * limitNum;

    let query = {};

    if (deptFilter) {
      query.department = deptFilter;
    } else if (department) {
      query.department = department.toUpperCase();
    }

    if (dutyStatus) query.dutyStatus = dutyStatus;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { teacherId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [total, teachers] = await Promise.all([
      Teacher.countDocuments(query),
      Teacher.find(query)
        .select('-password -allocatedCourses -__v')
        .sort({ designation: 1, name: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    // Batch-fetch all active assignments for these teachers — eliminates N+1
    const teacherIds = teachers.map(t => t.teacherId);
    const assignments = await TeacherAssignment.find({
      teacherId: { $in: teacherIds },
      status: 'active'
    })
      .populate('courseOffering', 'courseCode courseName seriesName sessionName departmentCode semesterName')
      .lean();

    // Build lookup map
    const assignmentMap = {};
    assignments.forEach(a => {
      if (!assignmentMap[a.teacherId]) assignmentMap[a.teacherId] = [];
      assignmentMap[a.teacherId].push(a);
    });

    const enriched = teachers.map(t => ({
      ...t,
      activeAssignments: assignmentMap[t.teacherId] || [],
      assignedCoursesCount: (assignmentMap[t.teacherId] || []).length
    }));

    return res.json({
      teachers: enriched,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// POST /api/admin/teachers
const createTeacher = async (req, res) => {
  try {
    const deptFilter = getDeptFilter(req);
    const { name, teacherId, department, designation, contactNo, email, specialization, password, dutyStatus, joiningDate } = req.body;
    if (!name || !teacherId || !password) {
      return res.status(400).json({ message: 'Name, Teacher ID, and Password are required' });
    }

    const targetDept = deptFilter || (department ? department.trim().toUpperCase() : 'ETE');
    const cleanId = teacherId.trim().toUpperCase();

    const exists = await Teacher.findOne({ teacherId: cleanId });
    if (exists) return res.status(400).json({ message: 'Teacher ID already exists' });

    const deptDoc = await Department.findOne({ code: targetDept });

    const teacher = await Teacher.create({
      name: name.trim(),
      teacherId: cleanId,
      department: targetDept,
      departmentRef: deptDoc ? deptDoc._id : null,
      facultyRef: deptDoc ? deptDoc.faculty : null,
      designation: designation?.trim() || 'Lecturer',
      contactNo: contactNo?.trim() || 'N/A',
      email: email?.trim().toLowerCase() || '',
      specialization: specialization?.trim() || '',
      password,
      dutyStatus: dutyStatus || 'ON_DUTY',
      joiningDate: joiningDate || new Date()
    });

    await logAudit({
      req,
      action: 'CREATE_TEACHER',
      entity: 'Teacher',
      entityId: teacher._id,
      details: `Created teacher ${teacher.name} (${teacher.teacherId}) in ${teacher.department}`,
      newValues: { name: teacher.name, teacherId: teacher.teacherId, department: teacher.department }
    });

    res.status(201).json(teacher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/teachers/:id
const updateTeacher = async (req, res) => {
  try {
    const deptFilter = getDeptFilter(req);
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    if (deptFilter && teacher.department !== deptFilter) {
      return res.status(403).json({ message: 'Unauthorized: Cannot modify teacher from another department' });
    }

    const oldValues = { ...teacher.toObject() };
    const { name, designation, contactNo, email, specialization, dutyStatus, status, password } = req.body;

    if (name) teacher.name = name.trim();
    if (designation) teacher.designation = designation.trim();
    if (contactNo) teacher.contactNo = contactNo.trim();
    if (email) teacher.email = email.trim().toLowerCase();
    if (specialization !== undefined) teacher.specialization = specialization.trim();
    if (dutyStatus) teacher.dutyStatus = dutyStatus;
    if (status) teacher.status = status;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      teacher.password = await bcrypt.hash(password, salt);
    }

    await teacher.save();

    await logAudit({
      req,
      action: 'UPDATE_TEACHER',
      entity: 'Teacher',
      entityId: teacher._id,
      details: `Updated teacher ${teacher.name} (${teacher.teacherId})`,
      oldValues,
      newValues: teacher
    });

    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/teachers/:id
const deleteTeacher = async (req, res) => {
  try {
    const deptFilter = getDeptFilter(req);
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    if (deptFilter && teacher.department !== deptFilter) {
      return res.status(403).json({ message: 'Unauthorized: Cannot delete teacher from another department' });
    }

    const activeAssignments = await TeacherAssignment.countDocuments({
      teacherId: teacher.teacherId,
      status: 'active'
    });

    if (activeAssignments > 0) {
      teacher.status = 'inactive';
      teacher.dutyStatus = 'INACTIVE';
      await teacher.save();
      return res.json({ message: `Teacher deactivated. ${activeAssignments} active course assignments preserved.` });
    }

    await teacher.deleteOne();
    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── STUDENT MANAGEMENT ───────────────────────────────────────────────

// GET /api/admin/students  — paginated, server-side search & filter
const getAllStudents = async (req, res) => {
  try {
    const deptFilter = getDeptFilter(req);
    const {
      department, series, session, semester, section, status,
      search,
      page = 1, limit = 25
    } = req.query;

    const isAll = limit === 'all' || req.query.all === 'true' || limit === '0' || req.query.noLimit === 'true';
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = isAll ? 5000 : Math.min(200, Math.max(1, parseInt(limit) || 25));
    const skip = isAll ? 0 : (pageNum - 1) * limitNum;

    let query = {};

    // Department isolation
    if (deptFilter) {
      query.department = deptFilter;
    } else if (department) {
      query.department = department.toUpperCase();
    }

    // Filters
    if (series) query.series = series;
    if (session) query.session = session;
    if (semester) query.semester = semester;
    if (section) query.section = section.toUpperCase();
    if (status) query.status = status;

    // Server-side search
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { rollNumber: { $regex: s, $options: 'i' } },
        { registrationNumber: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } }
      ];
    }

    const [total, students] = await Promise.all([
      Student.countDocuments(query),
      Student.find(query)
        .select('-password -enrolledCourses -__v')
        .sort({ series: -1, rollNumber: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    return res.json({
      students,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// POST /api/admin/students
const createStudent = async (req, res) => {
  try {
    const deptFilter = getDeptFilter(req);
    const { name, series, rollNumber, registrationNumber, department, contactNo, email, password } = req.body;
    if (!name || !series || !rollNumber || !password) {
      return res.status(400).json({ message: 'Name, Series, Roll Number, and Password are required' });
    }

    const targetDept = deptFilter || (department ? department.trim().toUpperCase() : 'ETE');
    const cleanRoll = rollNumber.trim().toUpperCase();

    const exists = await Student.findOne({ rollNumber: cleanRoll });
    if (exists) return res.status(400).json({ message: 'Roll number already registered' });

    const deptDoc = await Department.findOne({ code: targetDept });

    const student = await Student.create({
      name: name.trim(),
      series: series.trim(),
      rollNumber: cleanRoll,
      registrationNumber: registrationNumber?.trim() || '',
      department: targetDept,
      departmentRef: deptDoc ? deptDoc._id : null,
      facultyRef: deptDoc ? deptDoc.faculty : null,
      contactNo: contactNo?.trim() || 'N/A',
      email: email?.trim().toLowerCase() || '',
      password,
      role: 'student'
    });

    await logAudit({
      req,
      action: 'CREATE_STUDENT',
      entity: 'Student',
      entityId: student._id,
      details: `Created student ${student.name} (${student.rollNumber}) in Series ${student.series} [${student.department}]`,
      newValues: { name: student.name, rollNumber: student.rollNumber, department: student.department }
    });

    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/students/:id
const updateStudent = async (req, res) => {
  try {
    const deptFilter = getDeptFilter(req);
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (deptFilter && student.department !== deptFilter) {
      return res.status(403).json({ message: 'Unauthorized: Cannot modify student from another department' });
    }

    const oldValues = { ...student.toObject() };
    const { name, series, registrationNumber, contactNo, email, status, password } = req.body;

    if (name) student.name = name.trim();
    if (series) student.series = series.trim();
    if (registrationNumber !== undefined) student.registrationNumber = registrationNumber.trim();
    if (contactNo) student.contactNo = contactNo.trim();
    if (email !== undefined) student.email = email.trim().toLowerCase();
    if (status) student.status = status;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      student.password = await bcrypt.hash(password, salt);
    }

    await student.save();

    await logAudit({
      req,
      action: 'UPDATE_STUDENT',
      entity: 'Student',
      entityId: student._id,
      details: `Updated student ${student.name} (${student.rollNumber})`,
      oldValues,
      newValues: student
    });

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/students/:id
const deleteStudent = async (req, res) => {
  try {
    const deptFilter = getDeptFilter(req);
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (deptFilter && student.department !== deptFilter) {
      return res.status(403).json({ message: 'Unauthorized: Cannot delete student from another department' });
    }

    await student.deleteOne();
    res.json({ message: 'Student removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/admin/courses ──────────────────────────────────────────
const getDepartmentCourses = async (req, res) => {
  try {
    const deptFilter = getDeptFilter(req);
    const { search, semester, status } = req.query;

    const query = {};
    if (deptFilter) {
      query.departmentCode = deptFilter;
    }
    if (search) {
      query.$or = [
        { courseCode: { $regex: search.trim(), $options: 'i' } },
        { courseName: { $regex: search.trim(), $options: 'i' } }
      ];
    }
    if (semester) {
      query.$or = [
        { semesterLevel: semester },
        { semester: semester }
      ];
    }

    const courses = await Course.find(query).sort({ courseCode: 1 }).lean();

    // Fetch active assignments for these courses
    const courseCodes = courses.map(c => c.courseCode);
    const assignments = await TeacherAssignment.find({
      courseCode: { $in: courseCodes },
      status: 'active'
    }).populate('teacher', 'name teacherId designation department email contactNo').lean();

    const assignmentMap = {};
    assignments.forEach(a => {
      assignmentMap[a.courseCode] = a;
    });

    const enrichedCourses = courses.map(course => {
      const assignment = assignmentMap[course.courseCode];
      return {
        ...course,
        assignedTeacher: assignment ? {
          _id: assignment.teacher?._id,
          name: assignment.teacherName || assignment.teacher?.name,
          teacherId: assignment.teacherId || assignment.teacher?.teacherId,
          designation: assignment.teacher?.designation,
          department: assignment.teacher?.department
        } : null,
        assignment: assignment || null,
        isAssigned: !!assignment
      };
    });

    let result = enrichedCourses;
    if (status === 'assigned') {
      result = enrichedCourses.filter(c => c.isAssigned);
    } else if (status === 'unassigned') {
      result = enrichedCourses.filter(c => !c.isAssigned);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/admin/assign-course ───────────────────────────────────
const assignCourseToTeacher = async (req, res) => {
  try {
    const deptFilter = getDeptFilter(req);
    const { courseId, courseCode, teacherId, semester, academicSession, series } = req.body;

    if ((!courseId && !courseCode) || !teacherId) {
      return res.status(400).json({ message: 'Course and Teacher are required' });
    }

    // Find course
    const course = courseId 
      ? await Course.findById(courseId)
      : await Course.findOne({ courseCode: courseCode.trim().toUpperCase() });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Enforce department isolation
    if (deptFilter && course.departmentCode && course.departmentCode.toUpperCase() !== deptFilter) {
      return res.status(403).json({ message: `Unauthorized: Cannot assign course from ${course.departmentCode} department` });
    }

    // Find teacher
    const teacher = await Teacher.findOne({
      $or: [
        { teacherId: teacherId.trim().toUpperCase() },
        { _id: mongoose.Types.ObjectId.isValid(teacherId) ? teacherId : null }
      ]
    });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    // Enforce teacher department isolation
    if (deptFilter && teacher.department && teacher.department.toUpperCase() !== deptFilter) {
      return res.status(403).json({ message: `Unauthorized: Teacher belongs to ${teacher.department}, not ${deptFilter}` });
    }

    const assignedSemester = semester || course.semesterLevel || '3-2';
    const assignedSession = academicSession || '2024-2025';
    const assignedSeries = series || '22';

    // Find or create CourseOffering
    let offering = await CourseOffering.findOne({
      courseCode: course.courseCode,
      seriesName: assignedSeries,
      sessionName: assignedSession,
      semesterName: assignedSemester
    });

    if (!offering) {
      offering = await CourseOffering.create({
        course: course._id,
        courseCode: course.courseCode,
        courseName: course.courseName || course.title,
        department: course.department,
        departmentCode: course.departmentCode || deptFilter,
        seriesName: assignedSeries,
        sessionName: assignedSession,
        semesterName: assignedSemester,
        status: 'active'
      });
    }

    // Mark previous active assignments for this offering as reassigned/revoked
    await TeacherAssignment.updateMany(
      { courseOffering: offering._id, status: 'active' },
      { status: 'revoked' }
    );

    // Create new TeacherAssignment
    const assignment = await TeacherAssignment.create({
      courseOffering: offering._id,
      teacher: teacher._id,
      teacherId: teacher.teacherId,
      teacherName: teacher.name,
      courseId: course._id,
      courseCode: course.courseCode,
      courseName: course.courseName || course.title,
      department: course.department,
      departmentCode: course.departmentCode || deptFilter,
      semester: assignedSemester,
      academicSession: assignedSession,
      series: assignedSeries,
      assignedBy: req.user._id,
      assignedByName: req.user.name,
      assignedAt: new Date(),
      status: 'active'
    });

    await logAudit({
      req,
      action: 'ASSIGN_COURSE',
      entity: 'TeacherAssignment',
      entityId: assignment._id,
      details: `Assigned course ${course.courseCode} (${course.courseName || course.title}) to ${teacher.name} (${teacher.teacherId}) for ${assignedSemester} [${assignedSession}]`,
      newValues: { courseCode: course.courseCode, teacherId: teacher.teacherId, semester: assignedSemester }
    });

    res.status(201).json({
      message: 'Course assigned successfully to teacher',
      assignment,
      course: {
        ...course.toObject(),
        assignedTeacher: {
          name: teacher.name,
          teacherId: teacher.teacherId,
          designation: teacher.designation
        },
        isAssigned: true
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE /api/admin/revoke-assignment/:id ──────────────────────────
const revokeCourseAssignment = async (req, res) => {
  try {
    const deptFilter = getDeptFilter(req);
    const assignment = await TeacherAssignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    if (deptFilter && assignment.departmentCode && assignment.departmentCode.toUpperCase() !== deptFilter) {
      return res.status(403).json({ message: 'Unauthorized: Cannot revoke assignment for another department' });
    }

    assignment.status = 'revoked';
    await assignment.save();

    res.json({ message: 'Course assignment revoked successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/admin/teacher-assignments/:teacherId ───────────────────
const getTeacherAssignedCourses = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const assignments = await TeacherAssignment.find({
      $or: [
        { teacherId: teacherId.toUpperCase() },
        ...(mongoose.Types.ObjectId.isValid(teacherId) ? [{ teacher: teacherId }] : [])
      ],
      status: 'active'
    }).populate('courseId').lean();

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/admin/transfer-headship ─────────────────────────────────
// Shifts Department Head authority, course assignment powers, and admin credentials
const transferHeadship = async (req, res) => {
  try {
    const { successorTeacherId, memoNumber, handoverDate, remarks, password } = req.body;
    const currentAdminId = req.user._id;

    if (!successorTeacherId || !password) {
      return res.status(400).json({ message: 'Successor teacher and current password are required' });
    }

    const currentAdmin = await Admin.findById(currentAdminId);
    if (!currentAdmin) return res.status(404).json({ message: 'Current administrator not found' });

    // Verify password
    const isMatch = await currentAdmin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Security check failed: Incorrect password' });
    }

    const deptCode = currentAdmin.departmentCode || req.user.departmentCode;

    // Find successor teacher
    const successor = await Teacher.findOne({
      $or: [
        { teacherId: successorTeacherId.trim().toUpperCase() },
        ...(mongoose.Types.ObjectId.isValid(successorTeacherId) ? [{ _id: successorTeacherId }] : [])
      ]
    });

    if (!successor) {
      return res.status(404).json({ message: 'Designated successor teacher not found' });
    }

    // 1. Create or promote Successor Admin account
    let successorAdmin = await Admin.findOne({
      $or: [
        { email: successor.email?.toLowerCase() },
        { username: `head-${deptCode.toLowerCase()}` }
      ]
    });

    if (successorAdmin && successorAdmin._id.toString() !== currentAdmin._id.toString()) {
      successorAdmin.role = 'department_head';
      successorAdmin.status = 'active';
      successorAdmin.name = successor.name;
      successorAdmin.designation = `Professor & Head, Dept. of ${deptCode}`;
      successorAdmin.departmentCode = deptCode;
      await successorAdmin.save();
    } else {
      const cleanTeacherId = successor.teacherId.toLowerCase().replace(/[^a-z0-9]/g, '');
      const username = `head_${cleanTeacherId}`;
      successorAdmin = await Admin.create({
        name: successor.name,
        username,
        email: successor.email || `head.${deptCode.toLowerCase()}@ruet.ac.bd`,
        password: password,
        role: 'department_head',
        designation: `Professor & Head, Dept. of ${deptCode}`,
        department: currentAdmin.department,
        departmentCode: deptCode,
        faculty: currentAdmin.faculty,
        facultyCode: currentAdmin.facultyCode,
        status: 'active'
      });
    }

    // 2. Transition current head to emeritus / senior professor
    currentAdmin.role = 'teacher';
    currentAdmin.designation = `Professor, Dept. of ${deptCode}`;
    await currentAdmin.save();

    // 3. Update Department model's head field
    if (currentAdmin.department) {
      await Department.findByIdAndUpdate(currentAdmin.department, {
        head: successorAdmin._id,
        headName: successor.name
      });
    }

    // 4. Log the audit
    try {
      await logAudit({
        userId: currentAdmin._id,
        userRole: 'admin',
        action: 'HEADSHIP_TRANSFERRED',
        details: `Department Head authority for ${deptCode} transferred to ${successor.name} (${successor.teacherId}). Memo: ${memoNumber || 'N/A'}`
      });
    } catch {
      /* non-blocking audit */
    }

    res.json({
      success: true,
      message: `Department Head authority successfully shifted to ${successor.name}!`,
      newHead: {
        name: successor.name,
        teacherId: successor.teacherId,
        username: successorAdmin.username,
        departmentCode: deptCode,
        effectiveDate: handoverDate || new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSystemStats,
  getAllTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getDepartmentCourses,
  assignCourseToTeacher,
  revokeCourseAssignment,
  getTeacherAssignedCourses,
  transferHeadship
};
