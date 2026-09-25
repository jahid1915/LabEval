const jwt     = require('jsonwebtoken');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Admin   = require('../models/Admin');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');

const generateToken = (id, role, departmentCode = '') =>
  jwt.sign({ id, role, departmentCode }, process.env.JWT_SECRET, { expiresIn: '30d' });

// ── Student Register ────────────────────────────────────────────────
// POST /api/auth/student-register
const registerStudent = async (req, res) => {
  try {
    const { name, series, rollNumber, department, contactNo, password } = req.body;
    if (!name || !series || !rollNumber || !department || !contactNo || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const cleanRoll = rollNumber.trim().toUpperCase();
    const cleanDept = department.trim().toUpperCase();
    const exists = await Student.findOne({ rollNumber: cleanRoll });
    if (exists) return res.status(400).json({ message: 'Student with this ID already exists' });

    const deptDoc = await Department.findOne({ code: cleanDept });

    const student = await Student.create({
      name: name.trim(),
      series: series.trim(),
      rollNumber: cleanRoll,
      department: cleanDept,
      departmentRef: deptDoc?._id,
      facultyRef: deptDoc?.faculty,
      contactNo: contactNo.trim(),
      password,
      role: 'student'
    });

    res.status(201).json({
      _id:       student._id,
      name:      student.name,
      rollNumber:student.rollNumber,
      series:    student.series,
      department:student.department,
      contactNo: student.contactNo,
      role:      student.role,
      token:     generateToken(student._id, student.role, student.department),
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
    if (!rollNumber || !password) {
      return res.status(400).json({ message: 'Roll number and password are required' });
    }
    const cleanRoll = rollNumber.trim();
    const student = await Student.findOne({ rollNumber: cleanRoll })
      .populate('departmentRef', 'name code')
      .populate('facultyRef', 'name code');

    if (student && (await student.matchPassword(password))) {
      res.json({
        _id:        student._id,
        name:       student.name,
        rollNumber: student.rollNumber,
        series:     student.series,
        department: student.department,
        departmentName: student.departmentRef?.name || student.department,
        facultyName: student.facultyRef?.name || 'Faculty of Electrical & Computer Engineering',
        contactNo:  student.contactNo,
        role:       student.role,
        token:      generateToken(student._id, student.role, student.department),
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
    const { name, teacherId, department, contactNo, password, designation, email } = req.body;
    if (!name || !teacherId || !department || !contactNo || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const cleanId = teacherId.trim().toUpperCase();
    const cleanDept = department.trim().toUpperCase();
    const exists = await Teacher.findOne({ teacherId: cleanId });
    if (exists) return res.status(400).json({ message: 'Teacher with this ID already exists' });

    const deptDoc = await Department.findOne({ code: cleanDept });

    const teacher = await Teacher.create({
      name: name.trim(),
      teacherId: cleanId,
      department: cleanDept,
      departmentRef: deptDoc?._id,
      facultyRef: deptDoc?.faculty,
      designation: designation || 'Lecturer',
      email: email ? email.trim().toLowerCase() : '',
      contactNo: contactNo.trim(),
      password,
      role: 'teacher'
    });

    res.status(201).json({
      _id:       teacher._id,
      name:      teacher.name,
      teacherId: teacher.teacherId,
      department:teacher.department,
      designation: teacher.designation,
      contactNo: teacher.contactNo,
      role:      teacher.role,
      token:     generateToken(teacher._id, teacher.role, teacher.department),
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
    if (!teacherId || !password) {
      return res.status(400).json({ message: 'Teacher ID and password are required' });
    }
    const cleanId = teacherId.trim().toUpperCase();
    const teacher = await Teacher.findOne({ teacherId: cleanId })
      .populate('departmentRef', 'name code')
      .populate('facultyRef', 'name code');

    if (teacher && (await teacher.matchPassword(password))) {
      res.json({
        _id:        teacher._id,
        name:       teacher.name,
        teacherId:  teacher.teacherId,
        department: teacher.department,
        departmentName: teacher.departmentRef?.name || teacher.department,
        facultyName: teacher.facultyRef?.name || 'Faculty of Electrical & Computer Engineering',
        designation: teacher.designation,
        dutyStatus: teacher.dutyStatus,
        contactNo:  teacher.contactNo,
        role:       teacher.role,
        token:      generateToken(teacher._id, teacher.role, teacher.department),
      });
    } else {
      res.status(401).json({ message: 'Invalid Teacher ID or password' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin / Department Head Register ────────────────────────────────
// POST /api/auth/admin-register
const registerAdmin = async (req, res) => {
  try {
    const {
      name,
      username,
      email,
      contactNo,
      password,
      facultyId,
      departmentId,
      designation,
      facultyCode,
      departmentCode,
      facultyName,
      departmentName
    } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'Name, username, email, and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    const exists = await Admin.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }]
    });
    if (exists) return res.status(400).json({ message: 'Admin with this username or email already exists' });

    let deptDoc = null;
    let facultyDoc = null;

    if (departmentId) {
      deptDoc = await Department.findById(departmentId);
    } else if (departmentCode) {
      deptDoc = await Department.findOne({ code: departmentCode.toUpperCase() });
    }

    if (facultyId) {
      facultyDoc = await Faculty.findById(facultyId);
    } else if (facultyCode) {
      facultyDoc = await Faculty.findOne({ code: facultyCode.toUpperCase() });
    } else if (deptDoc?.faculty) {
      facultyDoc = await Faculty.findById(deptDoc.faculty);
    }

    const resolvedDeptCode = deptDoc?.code || departmentCode || '';
    const resolvedDeptName = deptDoc?.name || departmentName || '';
    const resolvedFacultyCode = facultyDoc?.code || facultyCode || '';
    const resolvedFacultyName = facultyDoc?.name || facultyName || '';

    const admin = await Admin.create({
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      contactNo: contactNo ? contactNo.trim() : '',
      password,
      role: resolvedDeptCode ? 'department_head' : 'admin',
      designation: designation || (resolvedDeptCode ? `Head of ${resolvedDeptCode} Department` : 'System Administrator'),
      faculty: facultyDoc?._id,
      facultyCode: resolvedFacultyCode,
      facultyName: resolvedFacultyName,
      department: deptDoc?._id,
      departmentCode: resolvedDeptCode,
      departmentName: resolvedDeptName,
      status: 'active'
    });

    res.status(201).json({
      _id:            admin._id,
      name:           admin.name,
      username:       admin.username,
      email:          admin.email,
      contactNo:      admin.contactNo,
      role:           'admin',
      adminRole:      admin.role,
      designation:    admin.designation,
      facultyId:      admin.faculty,
      facultyCode:    admin.facultyCode,
      facultyName:    admin.facultyName,
      departmentId:   admin.department,
      departmentCode: admin.departmentCode,
      departmentName: admin.departmentName,
      token:          generateToken(admin._id, admin.role, admin.departmentCode),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin / Department Head Login ───────────────────────────────────
// POST /api/auth/admin-login
const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username/email and password are required' });
    }

    const cleanInput = username.trim().toLowerCase();
    const admin = await Admin.findOne({
      $or: [
        { username: cleanInput },
        { email: cleanInput }
      ]
    }).populate('department').populate('faculty');

    if (admin && (await admin.matchPassword(password))) {
      const deptCode = admin.departmentCode || admin.department?.code || '';
      const deptName = admin.departmentName || admin.department?.name || '';
      const facultyCode = admin.facultyCode || admin.faculty?.code || '';
      const facultyName = admin.facultyName || admin.faculty?.name || '';

      res.json({
        _id:            admin._id,
        name:           admin.name,
        username:       admin.username,
        email:          admin.email,
        contactNo:      admin.contactNo,
        role:           'admin',
        adminRole:      admin.role || 'department_head',
        designation:    admin.designation || (deptCode ? `Head of ${deptCode} Department` : 'Administrator'),
        facultyId:      admin.faculty?._id || admin.faculty,
        facultyCode,
        facultyName,
        departmentId:   admin.department?._id || admin.department,
        departmentCode: deptCode,
        departmentName: deptName,
        token:          generateToken(admin._id, admin.role || 'department_head', deptCode),
      });
    } else {
      res.status(401).json({ message: 'Invalid Admin or Department Head credentials' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Demo Login ──────────────────────────────────────────────────────
// POST /api/auth/demo-login
const demoLogin = async (req, res) => {
  try {
    const { role } = req.body;

    // Student Demo: Md. Jahid Hasan (Roll: 2204028, ETE, 22 Series)
    if (role === 'student') {
      let student = await Student.findOne({ rollNumber: '2204028' });
      if (!student) {
        const eteDept = await Department.findOne({ code: 'ETE' });
        student = await Student.create({
          name: 'Md. Jahid Hasan',
          series: '22',
          rollNumber: '2204028',
          department: 'ETE',
          departmentRef: eteDept?._id,
          facultyRef: eteDept?.faculty,
          contactNo: '01712345678',
          password: 'password123',
          role: 'student'
        });
      }
      return res.json({
        _id:        student._id,
        name:       student.name,
        rollNumber: student.rollNumber,
        series:     student.series,
        department: student.department,
        departmentName: 'Electronics & Telecommunication Engineering',
        facultyName: 'Faculty of Electrical & Computer Engineering',
        contactNo:  student.contactNo,
        role:       'student',
        token:      generateToken(student._id, 'student', student.department),
      });
    }

    // Teacher Demo: Md Abu Ismail Siddique (ETE-294) - Dept of ETE, RUET
    if (role === 'teacher') {
      let teacher = await Teacher.findOne({ teacherId: 'ETE-294' });
      if (!teacher) {
        const eteDept = await Department.findOne({ code: 'ETE' });
        teacher = await Teacher.create({
          name: 'Md Abu Ismail Siddique',
          teacherId: 'ETE-294',
          designation: 'Assistant Professor',
          department: 'ETE',
          departmentRef: eteDept?._id,
          facultyRef: eteDept?.faculty,
          contactNo: '01712345679',
          email: 'saif101303@gmail.com',
          password: 'password123',
          role: 'teacher'
        });
      }
      return res.json({
        _id:        teacher._id,
        name:       teacher.name,
        teacherId:  teacher.teacherId,
        designation: teacher.designation,
        department: teacher.department,
        departmentName: 'Electronics & Telecommunication Engineering',
        facultyName: 'Faculty of Electrical & Computer Engineering',
        contactNo:  teacher.contactNo,
        role:       'teacher',
        token:      generateToken(teacher._id, 'teacher', teacher.department),
      });
    }

    // Department Head Demo: ETE
    if (role === 'department_head_ete' || role === 'admin') {
      const eteDept = await Department.findOne({ code: 'ETE' });
      const eceFaculty = await Faculty.findOne({ code: 'ECE' });

      let admin = await Admin.findOne({ username: 'head-ete' });
      if (!admin) {
        admin = await Admin.create({
          name: 'Dr. Md. Head ETE',
          username: 'head-ete',
          email: 'head@ete.ruet.ac.bd',
          contactNo: '01700000101',
          password: 'password123',
          role: 'department_head',
          designation: 'Head of ETE Department',
          faculty: eceFaculty?._id,
          facultyCode: 'ECE',
          facultyName: 'Faculty of Electrical & Computer Engineering',
          department: eteDept?._id,
          departmentCode: 'ETE',
          departmentName: 'Electronics & Telecommunication Engineering',
          status: 'active'
        });
      } else {
        admin.departmentCode = 'ETE';
        admin.departmentName = 'Electronics & Telecommunication Engineering';
        admin.facultyCode = 'ECE';
        admin.facultyName = 'Faculty of Electrical & Computer Engineering';
        admin.department = eteDept?._id;
        admin.faculty = eceFaculty?._id;
        admin.role = 'department_head';
        await admin.save();
      }

      return res.json({
        _id:            admin._id,
        name:           admin.name,
        username:       admin.username,
        email:          admin.email,
        contactNo:      admin.contactNo,
        role:           admin.role,
        designation:    admin.designation,
        facultyCode:    'ECE',
        facultyName:    'Faculty of Electrical & Computer Engineering',
        departmentCode: 'ETE',
        departmentName: 'Electronics & Telecommunication Engineering',
        token:          generateToken(admin._id, admin.role, 'ETE'),
      });
    }

    // Department Head Demo: EEE
    if (role === 'department_head_eee') {
      const eeeDept = await Department.findOne({ code: 'EEE' });
      const eceFaculty = await Faculty.findOne({ code: 'ECE' });

      let admin = await Admin.findOne({ username: 'head-eee' });
      if (!admin) {
        admin = await Admin.create({
          name: 'Dr. Md. Head EEE',
          username: 'head-eee',
          email: 'head@eee.ruet.ac.bd',
          contactNo: '01700000102',
          password: 'password123',
          role: 'department_head',
          designation: 'Head of EEE Department',
          faculty: eceFaculty?._id,
          facultyCode: 'ECE',
          facultyName: 'Faculty of Electrical & Computer Engineering',
          department: eeeDept?._id,
          departmentCode: 'EEE',
          departmentName: 'Electrical & Electronic Engineering',
          status: 'active'
        });
      }

      return res.json({
        _id:            admin._id,
        name:           admin.name,
        username:       admin.username,
        email:          admin.email,
        contactNo:      admin.contactNo,
        role:           admin.role,
        designation:    admin.designation,
        facultyCode:    'ECE',
        facultyName:    'Faculty of Electrical & Computer Engineering',
        departmentCode: 'EEE',
        departmentName: 'Electrical & Electronic Engineering',
        token:          generateToken(admin._id, admin.role, 'EEE'),
      });
    }

    // Department Head Demo: CSE
    if (role === 'department_head_cse') {
      const cseDept = await Department.findOne({ code: 'CSE' });
      const eceFaculty = await Faculty.findOne({ code: 'ECE' });

      let admin = await Admin.findOne({ username: 'head-cse' });
      if (!admin) {
        admin = await Admin.create({
          name: 'Dr. Md. Head CSE',
          username: 'head-cse',
          email: 'head@cse.ruet.ac.bd',
          contactNo: '01700000103',
          password: 'password123',
          role: 'department_head',
          designation: 'Head of CSE Department',
          faculty: eceFaculty?._id,
          facultyCode: 'ECE',
          facultyName: 'Faculty of Electrical & Computer Engineering',
          department: cseDept?._id,
          departmentCode: 'CSE',
          departmentName: 'Computer Science & Engineering',
          status: 'active'
        });
      }

      return res.json({
        _id:            admin._id,
        name:           admin.name,
        username:       admin.username,
        email:          admin.email,
        contactNo:      admin.contactNo,
        role:           admin.role,
        designation:    admin.designation,
        facultyCode:    'ECE',
        facultyName:    'Faculty of Electrical & Computer Engineering',
        departmentCode: 'CSE',
        departmentName: 'Computer Science & Engineering',
        token:          generateToken(admin._id, admin.role, 'CSE'),
      });
    }

    return res.status(400).json({ message: 'Invalid role for demo login' });
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
  loginAdmin,
  demoLogin
};
