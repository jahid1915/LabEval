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

// ── GET /api/admin/stats ──────────────────────────────────────────────
const getSystemStats = async (req, res) => {
  try {
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
      Student.countDocuments({ status: 'active' }),
      Teacher.countDocuments(),
      Course.countDocuments({ status: 'active' }),
      CourseOffering.countDocuments({ status: 'active' }),
      Attendance.countDocuments(),
      Report.countDocuments(),
      Request.countDocuments({ status: 'pending' }),
      LeaveRequest.countDocuments({ status: 'pending' }),
      Teacher.countDocuments({ dutyStatus: 'ON_DUTY' }),
      Teacher.countDocuments({ dutyStatus: 'ON_LEAVE' }),
      Department.find({ status: 'active' }).select('name code')
    ]);

    // Student distribution by department
    const studentDeptDistribution = await Student.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Student distribution by series
    const studentSeriesDistribution = await Student.aggregate([
      { $group: { _id: '$series', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);

    res.json({
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

// GET /api/admin/teachers
const getAllTeachers = async (req, res) => {
  try {
    const { department, dutyStatus, search } = req.query;
    let query = {};
    if (department) query.department = department.toUpperCase();
    if (dutyStatus) query.dutyStatus = dutyStatus;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { teacherId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const teachers = await Teacher.find(query)
      .populate('departmentRef', 'name code')
      .populate('facultyRef', 'name code')
      .select('-password')
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(teachers.map(async (t) => {
      const assignments = await TeacherAssignment.find({ teacherId: t.teacherId, status: 'active' })
        .populate('courseOffering', 'courseCode courseName seriesName sessionName departmentCode');
      
      const leaveHistory = await LeaveRequest.find({ teacher: t._id }).sort({ createdAt: -1 }).limit(5);

      return {
        ...t.toObject(),
        activeAssignments: assignments,
        assignedCoursesCount: assignments.length,
        leaveHistory
      };
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/teachers
const createTeacher = async (req, res) => {
  try {
    const { name, teacherId, department, designation, contactNo, email, specialization, password, dutyStatus, joiningDate } = req.body;
    if (!name || !teacherId || !department || !password) {
      return res.status(400).json({ message: 'Name, Teacher ID, Department, and Password are required' });
    }

    const cleanId = teacherId.trim().toUpperCase();
    const cleanDept = department.trim().toUpperCase();

    const exists = await Teacher.findOne({ teacherId: cleanId });
    if (exists) return res.status(400).json({ message: 'Teacher ID already exists' });

    const deptDoc = await Department.findOne({ code: cleanDept });

    const teacher = await Teacher.create({
      name: name.trim(),
      teacherId: cleanId,
      department: cleanDept,
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

    const sanitized = teacher.toObject();
    delete sanitized.password;
    res.status(201).json(sanitized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/teachers/:id
const updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const oldValues = { ...teacher.toObject() };
    const { name, department, designation, contactNo, email, specialization, dutyStatus, status, password } = req.body;

    if (name) teacher.name = name.trim();
    if (designation) teacher.designation = designation.trim();
    if (contactNo) teacher.contactNo = contactNo.trim();
    if (email !== undefined) teacher.email = email.trim().toLowerCase();
    if (specialization !== undefined) teacher.specialization = specialization.trim();
    if (dutyStatus) teacher.dutyStatus = dutyStatus;
    if (status) teacher.status = status;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      teacher.password = await bcrypt.hash(password, salt);
    }

    if (department && department.toUpperCase() !== teacher.department) {
      teacher.department = department.trim().toUpperCase();
      const deptDoc = await Department.findOne({ code: teacher.department });
      if (deptDoc) {
        teacher.departmentRef = deptDoc._id;
        teacher.facultyRef = deptDoc.faculty;
      }
    }

    await teacher.save();

    await logAudit({
      req,
      action: 'UPDATE_TEACHER',
      entity: 'Teacher',
      entityId: teacher._id,
      details: `Updated teacher ${teacher.name} (${teacher.teacherId}) [Duty: ${teacher.dutyStatus}]`,
      oldValues,
      newValues: teacher
    });

    const sanitized = teacher.toObject();
    delete sanitized.password;
    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/teachers/:id
const deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const activeAssignments = await TeacherAssignment.countDocuments({ teacher: teacher._id, status: 'active' });
    if (activeAssignments > 0) {
      teacher.dutyStatus = 'INACTIVE';
      teacher.status = 'inactive';
      await teacher.save();
      return res.json({ message: `Teacher set to INACTIVE (${activeAssignments} active course assignments preserved)` });
    }

    await teacher.deleteOne();

    await logAudit({
      req,
      action: 'DELETE_TEACHER',
      entity: 'Teacher',
      entityId: req.params.id,
      details: `Deleted teacher ${teacher.name} (${teacher.teacherId})`
    });

    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── STUDENT MANAGEMENT ───────────────────────────────────────────────

// GET /api/admin/students
const getAllStudents = async (req, res) => {
  try {
    const { department, series, status, search, page = 1, limit = 50 } = req.query;
    let query = {};
    if (department) query.department = department.toUpperCase();
    if (series) query.series = series;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { registrationNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [students, total] = await Promise.all([
      Student.find(query)
        .populate('departmentRef', 'name code')
        .populate('seriesRef', 'name')
        .select('-password')
        .sort({ rollNumber: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Student.countDocuments(query)
    ]);

    res.json({
      students,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/students
const createStudent = async (req, res) => {
  try {
    const { name, series, rollNumber, registrationNumber, department, contactNo, email, password, status } = req.body;
    if (!name || !series || !rollNumber || !department || !password) {
      return res.status(400).json({ message: 'Name, Series, Roll Number, Department, and Password are required' });
    }

    const cleanRoll = rollNumber.trim();
    const cleanDept = department.trim().toUpperCase();
    const cleanSeries = series.trim();

    const exists = await Student.findOne({ rollNumber: cleanRoll });
    if (exists) return res.status(400).json({ message: 'Student with this Roll Number already exists' });

    const [deptDoc, seriesDoc] = await Promise.all([
      Department.findOne({ code: cleanDept }),
      Series.findOne({ name: cleanSeries, departmentCode: cleanDept })
    ]);

    const student = await Student.create({
      name: name.trim(),
      series: cleanSeries,
      seriesRef: seriesDoc ? seriesDoc._id : null,
      rollNumber: cleanRoll,
      registrationNumber: registrationNumber?.trim() || '',
      department: cleanDept,
      departmentRef: deptDoc ? deptDoc._id : null,
      facultyRef: deptDoc ? deptDoc.faculty : null,
      contactNo: contactNo?.trim() || 'N/A',
      email: email?.trim().toLowerCase() || '',
      password,
      status: status || 'active'
    });

    await logAudit({
      req,
      action: 'CREATE_STUDENT',
      entity: 'Student',
      entityId: student._id,
      details: `Created student ${student.name} (Roll: ${student.rollNumber}) in ${student.department} Series ${student.series}`,
      newValues: { name: student.name, rollNumber: student.rollNumber }
    });

    const sanitized = student.toObject();
    delete sanitized.password;
    res.status(201).json(sanitized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/students/:id
const updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const oldValues = { ...student.toObject() };
    const { name, series, rollNumber, registrationNumber, department, contactNo, email, status, password } = req.body;

    if (name) student.name = name.trim();
    if (rollNumber) student.rollNumber = rollNumber.trim();
    if (registrationNumber !== undefined) student.registrationNumber = registrationNumber.trim();
    if (contactNo !== undefined) student.contactNo = contactNo.trim();
    if (email !== undefined) student.email = email.trim().toLowerCase();
    if (status) student.status = status;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      student.password = await bcrypt.hash(password, salt);
    }

    if (department && department.toUpperCase() !== student.department) {
      student.department = department.trim().toUpperCase();
      const deptDoc = await Department.findOne({ code: student.department });
      if (deptDoc) {
        student.departmentRef = deptDoc._id;
        student.facultyRef = deptDoc.faculty;
      }
    }

    if (series && series !== student.series) {
      student.series = series.trim();
      const seriesDoc = await Series.findOne({ name: student.series, departmentCode: student.department });
      if (seriesDoc) student.seriesRef = seriesDoc._id;
    }

    await student.save();

    await logAudit({
      req,
      action: 'UPDATE_STUDENT',
      entity: 'Student',
      entityId: student._id,
      details: `Updated student ${student.name} (Roll: ${student.rollNumber})`,
      oldValues,
      newValues: student
    });

    const sanitized = student.toObject();
    delete sanitized.password;
    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/students/:id
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Check if marks or attendance records exist
    const [attCount, perfCount] = await Promise.all([
      Attendance.countDocuments({ student: student._id }),
      Performance.countDocuments({ student: student._id })
    ]);

    if (attCount > 0 || perfCount > 0) {
      student.status = 'inactive';
      await student.save();
      return res.json({ message: `Student marked inactive (${attCount + perfCount} academic evaluation records preserved)` });
    }

    await student.deleteOne();

    await logAudit({
      req,
      action: 'DELETE_STUDENT',
      entity: 'Student',
      entityId: req.params.id,
      details: `Deleted student ${student.name} (${student.rollNumber})`
    });

    res.json({ message: 'Student deleted successfully' });
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
  deleteStudent
};
