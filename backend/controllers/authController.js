const jwt     = require('jsonwebtoken');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Admin   = require('../models/Admin');

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });

// ── Student Register ────────────────────────────────────────────────
// POST /api/auth/student-register
const registerStudent = async (req, res) => {
  try {
    const { name, series, rollNumber, department, contactNo, password } = req.body;
    if (!name || !series || !rollNumber || !department || !contactNo || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const exists = await Student.findOne({ rollNumber });
    if (exists) return res.status(400).json({ message: 'Student with this ID already exists' });

    const student = await Student.create({ name, series, rollNumber, department, contactNo, password });
    res.status(201).json({
      _id:       student._id,
      name:      student.name,
      rollNumber:student.rollNumber,
      series:    student.series,
      department:student.department,
      contactNo: student.contactNo,
      role:      student.role,
      token:     generateToken(student._id, student.role),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Student Login ───────────────────────────────────────────────────
// POST /api/auth/student-login
const loginStudent = async (req, res) => {
  try {
    const { rollNumber, password } = req.body;
    const student = await Student.findOne({ rollNumber });
    if (student && (await student.matchPassword(password))) {
      res.json({
        _id:       student._id,
        name:      student.name,
        rollNumber:student.rollNumber,
        series:    student.series,
        department:student.department,
        contactNo: student.contactNo,
        role:      student.role,
        token:     generateToken(student._id, student.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid Student ID or password' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Teacher Register ────────────────────────────────────────────────
// POST /api/auth/teacher-register
const registerTeacher = async (req, res) => {
  try {
    const { name, teacherId, department, contactNo, password } = req.body;
    if (!name || !teacherId || !department || !contactNo || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const exists = await Teacher.findOne({ teacherId: teacherId.toUpperCase() });
    if (exists) return res.status(400).json({ message: 'Teacher with this ID already exists' });

    const teacher = await Teacher.create({
      name, teacherId: teacherId.toUpperCase(), department, contactNo, password,
    });
    res.status(201).json({
      _id:       teacher._id,
      name:      teacher.name,
      teacherId: teacher.teacherId,
      department:teacher.department,
      contactNo: teacher.contactNo,
      role:      teacher.role,
      allocatedCourses: teacher.allocatedCourses,
      token:     generateToken(teacher._id, teacher.role),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Teacher Login ───────────────────────────────────────────────────
// POST /api/auth/teacher-login
const loginTeacher = async (req, res) => {
  try {
    const { teacherId, password } = req.body;
    const teacher = await Teacher.findOne({ teacherId: teacherId?.toUpperCase() });
    if (teacher && (await teacher.matchPassword(password))) {
      res.json({
        _id:       teacher._id,
        name:      teacher.name,
        teacherId: teacher.teacherId,
        department:teacher.department,
        contactNo: teacher.contactNo,
        role:      teacher.role,
        allocatedCourses: teacher.allocatedCourses,
        token:     generateToken(teacher._id, teacher.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid Teacher ID or password' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin Register ──────────────────────────────────────────────────
// POST /api/auth/admin-register
const registerAdmin = async (req, res) => {
  try {
    const { name, username, email, contactNo, password } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'Name, username, email, and password are required' });
    }
    const exists = await Admin.findOne({
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }]
    });
    if (exists) return res.status(400).json({ message: 'Admin with this username or email already exists' });

    const admin = await Admin.create({
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      contactNo: contactNo || '',
      password,
      role: 'admin',
    });
    res.status(201).json({
      _id:       admin._id,
      name:      admin.name,
      username:  admin.username,
      email:     admin.email,
      contactNo: admin.contactNo,
      role:      admin.role,
      token:     generateToken(admin._id, admin.role),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin Login ─────────────────────────────────────────────────────
// POST /api/auth/admin-login
const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username/email and password are required' });
    }

    const admin = await Admin.findOne({
      $or: [
        { username: username.trim().toLowerCase() },
        { email: username.trim().toLowerCase() }
      ]
    });

    if (admin && (await admin.matchPassword(password))) {
      res.json({
        _id:       admin._id,
        name:      admin.name,
        username:  admin.username,
        email:     admin.email,
        contactNo: admin.contactNo,
        role:      admin.role,
        token:     generateToken(admin._id, admin.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid Admin credentials' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  registerStudent,
  loginStudent,
  registerTeacher,
  loginTeacher,
  registerAdmin,
  loginAdmin
};
