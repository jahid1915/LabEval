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
const User = require('../models/User');
const DepartmentHeadHistory = require('../models/DepartmentHeadHistory');
const FinalEnrollment = require('../models/FinalEnrollment');
const { logAudit } = require('../middleware/auditMiddleware');
const bcrypt = require('bcryptjs');

// Helper to get department isolation filter
const getDeptFilter = (req) => {
  if (req.user && req.user.departmentCode && req.user.role !== 'super_admin' && req.user.role !== 'admin') {
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
    const limitNum = isAll ? 100 : Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

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

    // Create / link unified User record
    try {
      let userDoc = await User.findOne({ loginIdentifierLower: cleanId.toLowerCase() });
      if (!userDoc) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        userDoc = await User.create({
          loginIdentifier: cleanId,
          loginIdentifierLower: cleanId.toLowerCase(),
          passwordHash,
          role: 'teacher',
          status: 'ACTIVE',
          name: name.trim(),
          email: email?.trim().toLowerCase() || '',
          phone: contactNo?.trim() || '',
          department: targetDept,
          departmentRef: deptDoc ? deptDoc._id : null,
          profileRef: teacher._id,
          profileModel: 'Teacher'
        });
        teacher.user = userDoc._id;
        await teacher.save();
      }
    } catch (err) {
      console.warn('User record creation warning for teacher:', err.message);
    }

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
    const limitNum = isAll ? 100 : Math.min(100, Math.max(1, parseInt(limit) || 25));
    const skip = (pageNum - 1) * limitNum;

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
    if (req.query.regularStatus) query.regularStatus = req.query.regularStatus;

    // Sorting
    const sortBy = req.query.sortBy || 'rollNumber';
    const sortOrder = req.query.sortOrder === 'desc' || req.query.order === 'desc' ? -1 : 1;
    const sortObj = {};
    sortObj[sortBy] = sortOrder;

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
        .sort(sortObj)
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
    const {
      name, series, rollNumber, registrationNumber, registrationNo,
      department, contactNo, phone, email, password,
      semester, session, regularStatus, status, section, batch,
      gender, bloodGroup, address, customFields
    } = req.body;

    if (!name || !series || !rollNumber) {
      return res.status(400).json({ message: 'Name, Series, and Roll Number are required' });
    }

    const targetDept = deptFilter || (department ? department.trim().toUpperCase() : 'ETE');
    const cleanRoll = rollNumber.trim().toUpperCase();

    const exists = await Student.findOne({ rollNumber: cleanRoll });
    if (exists) return res.status(400).json({ message: 'Roll number already registered' });

    const cleanRegNo = (registrationNo !== undefined ? registrationNo : registrationNumber)?.trim() || '';
    if (!password && !cleanRegNo) {
      return res.status(400).json({ message: 'Registration number is required as the initial password' });
    }

    const deptDoc = await Department.findOne({ code: targetDept });
    const finalPassword = password || cleanRegNo;

    const studentData = {
      name: name.trim(),
      series: series.trim(),
      rollNumber: cleanRoll,
      registrationNumber: cleanRegNo,
      department: targetDept,
      departmentRef: deptDoc ? deptDoc._id : null,
      facultyRef: deptDoc ? deptDoc.faculty : null,
      contactNo: (phone !== undefined ? phone : contactNo)?.trim() || '',
      email: email?.trim().toLowerCase() || '',
      password: finalPassword,
      role: 'student',
      status: status || 'active',
      regularStatus: regularStatus || 'Regular',
      semester: semester?.trim() || '',
      session: session?.trim() || '',
      section: section?.trim().toUpperCase() || '',
      batch: batch?.trim() || '',
      gender: gender?.trim() || '',
      bloodGroup: bloodGroup?.trim() || '',
      address: address?.trim() || ''
    };

    if (customFields && typeof customFields === 'object') {
      studentData.customFields = customFields;
    }

    const student = await Student.create(studentData);

    // Create / link unified User record
    try {
      let userDoc = await User.findOne({ loginIdentifierLower: cleanRoll.toLowerCase() });
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(finalPassword, salt);
      const userStatus = status === 'inactive' ? 'INACTIVE' : (status === 'suspended' ? 'SUSPENDED' : 'ACTIVE');

      if (!userDoc) {
        userDoc = await User.create({
          loginIdentifier: cleanRoll,
          loginIdentifierLower: cleanRoll.toLowerCase(),
          passwordHash,
          role: 'student',
          status: userStatus,
          name: name.trim(),
          email: email?.trim().toLowerCase() || '',
          phone: (phone !== undefined ? phone : contactNo)?.trim() || '',
          department: targetDept,
          departmentRef: deptDoc ? deptDoc._id : null,
          profileRef: student._id,
          profileModel: 'Student'
        });
      } else {
        userDoc.passwordHash = passwordHash;
        userDoc.status = userStatus;
        userDoc.profileRef = student._id;
        userDoc.profileModel = 'Student';
        userDoc.department = targetDept;
        userDoc.departmentRef = deptDoc ? deptDoc._id : null;
        await userDoc.save();
      }
      student.user = userDoc._id;
      await student.save();
    } catch (err) {
      console.warn('User record creation warning for student:', err.message);
    }

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

// GET /api/admin/students/:id
const getStudentById = async (req, res) => {
  try {
    const deptFilter = getDeptFilter(req);
    const student = await Student.findById(req.params.id)
      .select('-password')
      .populate('enrolledCourses.courseOffering')
      .lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (deptFilter && student.department !== deptFilter) {
      return res.status(403).json({ message: 'Unauthorized: Cannot view student from another department' });
    }

    return res.json(student);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT or PATCH /api/admin/students/:id
const updateStudent = async (req, res) => {
  try {
    const deptFilter = getDeptFilter(req);
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (deptFilter && student.department !== deptFilter) {
      return res.status(403).json({ message: 'Unauthorized: Cannot modify student from another department' });
    }

    const oldValues = { ...student.toObject() };
    const changedFields = [];

    const {
      name, studentName,
      rollNumber,
      series,
      department,
      registrationNumber, registrationNo,
      contactNo, phone,
      email, studentEmail,
      semester, currentSemester,
      session, academicSession,
      regularStatus,
      status,
      section,
      batch,
      gender,
      bloodGroup,
      address,
      password
    } = req.body;

    const newName = (studentName || name);
    if (newName && newName.trim() !== student.name) {
      changedFields.push(`name: "${student.name}" -> "${newName.trim()}"`);
      student.name = newName.trim();
    }

    if (rollNumber && rollNumber.trim().toUpperCase() !== student.rollNumber) {
      const cleanRoll = rollNumber.trim().toUpperCase();
      const existing = await Student.findOne({ rollNumber: cleanRoll, _id: { $ne: student._id } });
      if (existing) {
        return res.status(400).json({ message: `Roll number ${cleanRoll} is already registered to another student` });
      }
      changedFields.push(`rollNumber: "${student.rollNumber}" -> "${cleanRoll}"`);
      student.rollNumber = cleanRoll;
    }

    if (series && series.trim() !== student.series) {
      changedFields.push(`series: "${student.series}" -> "${series.trim()}"`);
      student.series = series.trim();
    }

    if (department && department.trim().toUpperCase() !== student.department) {
      changedFields.push(`department: "${student.department}" -> "${department.trim().toUpperCase()}"`);
      student.department = department.trim().toUpperCase();
      const deptDoc = await Department.findOne({ code: student.department });
      if (deptDoc) {
        student.departmentRef = deptDoc._id;
        student.facultyRef = deptDoc.faculty;
      }
    }

    const newReg = (registrationNo !== undefined ? registrationNo : registrationNumber);
    if (newReg !== undefined && newReg.trim() !== student.registrationNumber) {
      changedFields.push(`registrationNumber: "${student.registrationNumber}" -> "${newReg.trim()}"`);
      student.registrationNumber = newReg.trim();
    }

    const newContact = (phone !== undefined ? phone : contactNo);
    if (newContact !== undefined && newContact.trim() !== student.contactNo) {
      changedFields.push(`contactNo: "${student.contactNo}" -> "${newContact.trim()}"`);
      student.contactNo = newContact.trim();
    }

    const newEmail = (studentEmail !== undefined ? studentEmail : email);
    if (newEmail !== undefined && newEmail.trim().toLowerCase() !== student.email) {
      changedFields.push(`email: "${student.email}" -> "${newEmail.trim().toLowerCase()}"`);
      student.email = newEmail.trim().toLowerCase();
    }

    const newSem = (currentSemester !== undefined ? currentSemester : semester);
    if (newSem !== undefined && newSem.trim() !== student.semester) {
      changedFields.push(`semester: "${student.semester}" -> "${newSem.trim()}"`);
      student.semester = newSem.trim();
    }

    const newSession = (academicSession !== undefined ? academicSession : session);
    if (newSession !== undefined && newSession.trim() !== student.session) {
      changedFields.push(`session: "${student.session}" -> "${newSession.trim()}"`);
      student.session = newSession.trim();
    }

    if (regularStatus && regularStatus !== student.regularStatus) {
      changedFields.push(`regularStatus: "${student.regularStatus}" -> "${regularStatus}"`);
      student.regularStatus = regularStatus;
    }

    if (status && status !== student.status) {
      changedFields.push(`status: "${student.status}" -> "${status}"`);
      student.status = status;
    }

    if (section !== undefined) student.section = section.trim().toUpperCase();
    if (batch !== undefined) student.batch = batch.trim();
    if (gender !== undefined) student.gender = gender.trim();
    if (bloodGroup !== undefined) student.bloodGroup = bloodGroup.trim();
    if (address !== undefined) student.address = address.trim();

    // Custom fields support
    if (req.body.customFields && typeof req.body.customFields === 'object') {
      const existing = student.customFields || {};
      student.customFields = { ...existing, ...req.body.customFields };
      student.markModified('customFields');
      changedFields.push('customFields updated');
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      student.password = await bcrypt.hash(password, salt);
      changedFields.push('password updated');
    }

    student.updatedAt = new Date();
    await student.save();

    await logAudit({
      req,
      action: 'UPDATE_STUDENT',
      entity: 'Student',
      entityId: student._id,
      details: `Updated student ${student.name} (${student.rollNumber}). Changes: ${changedFields.join('; ') || 'details updated'}`,
      oldValues,
      oldData: oldValues,
      newValues: student.toObject(),
      newData: student.toObject()
    });

    return res.json(student);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/students/:id/deactivate
const toggleDeactivateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const newStatus = req.body.status || (student.status === 'active' ? 'inactive' : 'active');
    const oldStatus = student.status;
    student.status = newStatus;
    student.updatedAt = new Date();
    await student.save();

    await logAudit({
      req,
      action: newStatus === 'active' ? 'ACTIVATE_STUDENT' : 'DEACTIVATE_STUDENT',
      entity: 'Student',
      entityId: student._id,
      details: `Changed student ${student.rollNumber} status: ${oldStatus} -> ${newStatus}`,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus }
    });

    return res.json({ success: true, student, message: `Student status set to ${newStatus}` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/students/:id/reset-password
const resetStudentPassword = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const regNo = student.registrationNumber ? student.registrationNumber.trim() : '';
    if (!req.body.password && !regNo) {
      return res.status(400).json({ message: 'No registration number available on record to reset default password. Please specify a new password.' });
    }
    const newPass = req.body.password || regNo;
    const salt = await bcrypt.genSalt(10);
    student.password = await bcrypt.hash(newPass, salt);
    student.updatedAt = new Date();
    await student.save();

    await logAudit({
      req,
      action: 'RESET_STUDENT_PASSWORD',
      entity: 'Student',
      entityId: student._id,
      details: `Reset password for student ${student.name} (${student.rollNumber}) to default/specified password`
    });

    return res.json({ success: true, message: `Password reset successfully for ${student.rollNumber}` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/students/bulk-action
const bulkStudentAction = async (req, res) => {
  try {
    const { studentIds, action, payload = {} } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'No students selected for bulk action' });
    }

    const deptFilter = getDeptFilter(req);
    const filter = { _id: { $in: studentIds } };
    if (deptFilter) filter.department = deptFilter;

    let resultMessage = '';

    if (action === 'delete') {
      const resDel = await Student.deleteMany(filter);
      resultMessage = `Deleted ${resDel.deletedCount} students`;
    } else if (action === 'deactivate') {
      const resUpd = await Student.updateMany(filter, { $set: { status: 'inactive', updatedAt: new Date() } });
      resultMessage = `Deactivated ${resUpd.modifiedCount} students`;
    } else if (action === 'activate') {
      const resUpd = await Student.updateMany(filter, { $set: { status: 'active', updatedAt: new Date() } });
      resultMessage = `Activated ${resUpd.modifiedCount} students`;
    } else if (action === 'update_semester') {
      if (!payload.semester) return res.status(400).json({ message: 'Semester is required for update_semester' });
      const resUpd = await Student.updateMany(filter, { $set: { semester: payload.semester, updatedAt: new Date() } });
      resultMessage = `Updated semester to ${payload.semester} for ${resUpd.modifiedCount} students`;
    } else if (action === 'update_regular_status') {
      if (!payload.regularStatus) return res.status(400).json({ message: 'regularStatus is required' });
      const resUpd = await Student.updateMany(filter, { $set: { regularStatus: payload.regularStatus, updatedAt: new Date() } });
      resultMessage = `Updated regular status to ${payload.regularStatus} for ${resUpd.modifiedCount} students`;
    } else {
      return res.status(400).json({ message: `Unknown bulk action "${action}"` });
    }

    await logAudit({
      req,
      action: 'BULK_STUDENT_ACTION',
      entity: 'Student',
      details: `Bulk action "${action}" on ${studentIds.length} students: ${resultMessage}`,
      newValues: { action, studentCount: studentIds.length, payload }
    });

    return res.json({ success: true, message: resultMessage });
  } catch (error) {
    return res.status(500).json({ message: error.message });
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

    await logAudit({
      req,
      action: 'DELETE_STUDENT',
      entity: 'Student',
      entityId: student._id,
      details: `Deleted student ${student.name} (${student.rollNumber}) from ${student.department}`,
      oldValues: { name: student.name, rollNumber: student.rollNumber, department: student.department }
    });

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

// ── GET /api/admin/requests ──────────────────────────────────────────
const getAdminRequests = async (req, res) => {
  try {
    const deptFilter = getDeptFilter(req);
    const { status, search } = req.query;
    let query = {};
    if (deptFilter) {
      query.department = deptFilter;
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { studentRoll: { $regex: search.trim(), $options: 'i' } },
        { studentName: { $regex: search.trim(), $options: 'i' } },
        { course: { $regex: search.trim(), $options: 'i' } },
        { courseName: { $regex: search.trim(), $options: 'i' } },
        { teacherName: { $regex: search.trim(), $options: 'i' } }
      ];
    }
    const requests = await Request.find(query)
      .populate('student', 'name rollNumber email series section department')
      .populate('teacherRef', 'name teacherId email designation')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, requests, count: requests.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/students/stats — Live database statistics for overview cards
const getStudentStats = async (req, res) => {
  try {
    const deptFilter = getDeptFilter(req);
    const baseQuery = {};
    if (deptFilter) baseQuery.department = deptFilter;

    const [
      totalStudents,
      activeStudents,
      regularStudents,
      irregularStudents,
      seriesDistribution,
      departmentDistribution,
      semesterDistribution,
      statusDistribution,
      sectionDistribution
    ] = await Promise.all([
      Student.countDocuments(baseQuery),
      Student.countDocuments({ ...baseQuery, status: 'active' }),
      Student.countDocuments({ ...baseQuery, regularStatus: 'Regular' }),
      Student.countDocuments({ ...baseQuery, regularStatus: 'Irregular' }),
      Student.aggregate([
        ...(deptFilter ? [{ $match: { department: deptFilter } }] : []),
        { $group: { _id: '$series', count: { $sum: 1 } } },
        { $sort: { _id: -1 } }
      ]),
      Student.aggregate([
        ...(deptFilter ? [{ $match: { department: deptFilter } }] : []),
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Student.aggregate([
        ...(deptFilter ? [{ $match: { department: deptFilter } }] : []),
        { $group: { _id: '$semester', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Student.aggregate([
        ...(deptFilter ? [{ $match: { department: deptFilter } }] : []),
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Student.aggregate([
        ...(deptFilter ? [{ $match: { department: deptFilter } }] : []),
        { $match: { section: { $exists: true, $ne: '' } } },
        { $group: { _id: '$section', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Find most common semester (current)
    const currentSemester = semesterDistribution.length > 0
      ? semesterDistribution.reduce((a, b) => a.count >= b.count ? a : b)._id || 'N/A'
      : 'N/A';

    return res.json({
      success: true,
      stats: {
        totalStudents,
        activeStudents,
        regularStudents,
        irregularStudents,
        currentSemester,
        seriesDistribution: seriesDistribution.map(s => ({ series: s._id, count: s.count })),
        departmentDistribution: departmentDistribution.map(d => ({ department: d._id, count: d.count })),
        semesterDistribution: semesterDistribution.map(s => ({ semester: s._id || 'Unset', count: s.count })),
        statusDistribution: statusDistribution.map(s => ({ status: s._id, count: s.count })),
        sectionDistribution: sectionDistribution.map(s => ({ section: s._id, count: s.count }))
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// In-memory cache for faculties summary (30s TTL) with stampede deduplication
let facultiesSummaryCache = null;
let facultiesSummaryCacheExpiresAt = 0;
let facultiesSummaryInFlight = null;

const invalidateFacultiesSummaryCache = () => {
  facultiesSummaryCache = null;
  facultiesSummaryCacheExpiresAt = 0;
};

// GET /api/admin/faculties-summary
const getFacultiesSummary = async (req, res) => {
  try {
    if (facultiesSummaryCache && Date.now() < facultiesSummaryCacheExpiresAt) {
      if (res.headersSent) return;
      return res.json({ success: true, faculties: facultiesSummaryCache });
    }

    if (!facultiesSummaryInFlight) {
      facultiesSummaryInFlight = (async () => {
        const faculties = await Faculty.find({ status: { $ne: 'archived' } }).sort({ name: 1 }).lean();

        const summary = await Promise.all(faculties.map(async (f) => {
          const departments = await Department.find({ faculty: f._id, status: { $ne: 'archived' } })
            .populate('headTeacher', 'name teacherId designation contactNo email')
            .sort({ code: 1 })
            .lean();

          const deptCodes = departments.map(d => d.code);

          const [teachersCount, studentsCount, coursesCount, activeOfferingsCount] = await Promise.all([
            Teacher.countDocuments({
              $or: [{ facultyRef: f._id }, { department: { $in: deptCodes } }],
              status: 'active'
            }),
            Student.countDocuments({
              $or: [{ facultyRef: f._id }, { department: { $in: deptCodes } }],
              status: 'active'
            }),
            Course.countDocuments({
              $or: [{ faculty: f._id }, { departmentCode: { $in: deptCodes } }],
              status: 'active'
            }),
            CourseOffering.countDocuments({
              departmentCode: { $in: deptCodes },
              status: 'active'
            })
          ]);

          const deptSummaries = await Promise.all(departments.map(async (d) => {
            const [dT, dS, dC, dOff, dAss] = await Promise.all([
              Teacher.countDocuments({ $or: [{ departmentRef: d._id }, { department: d.code }], status: 'active' }),
              Student.countDocuments({ $or: [{ departmentRef: d._id }, { department: d.code }], status: 'active' }),
              Course.countDocuments({ $or: [{ department: d._id }, { departmentCode: d.code }], status: 'active' }),
              CourseOffering.countDocuments({ departmentCode: d.code, status: 'active' }),
              TeacherAssignment.countDocuments({ departmentCode: d.code, status: 'active' })
            ]);

            return {
              _id: d._id,
              name: d.name,
              code: d.code,
              headName: d.headName || d.headTeacher?.name || 'Unassigned',
              headId: d.headId || d.headTeacher?.teacherId || '',
              headTeacher: d.headTeacher || null,
              teachersCount: dT,
              studentsCount: dS,
              coursesCount: dC,
              activeOfferingsCount: dOff,
              activeAssignmentsCount: dAss,
              status: d.status
            };
          }));

          return {
            _id: f._id,
            name: f.name,
            code: f.code,
            deanName: f.deanName || '',
            description: f.description || '',
            status: f.status,
            stats: {
              departmentsCount: departments.length,
              teachersCount,
              studentsCount,
              coursesCount,
              activeOfferingsCount
            },
            departments: deptSummaries
          };
        }));

        facultiesSummaryCache = summary;
        facultiesSummaryCacheExpiresAt = Date.now() + 30 * 1000;
        return summary;
      })();

      facultiesSummaryInFlight.finally(() => {
        facultiesSummaryInFlight = null;
      });
    }

    const summary = await facultiesSummaryInFlight;
    if (res.headersSent) return;
    return res.json({ success: true, faculties: summary });
  } catch (error) {
    if (res.headersSent) return;
    console.error('getFacultiesSummary error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Cache for Department Overview (30s TTL) with stampede deduplication
const deptOverviewCache = new Map();
const deptOverviewInFlight = new Map();
const DEPT_OVERVIEW_TTL = 30 * 1000;

const invalidateDeptOverviewCache = (deptCode) => {
  if (deptCode) {
    deptOverviewCache.delete(deptCode.toUpperCase());
  } else {
    deptOverviewCache.clear();
  }
};

// GET /api/admin/departments/:deptCode/overview
const getDepartmentOverview = async (req, res) => {
  try {
    const { deptCode } = req.params;
    const cleanCode = deptCode.trim().toUpperCase();

    // Check cache
    const cached = deptOverviewCache.get(cleanCode);
    if (cached && (Date.now() - cached.timestamp < DEPT_OVERVIEW_TTL)) {
      if (res.headersSent) return;
      return res.json(cached.data);
    }

    if (!deptOverviewInFlight.has(cleanCode)) {
      const task = (async () => {
        const department = await Department.findOne({
          $or: [
            { code: cleanCode },
            ...(mongoose.Types.ObjectId.isValid(deptCode) ? [{ _id: deptCode }] : [])
          ]
        })
          .populate('faculty', 'name code deanName')
          .populate('headTeacher', 'name teacherId designation contactNo email dutyStatus status')
          .populate('headUser', 'loginIdentifier email phone role status')
          .lean();

        if (!department) {
          return { notFound: true };
        }

        const [
          teachersCount,
          studentsCount,
          coursesCount,
          activeOfferingsCount,
          activeAssignmentsCount,
          recentHeadHistory
        ] = await Promise.all([
          Teacher.countDocuments({ $or: [{ departmentRef: department._id }, { department: department.code }], status: 'active' }),
          Student.countDocuments({ $or: [{ departmentRef: department._id }, { department: department.code }], status: 'active' }),
          Course.countDocuments({ $or: [{ department: department._id }, { departmentCode: department.code }], status: 'active' }),
          CourseOffering.countDocuments({ departmentCode: department.code, status: 'active' }),
          TeacherAssignment.countDocuments({ departmentCode: department.code, status: 'active' }),
          DepartmentHeadHistory.find({ departmentCode: department.code })
            .populate('previousHead', 'name teacherId designation')
            .populate('newHead', 'name teacherId designation')
            .sort({ effectiveDate: -1, createdAt: -1 })
            .limit(5)
            .lean()
        ]);

        const unassignedOfferingsCount = Math.max(0, activeOfferingsCount - activeAssignmentsCount);

        const payload = {
          success: true,
          department,
          stats: {
            teachersCount,
            studentsCount,
            coursesCount,
            activeOfferingsCount,
            activeAssignmentsCount,
            unassignedOfferingsCount
          },
          recentHeadHistory
        };

        deptOverviewCache.set(cleanCode, { data: payload, timestamp: Date.now() });
        return payload;
      })();

      deptOverviewInFlight.set(cleanCode, task);
      task.finally(() => deptOverviewInFlight.delete(cleanCode));
    }

    const payload = await deptOverviewInFlight.get(cleanCode);
    if (res.headersSent) return;
    if (payload?.notFound) {
      return res.status(404).json({ success: false, message: `Department '${cleanCode}' not found` });
    }
    return res.json(payload);
  } catch (error) {
    if (res.headersSent) return;
    console.error('getDepartmentOverview error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/departments/:deptCode/head-history
const getDepartmentHeadHistory = async (req, res) => {
  try {
    const { deptCode } = req.params;
    const cleanCode = deptCode.trim().toUpperCase();

    const history = await DepartmentHeadHistory.find({ departmentCode: cleanCode })
      .populate('previousHead', 'name teacherId designation email')
      .populate('newHead', 'name teacherId designation email')
      .populate('assignedBy', 'name loginIdentifier role')
      .sort({ effectiveDate: -1, createdAt: -1 })
      .lean();

    return res.json({ success: true, departmentCode: cleanCode, history });
  } catch (error) {
    console.error('getDepartmentHeadHistory error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/departments/:deptCode/assign-head
const assignDepartmentHead = async (req, res) => {
  try {
    const { deptCode } = req.params;
    const { teacherId, reason, effectiveDate } = req.body;

    if (!teacherId) {
      return res.status(400).json({ success: false, message: 'Teacher ID is required to assign Head' });
    }

    const cleanDeptCode = (deptCode || req.body.departmentCode || '').trim().toUpperCase();
    const department = await Department.findOne({ code: cleanDeptCode });
    if (!department) {
      return res.status(404).json({ success: false, message: `Department '${cleanDeptCode}' not found` });
    }

    // Find teacher
    const teacher = await Teacher.findOne({
      $or: [
        { teacherId: teacherId.trim().toUpperCase() },
        ...(mongoose.Types.ObjectId.isValid(teacherId) ? [{ _id: teacherId }] : [])
      ]
    });
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    // Check teacher department
    if (teacher.department && teacher.department.toUpperCase() !== cleanDeptCode) {
      return res.status(400).json({
        success: false,
        message: `Teacher belongs to ${teacher.department}, but target department is ${cleanDeptCode}. Cannot assign cross-department Head.`
      });
    }

    const currentHeadTeacherId = department.headId || (department.headTeacher ? (await Teacher.findById(department.headTeacher))?.teacherId : '');
    const currentHeadName = department.headName;
    const currentHeadTeacherRef = department.headTeacher;

    // Check if same teacher is already active head
    if (currentHeadTeacherId && currentHeadTeacherId.toUpperCase() === teacher.teacherId.toUpperCase()) {
      return res.json({
        success: true,
        message: `${teacher.name} is already the active Head of Department ${cleanDeptCode}`,
        department
      });
    }

    // Demote old head if exists
    if (currentHeadTeacherRef || currentHeadTeacherId) {
      const oldTeacher = await Teacher.findOne({
        $or: [
          ...(currentHeadTeacherRef ? [{ _id: currentHeadTeacherRef }] : []),
          ...(currentHeadTeacherId ? [{ teacherId: currentHeadTeacherId.toUpperCase() }] : [])
        ]
      });

      if (oldTeacher) {
        oldTeacher.role = 'teacher';
        await oldTeacher.save();

        await User.updateMany(
          { loginIdentifierLower: oldTeacher.teacherId.toLowerCase() },
          { role: 'teacher' }
        );
      }

      await DepartmentHeadHistory.updateMany(
        { departmentCode: cleanDeptCode, status: 'active' },
        { endDate: new Date(), status: 'ended' }
      );
    }

    // Promote new head
    teacher.role = 'department_head';
    await teacher.save();

    let newHeadUser = await User.findOne({ loginIdentifierLower: teacher.teacherId.toLowerCase() });
    if (newHeadUser) {
      newHeadUser.role = 'department_head';
      await newHeadUser.save();
    } else {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Ruet@1234', salt);
      newHeadUser = await User.create({
        loginIdentifier: teacher.teacherId,
        loginIdentifierLower: teacher.teacherId.toLowerCase(),
        passwordHash,
        role: 'department_head',
        status: 'ACTIVE',
        name: teacher.name,
        email: teacher.email || '',
        phone: teacher.contactNo || '',
        department: cleanDeptCode,
        departmentRef: department._id,
        profileRef: teacher._id,
        profileModel: 'Teacher'
      });
    }

    // Update Department document
    department.headTeacher = teacher._id;
    department.headId = teacher.teacherId;
    department.headName = teacher.name;
    department.headUser = newHeadUser._id;
    await department.save();

    // Create immutable DepartmentHeadHistory entry
    const historyEntry = await DepartmentHeadHistory.create({
      department: department._id,
      departmentCode: cleanDeptCode,
      faculty: department.faculty,
      facultyCode: department.facultyCode || '',
      previousHead: currentHeadTeacherRef || null,
      previousHeadId: currentHeadTeacherId || '',
      previousHeadName: currentHeadName || '',
      newHead: teacher._id,
      newHeadId: teacher.teacherId,
      newHeadName: teacher.name,
      assignedBy: req.user._id,
      assignedByName: req.user.name || 'System Admin',
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      reason: reason?.trim() || 'Department Head appointment/reassignment',
      status: 'active'
    });

    await logAudit({
      req,
      action: 'HEADSHIP_ASSIGNED',
      entity: 'DepartmentHeadHistory',
      entityId: historyEntry._id,
      details: `Appointed ${teacher.name} (${teacher.teacherId}) as Head of ${cleanDeptCode}. Previous Head: ${currentHeadName || 'None'}. Reason: ${historyEntry.reason}`,
      newValues: { departmentCode: cleanDeptCode, headId: teacher.teacherId, previousHeadId: currentHeadTeacherId }
    });

    invalidateFacultiesSummaryCache();
    invalidateDeptOverviewCache(cleanDeptCode);

    return res.status(200).json({
      success: true,
      message: `Successfully appointed ${teacher.name} as Head of Dept. of ${cleanDeptCode}`,
      department,
      historyEntry
    });
  } catch (error) {
    console.error('assignDepartmentHead error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/departments/:deptCode/remove-head
const removeDepartmentHead = async (req, res) => {
  try {
    const { deptCode } = req.params;
    const { reason } = req.body;
    const cleanCode = deptCode.trim().toUpperCase();

    const department = await Department.findOne({ code: cleanCode });
    if (!department) {
      return res.status(404).json({ success: false, message: `Department '${cleanCode}' not found` });
    }

    if (department.headTeacher) {
      const currentTeacher = await Teacher.findById(department.headTeacher);
      if (currentTeacher) {
        currentTeacher.role = 'teacher';
        await currentTeacher.save();

        await User.updateMany(
          { loginIdentifierLower: currentTeacher.teacherId.toLowerCase() },
          { role: 'teacher' }
        );
      }
    }

    await DepartmentHeadHistory.updateMany(
      { departmentCode: cleanCode, status: 'active' },
      { endDate: new Date(), status: 'ended' }
    );

    department.headTeacher = null;
    department.headId = '';
    department.headName = '';
    department.headUser = null;
    await department.save();

    await logAudit({
      req,
      action: 'HEADSHIP_REMOVED',
      entity: 'Department',
      entityId: department._id,
      details: `Removed Head of ${cleanCode}. Reason: ${reason || 'Administrative action'}`
    });

    invalidateFacultiesSummaryCache();
    invalidateDeptOverviewCache(cleanCode);

    return res.json({
      success: true,
      message: `Head of Department ${cleanCode} has been vacated`,
      department
    });
  } catch (error) {
    console.error('removeDepartmentHead error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── CURRENT TEACHER–COURSE ASSIGNMENT VISIBILITY & CONTROL ──────────────
// In-memory cache for Current Teaching Assignments (15s TTL) with stampede deduplication
const currentAssignmentsCache = new Map();
const currentAssignmentsInFlight = new Map();
const CURRENT_ASSIGNMENTS_TTL = 15 * 1000;

const invalidateCurrentAssignmentsCache = () => {
  currentAssignmentsCache.clear();
};

// GET /api/admin/teaching-assignments/current
const getCurrentTeachingAssignments = async (req, res) => {
  try {
    const {
      faculty,
      department,
      session,
      semester,
      series,
      teacherId,
      courseCode,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const cacheKey = JSON.stringify({ faculty, department, session, semester, series, teacherId, courseCode, search, page, limit });

    const cached = currentAssignmentsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CURRENT_ASSIGNMENTS_TTL)) {
      if (res.headersSent) return;
      return res.json(cached.data);
    }

    if (!currentAssignmentsInFlight.has(cacheKey)) {
      const task = (async () => {
        const query = { status: 'active' };

        if (department && department !== 'ALL') {
          query.departmentCode = department.toUpperCase();
        }
        if (faculty && faculty !== 'ALL') {
          query.facultyCode = faculty.toUpperCase();
        }
        if (session && session !== 'ALL') {
          query.academicSession = session;
        }
        if (semester && semester !== 'ALL') {
          query.semester = semester;
        }
        if (series && series !== 'ALL') {
          query.series = series;
        }
        if (teacherId) {
          query.teacherId = teacherId.toUpperCase();
        }
        if (courseCode) {
          query.courseCode = new RegExp(courseCode.trim(), 'i');
        }
        if (search) {
          const s = search.trim();
          query.$or = [
            { courseCode: new RegExp(s, 'i') },
            { courseName: new RegExp(s, 'i') },
            { teacherName: new RegExp(s, 'i') },
            { teacherId: new RegExp(s, 'i') },
            { departmentCode: new RegExp(s, 'i') }
          ];
        }

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        const [assignments, total] = await Promise.all([
          TeacherAssignment.find(query)
            .populate('teacher', 'name teacherId designation contactNo email department status')
            .populate('courseId', 'courseCode courseName credit creditHours courseType departmentCode isElective')
            .populate('courseOffering', 'courseCode courseName seriesName sessionName semesterName status')
            .sort({ updatedAt: -1, createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean(),
          TeacherAssignment.countDocuments(query)
        ]);

        // Batch compute student counts via aggregations to eliminate N+1 queries
        const offeringIds = assignments.filter(a => a.courseOffering?._id).map(a => a.courseOffering._id);
        const courseIds = assignments.filter(a => a.courseId?._id).map(a => a.courseId._id);

        const enrollmentCounts = (offeringIds.length > 0 || courseIds.length > 0) ? await FinalEnrollment.aggregate([
          {
            $match: {
              status: 'active',
              $or: [
                ...(offeringIds.length > 0 ? [{ courseOfferingId: { $in: offeringIds } }] : []),
                ...(courseIds.length > 0 ? [{ courseId: { $in: courseIds } }] : [])
              ]
            }
          },
          {
            $group: {
              _id: {
                offeringId: '$courseOfferingId',
                courseId: '$courseId'
              },
              count: { $sum: 1 }
            }
          }
        ]) : [];

        const enrollmentMap = new Map();
        enrollmentCounts.forEach(item => {
          if (item._id?.offeringId) {
            enrollmentMap.set(item._id.offeringId.toString(), item.count);
          }
          if (item._id?.courseId) {
            const existing = enrollmentMap.get(item._id.courseId.toString()) || 0;
            enrollmentMap.set(item._id.courseId.toString(), Math.max(existing, item.count));
          }
        });

        const depts = [...new Set(assignments.map(a => a.departmentCode).filter(Boolean))];
        const seriesList = [...new Set(assignments.map(a => a.series || '22').filter(Boolean))];

        const studentCounts = (depts.length > 0) ? await Student.aggregate([
          {
            $match: {
              status: 'active',
              department: { $in: depts },
              series: { $in: seriesList }
            }
          },
          {
            $group: {
              _id: { department: '$department', series: '$series' },
              count: { $sum: 1 }
            }
          }
        ]) : [];

        const studentCountMap = new Map();
        studentCounts.forEach(sc => {
          studentCountMap.set(`${sc._id.department}_${sc._id.series}`, sc.count);
        });

        const enriched = assignments.map((a) => {
          let studentCount = 0;
          if (a.courseOffering) {
            const offId = a.courseOffering._id ? a.courseOffering._id.toString() : null;
            const cId = a.courseId?._id ? a.courseId._id.toString() : null;
            studentCount = (offId && enrollmentMap.get(offId)) || (cId && enrollmentMap.get(cId)) || 0;
            if (studentCount === 0) {
              studentCount = studentCountMap.get(`${a.departmentCode}_${a.series || '22'}`) || 0;
            }
          }
          return {
            ...a,
            studentCount
          };
        });

        const resultPayload = {
          success: true,
          assignments: enriched,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        };

        currentAssignmentsCache.set(cacheKey, { data: resultPayload, timestamp: Date.now() });
        return resultPayload;
      })();

      currentAssignmentsInFlight.set(cacheKey, task);
      task.finally(() => currentAssignmentsInFlight.delete(cacheKey));
    }

    const payload = await currentAssignmentsInFlight.get(cacheKey);
    if (res.headersSent) return;
    return res.json(payload);
  } catch (error) {
    if (res.headersSent) return;
    console.error('getCurrentTeachingAssignments error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/teachers/:id/teaching-overview
const getTeacherTeachingOverview = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findOne({
      $or: [
        { teacherId: id.trim().toUpperCase() },
        ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : [])
      ]
    }).populate('departmentRef').populate('facultyRef').lean();

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    const activeAssignments = await TeacherAssignment.find({
      $or: [{ teacherId: teacher.teacherId }, { teacher: teacher._id }],
      status: 'active'
    })
      .populate('courseId')
      .populate('courseOffering')
      .sort({ createdAt: -1 })
      .lean();

    const historicalAssignments = await TeacherAssignment.find({
      $or: [{ teacherId: teacher.teacherId }, { teacher: teacher._id }],
      status: { $in: ['revoked', 'expired', 'completed'] }
    })
      .populate('courseId')
      .populate('courseOffering')
      .sort({ createdAt: -1 })
      .lean();

    let theoryCoursesCount = 0;
    let labCoursesCount = 0;
    let totalCredits = 0;
    let totalStudents = 0;

    const enrichedCurrent = await Promise.all(activeAssignments.map(async (a) => {
      const isLab = a.courseId?.courseType === 'Lab' || a.courseId?.courseType === 'Sessional' || a.role === 'LAB_TEACHER';
      if (isLab) labCoursesCount++;
      else theoryCoursesCount++;

      const credits = a.courseId?.credit || a.courseId?.creditHours || 3.0;
      totalCredits += credits;

      let studentCount = await FinalEnrollment.countDocuments({
        $or: [
          { courseOfferingId: a.courseOffering?._id },
          { courseId: a.courseId?._id }
        ],
        status: 'active'
      });
      if (studentCount === 0) {
        studentCount = await Student.countDocuments({
          department: a.departmentCode || teacher.department,
          series: a.series || '22',
          status: 'active'
        });
      }
      totalStudents += studentCount;

      return {
        ...a,
        studentCount,
        credit: credits,
        courseType: a.courseId?.courseType || (isLab ? 'Sessional' : 'Theory')
      };
    }));

    const departmentDoc = await Department.findOne({ code: teacher.department });
    const isCurrentHead = departmentDoc && (
      (departmentDoc.headId && departmentDoc.headId.toUpperCase() === teacher.teacherId.toUpperCase()) ||
      (departmentDoc.headTeacher && departmentDoc.headTeacher.toString() === teacher._id.toString())
    );

    return res.json({
      success: true,
      teacher: {
        ...teacher,
        isCurrentHead: !!isCurrentHead
      },
      workload: {
        totalCourses: activeAssignments.length,
        theoryCoursesCount,
        labCoursesCount,
        totalCredits,
        totalStudents
      },
      currentCourses: enrichedCurrent,
      courseHistory: historicalAssignments
    });
  } catch (error) {
    console.error('getTeacherTeachingOverview error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/courses/:id/teaching-roster
const getCourseTeachingRoster = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findOne({
      $or: [
        { courseCode: id.trim().toUpperCase() },
        ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : [])
      ]
    }).lean();

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const activeAssignments = await TeacherAssignment.find({
      $or: [{ courseCode: course.courseCode }, { courseId: course._id }],
      status: 'active'
    })
      .populate('teacher', 'name teacherId designation email contactNo department')
      .lean();

    const enrollments = await FinalEnrollment.find({
      courseId: course._id,
      status: 'active'
    }).populate('studentId', 'name rollNumber series department session registrationNumber contactNo email').lean();

    let students = enrollments.map(e => e.studentId).filter(Boolean);

    if (students.length === 0) {
      students = await Student.find({
        $or: [
          { 'enrolledCourses.courseCode': course.courseCode },
          { department: course.departmentCode, status: 'active' }
        ]
      }).select('name rollNumber series department session registrationNumber contactNo email').limit(100).lean();
    }

    return res.json({
      success: true,
      course,
      assignedTeachers: activeAssignments,
      students,
      studentCount: students.length
    });
  } catch (error) {
    console.error('getCourseTeachingRoster error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/teaching-assignments
const createTeachingAssignment = async (req, res) => {
  try {
    const {
      courseCode,
      teacherId,
      role = 'PRIMARY_TEACHER',
      series = '22',
      academicSession = '2024-2025',
      semester = '3-2',
      notes = '',
      allowCrossDepartment = false
    } = req.body;

    if (!courseCode || !teacherId) {
      return res.status(400).json({ success: false, message: 'Course Code and Teacher ID are required' });
    }

    const cleanCourseCode = courseCode.trim().toUpperCase();
    const cleanTeacherId = teacherId.trim().toUpperCase();

    const [course, teacher] = await Promise.all([
      Course.findOne({ courseCode: cleanCourseCode }),
      Teacher.findOne({ teacherId: cleanTeacherId })
    ]);

    if (!course) {
      return res.status(404).json({ success: false, message: `Course ${cleanCourseCode} not found` });
    }
    if (!teacher) {
      return res.status(404).json({ success: false, message: `Teacher ${cleanTeacherId} not found` });
    }

    // Cross-department check
    if (!allowCrossDepartment && teacher.department && course.departmentCode && teacher.department.toUpperCase() !== course.departmentCode.toUpperCase()) {
      return res.status(400).json({
        success: false,
        message: `Teacher ${teacher.name} belongs to ${teacher.department}, but course ${cleanCourseCode} belongs to ${course.departmentCode}. Enable cross-department assignment to proceed.`
      });
    }

    // Find or create CourseOffering
    let offering = await CourseOffering.findOne({
      courseCode: cleanCourseCode,
      seriesName: series,
      sessionName: academicSession,
      semesterName: semester
    });

    if (!offering) {
      offering = await CourseOffering.create({
        course: course._id,
        courseCode: cleanCourseCode,
        courseName: course.courseName || course.title,
        department: course.department,
        departmentCode: course.departmentCode || teacher.department,
        seriesName: series,
        sessionName: academicSession,
        semesterName: semester,
        status: 'active'
      });
    }

    // Duplicate check
    const duplicate = await TeacherAssignment.findOne({
      courseOffering: offering._id,
      teacherId: cleanTeacherId,
      status: 'active'
    });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Teacher ${teacher.name} is already actively assigned to ${cleanCourseCode} (${semester} [${academicSession}])`
      });
    }

    // Primary teacher exclusivity check
    const isPrimary = role === 'PRIMARY_TEACHER' || role === 'PRIMARY';
    if (isPrimary) {
      const existingPrimary = await TeacherAssignment.findOne({
        courseOffering: offering._id,
        role: { $in: ['PRIMARY_TEACHER', 'PRIMARY'] },
        status: 'active'
      });

      if (existingPrimary) {
        existingPrimary.status = 'revoked';
        existingPrimary.endDate = new Date();
        existingPrimary.notes = `${existingPrimary.notes ? existingPrimary.notes + '; ' : ''}Replaced by ${teacher.name} (${cleanTeacherId}) on ${new Date().toISOString()}`;
        await existingPrimary.save();

        await logAudit({
          req,
          action: 'COURSE_TEACHER_REPLACED',
          entity: 'TeacherAssignment',
          entityId: existingPrimary._id,
          details: `Replaced primary teacher ${existingPrimary.teacherName} with ${teacher.name} on course ${cleanCourseCode}`,
          newValues: { courseCode: cleanCourseCode, newTeacherId: cleanTeacherId, previousTeacherId: existingPrimary.teacherId }
        });
      }
    }

    const assignment = await TeacherAssignment.create({
      courseOffering: offering._id,
      teacher: teacher._id,
      teacherId: cleanTeacherId,
      teacherName: teacher.name,
      courseId: course._id,
      courseCode: cleanCourseCode,
      courseName: course.courseName || course.title,
      department: course.department,
      departmentCode: course.departmentCode || teacher.department,
      faculty: course.faculty,
      facultyCode: course.facultyCode || '',
      role: role.toUpperCase(),
      semester,
      academicSession,
      series,
      assignedBy: req.user._id,
      assignedByName: req.user.name || 'System Admin',
      assignedAt: new Date(),
      status: 'active',
      notes
    });

    await logAudit({
      req,
      action: 'COURSE_TEACHER_ASSIGNED',
      entity: 'TeacherAssignment',
      entityId: assignment._id,
      details: `Assigned ${teacher.name} (${cleanTeacherId}) to ${cleanCourseCode} as ${role} for ${semester} [${academicSession}]`,
      newValues: { courseCode: cleanCourseCode, teacherId: cleanTeacherId, role }
    });

    invalidateDeptOverviewCache(assignment.departmentCode);
    invalidateCurrentAssignmentsCache();
    return res.status(201).json({
      success: true,
      message: `Course ${cleanCourseCode} successfully assigned to ${teacher.name}`,
      assignment
    });
  } catch (error) {
    console.error('createTeachingAssignment error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/admin/teaching-assignments/:id
const updateTeachingAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, status, notes } = req.body;

    const assignment = await TeacherAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    if (role) assignment.role = role.toUpperCase();
    if (notes !== undefined) assignment.notes = notes;
    if (status) {
      assignment.status = status;
      if (['revoked', 'expired', 'completed'].includes(status)) {
        assignment.endDate = new Date();
      }
    }

    await assignment.save();

    await logAudit({
      req,
      action: 'COURSE_TEACHER_UPDATED',
      entity: 'TeacherAssignment',
      entityId: assignment._id,
      details: `Updated assignment for ${assignment.teacherName} on ${assignment.courseCode}. Status: ${assignment.status}, Role: ${assignment.role}`,
      newValues: { status: assignment.status, role: assignment.role }
    });

    invalidateDeptOverviewCache(assignment.departmentCode);
    invalidateCurrentAssignmentsCache();
    return res.json({
      success: true,
      message: 'Teaching assignment updated successfully',
      assignment
    });
  } catch (error) {
    console.error('updateTeachingAssignment error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/admin/teaching-assignments/:id
const deleteTeachingAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await TeacherAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    assignment.status = 'revoked';
    assignment.endDate = new Date();
    await assignment.save();

    await logAudit({
      req,
      action: 'COURSE_TEACHER_REVOKED',
      entity: 'TeacherAssignment',
      entityId: assignment._id,
      details: `Revoked teaching assignment for ${assignment.teacherName} on ${assignment.courseCode}`,
      newValues: { status: 'revoked' }
    });

    invalidateDeptOverviewCache(assignment.departmentCode);
    invalidateCurrentAssignmentsCache();
    return res.json({
      success: true,
      message: 'Teaching assignment revoked successfully'
    });
  } catch (error) {
    console.error('deleteTeachingAssignment error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── SYSTEM SETTINGS ────────────────────────────────────────────────────
let systemSettingsCache = {
  currentSession: '2025-2026',
  currentSemester: '3-2',
  currentSeries: '22',
  studentSignupEnabled: true,
  teacherSignupEnabled: true,
  headSignupEnabled: true,
  electiveVotingEnabled: true,
  votingDeadline: '2026-12-31',
  maintenanceMode: false
};

const getSystemSettings = async (req, res) => {
  try {
    return res.json({
      success: true,
      settings: systemSettingsCache
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateSystemSettings = async (req, res) => {
  try {
    const updates = req.body;
    systemSettingsCache = {
      ...systemSettingsCache,
      ...updates
    };

    await logAudit({
      req,
      action: 'SYSTEM_SETTINGS_UPDATED',
      entity: 'SystemSettings',
      details: 'Updated global system settings',
      newValues: systemSettingsCache
    });

    return res.json({
      success: true,
      message: 'System settings updated successfully',
      settings: systemSettingsCache
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSystemStats,
  getAllTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  toggleDeactivateStudent,
  resetStudentPassword,
  bulkStudentAction,
  getDepartmentCourses,
  assignCourseToTeacher,
  revokeCourseAssignment,
  getTeacherAssignedCourses,
  transferHeadship,
  getAdminRequests,
  getStudentStats,
  // Hierarchical Navigation & Head Management
  getFacultiesSummary,
  getDepartmentOverview,
  getDepartmentHeadHistory,
  assignDepartmentHead,
  removeDepartmentHead,
  // Current Teaching Assignments
  getCurrentTeachingAssignments,
  getTeacherTeachingOverview,
  getCourseTeachingRoster,
  createTeachingAssignment,
  updateTeachingAssignment,
  deleteTeachingAssignment,
  // System Settings
  getSystemSettings,
  updateSystemSettings
};
