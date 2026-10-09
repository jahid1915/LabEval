const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');
const Department = require('../models/Department');
const Faculty = require('../models/Faculty');
const Series = require('../models/Series');
const AcademicSession = require('../models/AcademicSession');
const AuditLog = require('../models/AuditLog');
const { invalidateAuthCache } = require('../middleware/authMiddleware');

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Helper to log security actions
const logAudit = async (action, entity, entityId, details, user, req) => {
  try {
    await AuditLog.create({
      userId: user?._id || null,
      userRole: user?.role || 'system',
      userName: user?.name || 'Anonymous',
      action,
      entity,
      entityId: String(entityId || ''),
      details,
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || '',
      userAgent: req?.headers?.['user-agent'] || '',
    });
  } catch (e) {
    // Audit logging should never crash the main request flow
    console.error('AuditLog error:', e.message);
  }
};

// Lightweight in-memory department metadata cache (5 min TTL)
const deptMetaCache = new Map();
const getCachedDeptMeta = async (refOrCode) => {
  if (!refOrCode) return null;
  const key = String(refOrCode).toUpperCase();
  const cached = deptMetaCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  let dept = null;
  if (mongoose.Types.ObjectId.isValid(refOrCode)) {
    dept = await Department.findById(refOrCode).populate('faculty').lean();
  } else {
    dept = await Department.findOne({ code: key }).populate('faculty').lean();
  }
  if (dept) {
    deptMetaCache.set(key, { data: dept, expiresAt: Date.now() + 5 * 60 * 1000 });
  }
  return dept;
};

// Helper to format safe user object for response
const formatSafeUser = async (user, profileDoc = null) => {
  let departmentName = user.department;
  let facultyName = user.faculty;
  let currentSemester = '';
  let academicSession = '';
  let series = '';
  let designation = '';
  let profileId = profileDoc?._id || user.profileRef || user._id;

  const deptLookup = user.departmentRef || user.department;
  if (deptLookup) {
    const dept = await getCachedDeptMeta(deptLookup);
    if (dept) {
      departmentName = dept.name;
      facultyName = dept.faculty?.name || user.faculty;
    }
  }

  if (user.role === 'student') {
    const sDoc = profileDoc || await Student.findById(profileId);
    if (sDoc) {
      currentSemester = sDoc.semester || '';
      academicSession = sDoc.session || '';
      series = sDoc.series || '';
      profileId = sDoc._id;
    }
  } else if (user.role === 'teacher') {
    const tDoc = profileDoc || await Teacher.findById(profileId);
    if (tDoc) {
      designation = tDoc.designation || 'Lecturer';
      profileId = tDoc._id;
    }
  } else if (user.role === 'department_head' || user.role === 'admin') {
    const aDoc = profileDoc || await Admin.findById(profileId);
    if (aDoc) {
      designation = aDoc.designation || (user.role === 'department_head' ? `Head of ${user.department}` : 'System Administrator');
      profileId = aDoc._id;
    }
  }

  return {
    _id: profileId,
    id: profileId,
    userId: user._id,
    role: user.role,
    identifier: user.loginIdentifier,
    loginIdentifier: user.loginIdentifier,
    name: user.name,
    email: user.email || '',
    phone: user.phone || '',
    contactNo: user.phone || '',
    department: user.department || '',
    departmentCode: user.department || '',
    departmentName,
    faculty: user.faculty || '',
    facultyName,
    status: user.status,
    currentSemester,
    academicSession,
    session: academicSession,
    series,
    designation,
    mustChangePassword: user.mustChangePassword || false,
    // Role-specific convenience getters
    rollNumber: user.role === 'student' ? user.loginIdentifier : undefined,
    teacherId: user.role === 'teacher' ? user.loginIdentifier : undefined,
    headId: user.role === 'department_head' ? user.loginIdentifier : undefined,
    username: user.role === 'admin' ? user.loginIdentifier : undefined,
  };
};

// ── UNIFIED LOGIN ─────────────────────────────────────────────────────────────
// POST /api/auth/login
const login = async (req, res) => {
  try {
    const identifier = req.body.identifier || req.body.loginIdentifier || req.body.rollNumber || req.body.teacherId || req.body.headId || req.body.username;
    const password = req.body.password;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Login identifier and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const cleanIdentifier = String(identifier).trim();
    const cleanLower = cleanIdentifier.toLowerCase();

    // 1. Single-query lookup: Find user in central User collection and populate profileRef immediately
    let user = await User.findOne({ loginIdentifierLower: cleanLower }).populate('profileRef');

    // Fallback search in legacy collections if not yet synchronized
    if (!user) {
      let legacyDoc = null;
      let legacyRole = null;

      if (cleanLower === 'admin') {
        legacyDoc = await Admin.findOne({ username: 'admin' });
        legacyRole = 'admin';
      } else {
        legacyDoc = await Student.findOne({ rollNumber: cleanIdentifier });
        if (legacyDoc) legacyRole = 'student';
        else {
          legacyDoc = await Teacher.findOne({ teacherId: cleanIdentifier.toUpperCase() });
          if (legacyDoc) legacyRole = 'teacher';
          else {
            legacyDoc = await Admin.findOne({ $or: [{ username: cleanLower }, { headId: cleanIdentifier.toUpperCase() }] });
            if (legacyDoc) legacyRole = legacyDoc.role === 'department_head' ? 'department_head' : 'admin';
          }
        }
      }

      if (legacyDoc) {
        user = await User.create({
          loginIdentifier: cleanIdentifier,
          loginIdentifierLower: cleanLower,
          passwordHash: legacyDoc.password,
          role: legacyRole,
          status: legacyDoc.status === 'inactive' ? 'INACTIVE' : 'ACTIVE',
          name: legacyDoc.name,
          email: legacyDoc.email || '',
          phone: legacyDoc.contactNo || '',
          department: legacyDoc.department || legacyDoc.departmentCode || '',
          profileRef: legacyDoc._id,
          profileModel: legacyRole === 'student' ? 'Student' : (legacyRole === 'teacher' ? 'Teacher' : 'Admin'),
        });
        user.profileRef = legacyDoc;
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your ID and password.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // 2. Check Account Status (In-memory verification)
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'This account has been suspended. Please contact the administrator.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }
    if (user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'This account is currently inactive. Please contact the administrator.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // 3. Check Lockout Status
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      return res.status(423).json({
        success: false,
        message: `Too many unsuccessful login attempts. Account is temporarily locked. Please try again in ${remainingMinutes} minute(s).`,
        code: 'ACCOUNT_LOCKED',
        remainingMinutes
      });
    }

    // 4. Verify Password (CPU-bound bcrypt match)
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const updateData = { failedLoginAttempts: attempts };
      if (attempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      User.updateOne({ _id: user._id }, { $set: updateData }).exec().catch(() => {});
      logAudit('LOGIN_FAILED', 'User', user._id, `Failed login attempt (${attempts}/5)`, user, req).catch(() => {});

      if (attempts >= 5) {
        return res.status(423).json({
          success: false,
          message: 'Too many unsuccessful login attempts. Your account has been temporarily locked for 15 minutes.',
          code: 'ACCOUNT_LOCKED'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your ID and password.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // 5. Successful Authentication - Non-blocking background state update
    User.updateOne({ _id: user._id }, {
      $set: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: req.ip || req.headers['x-forwarded-for'] || ''
      }
    }).exec().catch(() => {});
    logAudit('LOGIN_SUCCESS', 'User', user._id, `Successful login as ${user.role}`, user, req).catch(() => {});

    // 6. Token Generation & In-Memory Response Formatting
    const profileDoc = user.profileRef;
    const profileId = profileDoc?._id || user.profileRef || user._id;
    const token = generateToken({
      id: profileId,
      userId: user._id,
      role: user.role,
      departmentCode: user.department || '',
      sessionVersion: user.sessionVersion || 1
    });

    // Reuse already-loaded populated profileDoc to eliminate extra database queries
    const safeUser = await formatSafeUser(user, profileDoc);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: safeUser,
      token,
      session: {
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (err) {
    console.error('Unified login error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server authentication error',
      code: 'SERVER_ERROR'
    });
  }
};

// ── STUDENT REGISTRATION ──────────────────────────────────────────────────────
// POST /api/auth/register/student
const registerStudent = async (req, res) => {
  try {
    const {
      name,
      rollNumber,
      session,
      academicSession,
      series,
      phone,
      contactNo,
      email,
      department,
      faculty,
      password,
      confirmPassword
    } = req.body;

    const studentName = (name || '').trim();
    const studentRoll = (rollNumber || '').trim();
    const studentSession = (academicSession || session || '').trim();
    const studentSeries = (series || '').trim();
    const studentPhone = (contactNo || phone || '').trim();
    const studentEmail = (email || '').trim().toLowerCase();
    const studentDept = (department || '').trim().toUpperCase();
    const studentFaculty = (faculty || '').trim();

    // 1. Validate required fields
    if (!studentName || !studentRoll || !studentSession || !studentSeries || !studentDept || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All academic and identity fields are required (Name, Roll, Session, Series, Department, Password, Confirm Password)',
        code: 'VALIDATION_ERROR'
      });
    }

    // 2. Validate password confirmation
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and Confirm Password do not match',
        code: 'PASSWORD_MISMATCH'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // 3. Unique Student ID enforcement
    const existingUser = await User.findOne({ loginIdentifierLower: studentRoll.toLowerCase() });
    const existingStudent = await Student.findOne({ rollNumber: studentRoll });

    if (existingUser || existingStudent) {
      return res.status(409).json({
        success: false,
        message: 'A student with this Roll Number / Student ID already exists.',
        code: 'DUPLICATE_STUDENT_ID'
      });
    }

    // 4. Resolve Department, Faculty, Series references
    const deptDoc = await Department.findOne({ code: studentDept }).populate('faculty');
    const facultyRef = deptDoc?.faculty?._id || null;
    const seriesDoc = await Series.findOne({ seriesName: studentSeries });
    const sessionDoc = await AcademicSession.findOne({ sessionName: studentSession });

    // 5. Create Central User
    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      loginIdentifier: studentRoll,
      loginIdentifierLower: studentRoll.toLowerCase(),
      passwordHash,
      role: 'student',
      status: 'ACTIVE',
      name: studentName,
      email: studentEmail,
      phone: studentPhone,
      department: studentDept,
      departmentRef: deptDoc?._id || null,
      faculty: deptDoc?.faculty?.name || studentFaculty,
      facultyRef: facultyRef,
    });

    // 6. Create Student Profile linked to User
    const student = await Student.create({
      name: studentName,
      rollNumber: studentRoll,
      series: studentSeries,
      seriesRef: seriesDoc?._id || null,
      session: studentSession,
      academicSessionRef: sessionDoc?._id || null,
      department: studentDept,
      departmentRef: deptDoc?._id || null,
      facultyRef: facultyRef,
      contactNo: studentPhone,
      email: studentEmail,
      password, // Pre-save hook hashes this in Student model
      role: 'student',
      status: 'active',
      user: user._id
    });

    user.profileRef = student._id;
    user.profileModel = 'Student';
    await user.save();

    await logAudit('STUDENT_REGISTERED', 'Student', student._id, `Student ${studentRoll} registered`, user, req);

    const safeUser = await formatSafeUser(user, student);
    const token = generateToken({
      id: student._id,
      userId: user._id,
      role: 'student',
      departmentCode: studentDept,
      sessionVersion: 1
    });

    return res.status(201).json({
      success: true,
      message: 'Student account created successfully',
      user: safeUser,
      token
    });
  } catch (err) {
    console.error('Student registration error:', err);
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A student with this Roll Number / Student ID already exists.',
        code: 'DUPLICATE_STUDENT_ID'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Student registration failed: ' + err.message,
      code: 'SERVER_ERROR'
    });
  }
};

// ── TEACHER REGISTRATION ──────────────────────────────────────────────────────
// POST /api/auth/register/teacher
const registerTeacher = async (req, res) => {
  try {
    const {
      name,
      teacherId,
      phone,
      contactNo,
      email,
      department,
      faculty,
      password,
      confirmPassword,
      designation
    } = req.body;

    const teacherName = (name || '').trim();
    const cleanId = (teacherId || '').trim().toUpperCase();
    const teacherPhone = (contactNo || phone || '').trim();
    const teacherEmail = (email || '').trim().toLowerCase();
    const cleanDept = (department || '').trim().toUpperCase();

    // 1. Validate required fields
    if (!teacherName || !cleanId || !cleanDept || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required (Name, Teacher ID, Department, Password, Confirm Password)',
        code: 'VALIDATION_ERROR'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and Confirm Password do not match',
        code: 'PASSWORD_MISMATCH'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // 2. Unique Teacher ID check
    const existingUser = await User.findOne({ loginIdentifierLower: cleanId.toLowerCase() });
    const existingTeacher = await Teacher.findOne({ teacherId: cleanId });

    if (existingUser || existingTeacher) {
      return res.status(409).json({
        success: false,
        message: 'This Teacher ID is already registered.',
        code: 'DUPLICATE_TEACHER_ID'
      });
    }

    // 3. Resolve department and faculty
    const deptDoc = await Department.findOne({ code: cleanDept }).populate('faculty');
    const facultyRef = deptDoc?.faculty?._id || null;
    const facultyName = deptDoc?.faculty?.name || faculty || '';

    // 4. Create User
    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      loginIdentifier: cleanId,
      loginIdentifierLower: cleanId.toLowerCase(),
      passwordHash,
      role: 'teacher',
      status: 'ACTIVE',
      name: teacherName,
      email: teacherEmail,
      phone: teacherPhone,
      department: cleanDept,
      departmentRef: deptDoc?._id || null,
      faculty: facultyName,
      facultyRef: facultyRef,
    });

    // 5. Create Teacher Profile
    const teacher = await Teacher.create({
      name: teacherName,
      teacherId: cleanId,
      department: cleanDept,
      departmentRef: deptDoc?._id || null,
      facultyRef: facultyRef,
      designation: designation || 'Lecturer',
      contactNo: teacherPhone || '01700000000',
      email: teacherEmail,
      password, // Hashed by Teacher pre-save
      role: 'teacher',
      status: 'active',
      user: user._id
    });

    user.profileRef = teacher._id;
    user.profileModel = 'Teacher';
    await user.save();

    await logAudit('TEACHER_REGISTERED', 'Teacher', teacher._id, `Teacher ${cleanId} registered`, user, req);

    const safeUser = await formatSafeUser(user, teacher);
    const token = generateToken({
      id: teacher._id,
      userId: user._id,
      role: 'teacher',
      departmentCode: cleanDept,
      sessionVersion: 1
    });

    return res.status(201).json({
      success: true,
      message: 'Teacher account created successfully',
      user: safeUser,
      token
    });
  } catch (err) {
    console.error('Teacher registration error:', err);
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This Teacher ID is already registered.',
        code: 'DUPLICATE_TEACHER_ID'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Teacher registration failed: ' + err.message,
      code: 'SERVER_ERROR'
    });
  }
};

// ── DEPARTMENT HEAD REGISTRATION ──────────────────────────────────────────────
// POST /api/auth/register/head
const registerHead = async (req, res) => {
  try {
    const {
      name,
      headId,
      phone,
      contactNo,
      email,
      faculty,
      facultyCode,
      department,
      departmentCode,
      password,
      confirmPassword,
      designation
    } = req.body;

    const headName = (name || '').trim();
    const cleanHeadId = (headId || '').trim().toUpperCase();
    const headPhone = (contactNo || phone || '').trim();
    const headEmail = (email || '').trim().toLowerCase();
    const cleanDept = (departmentCode || department || '').trim().toUpperCase();

    // 1. Validate required fields
    if (!headName || !cleanHeadId || !cleanDept || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required (Name, Head ID, Department, Password, Confirm Password)',
        code: 'VALIDATION_ERROR'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and Confirm Password do not match',
        code: 'PASSWORD_MISMATCH'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // 2. Unique Head ID check
    const existingUser = await User.findOne({ loginIdentifierLower: cleanHeadId.toLowerCase() });
    const existingAdmin = await Admin.findOne({
      $or: [
        { username: cleanHeadId.toLowerCase() },
        { headId: cleanHeadId }
      ]
    });

    if (existingUser || existingAdmin) {
      return res.status(409).json({
        success: false,
        message: 'This Head ID is already registered.',
        code: 'DUPLICATE_HEAD_ID'
      });
    }

    // 3. Resolve department and faculty
    const deptDoc = await Department.findOne({ code: cleanDept }).populate('faculty');
    const resolvedFacultyCode = deptDoc?.faculty?.code || facultyCode || '';
    const resolvedFacultyName = deptDoc?.faculty?.name || faculty || '';
    const resolvedFacultyRef = deptDoc?.faculty?._id || null;

    // 4. Create central User with department isolation scope
    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      loginIdentifier: cleanHeadId,
      loginIdentifierLower: cleanHeadId.toLowerCase(),
      passwordHash,
      role: 'department_head',
      status: 'ACTIVE',
      name: headName,
      email: headEmail,
      phone: headPhone,
      department: cleanDept,
      departmentRef: deptDoc?._id || null,
      faculty: resolvedFacultyName,
      facultyRef: resolvedFacultyRef,
    });

    // 5. Create Admin document for Department Head
    const admin = await Admin.create({
      name: headName,
      username: cleanHeadId.toLowerCase(),
      headId: cleanHeadId,
      email: headEmail || `${cleanHeadId.toLowerCase()}@ruet.ac.bd`,
      contactNo: headPhone || '',
      password, // Hashed by Admin pre-save
      role: 'department_head',
      designation: designation || `Head of ${cleanDept} Department`,
      faculty: resolvedFacultyRef,
      facultyCode: resolvedFacultyCode,
      facultyName: resolvedFacultyName,
      department: deptDoc?._id || null,
      departmentCode: cleanDept,
      departmentName: deptDoc?.name || cleanDept,
      status: 'active',
      user: user._id
    });

    user.profileRef = admin._id;
    user.profileModel = 'Admin';
    await user.save();

    await logAudit('HEAD_REGISTERED', 'Admin', admin._id, `Department Head ${cleanHeadId} registered for ${cleanDept}`, user, req);

    const safeUser = await formatSafeUser(user, admin);
    const token = generateToken({
      id: admin._id,
      userId: user._id,
      role: 'department_head',
      departmentCode: cleanDept,
      sessionVersion: 1
    });

    return res.status(201).json({
      success: true,
      message: 'Department Head account created successfully',
      user: safeUser,
      token
    });
  } catch (err) {
    console.error('Department Head registration error:', err);
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This Head ID is already registered.',
        code: 'DUPLICATE_HEAD_ID'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Department Head registration failed: ' + err.message,
      code: 'SERVER_ERROR'
    });
  }
};

// ── ADMIN PUBLIC REGISTRATION BLOCKED ─────────────────────────────────────────
// POST /api/auth/admin-register or /api/auth/register/admin
const registerAdmin = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Public administrator registration is prohibited. Administrator accounts must be provisioned securely by system deployment.',
    code: 'ADMIN_SIGNUP_PROHIBITED'
  });
};

// ── GET CURRENT USER ──────────────────────────────────────────────────────────
// GET /api/auth/me
const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      if (res.headersSent) return;
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    let centralUser = null;
    if (req.user instanceof User || req.user.role && req.user.loginIdentifier) {
      centralUser = req.user;
    } else if (req.user.user) {
      centralUser = await User.findById(req.user.user).lean();
    } else if (req.user.userId) {
      centralUser = await User.findById(req.user.userId).lean();
    } else {
      centralUser = await User.findOne({ profileRef: req.user._id }).lean();
    }

    if (!centralUser) {
      if (res.headersSent) return;
      return res.status(404).json({ success: false, message: 'User record not found' });
    }

    const safeUser = await formatSafeUser(centralUser, req.user);
    if (res.headersSent) return;
    return res.json({
      success: true,
      user: safeUser
    });
  } catch (err) {
    if (res.headersSent) return;
    console.error('getCurrentUser error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve profile: ' + err.message });
  }
};

// ── CHANGE PASSWORD ───────────────────────────────────────────────────────────
// POST /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (confirmNewPassword && newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    // Locate central User
    let user = null;
    if (req.user?.user) user = await User.findById(req.user.user);
    else if (req.user?.userId) user = await User.findById(req.user.userId);
    else if (req.user?._id) user = await User.findOne({ profileRef: req.user._id });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User authentication record not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const newHash = await User.hashPassword(newPassword);
    user.passwordHash = newHash;
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    user.sessionVersion = (user.sessionVersion || 1) + 1;
    await user.save();

    // Sync to profile doc
    if (user.role === 'student') {
      const student = await Student.findById(user.profileRef);
      if (student) {
        student.password = newPassword;
        await student.save();
      }
    } else if (user.role === 'teacher') {
      const teacher = await Teacher.findById(user.profileRef);
      if (teacher) {
        teacher.password = newPassword;
        await teacher.save();
      }
    } else if (user.role === 'admin' || user.role === 'department_head') {
      const admin = await Admin.findById(user.profileRef);
      if (admin) {
        admin.password = newPassword;
        await admin.save();
      }
    }

    await logAudit('PASSWORD_CHANGED', 'User', user._id, 'Password changed successfully', user, req);

    // Evict cached auth session so stale tokens/credentials cannot be used
    invalidateAuthCache(user.loginIdentifier);
    invalidateAuthCache(user._id);

    return res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err) {
    console.error('changePassword error:', err);
    res.status(500).json({ success: false, message: 'Failed to change password: ' + err.message });
  }
};

// ── LOGOUT / LOGOUT ALL ───────────────────────────────────────────────────────
const logout = async (req, res) => {
  if (req.user) {
    invalidateAuthCache(req.user.loginIdentifier || req.user.rollNumber || req.user.teacherId || req.user.userId);
  }
  return res.json({ success: true, message: 'Logged out successfully' });
};

const logoutAll = async (req, res) => {
  try {
    let user = null;
    if (req.user?.user) user = await User.findById(req.user.user);
    else if (req.user?.userId) user = await User.findById(req.user.userId);
    else if (req.user?._id) user = await User.findOne({ profileRef: req.user._id });

    if (user) {
      user.sessionVersion = (user.sessionVersion || 1) + 1;
      await user.save();
      invalidateAuthCache(user.loginIdentifier);
      invalidateAuthCache(user._id);
    }
    return res.json({ success: true, message: 'All active sessions invalidated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DEMO LOGIN ────────────────────────────────────────────────────────────────
// POST /api/auth/demo-login
const demoLogin = async (req, res) => {
  try {
    const { role } = req.body;
    let identifier = '2204028';

    if (role === 'teacher') identifier = 'ETE-294';
    else if (role === 'admin') identifier = 'ADMIN';
    else if (role === 'department_head' || role === 'department_head_ete') identifier = 'head-ete';
    else if (role === 'department_head_eee') identifier = 'head-eee';
    else if (role === 'department_head_cse') identifier = 'head-cse';

    let user = await User.findOne({ loginIdentifierLower: identifier.toLowerCase() });

    if (!user) {
      // Seed if missing
      if (identifier === 'ADMIN') {
        const hash = await User.hashPassword('admin123');
        user = await User.create({
          loginIdentifier: 'ADMIN',
          loginIdentifierLower: 'admin',
          passwordHash: hash,
          role: 'admin',
          name: 'System Administrator',
          status: 'ACTIVE',
        });
      } else if (role === 'student') {
        const hash = await User.hashPassword('password123');
        const ete = await Department.findOne({ code: 'ETE' });
        const student = await Student.create({
          name: 'Md. Jahid Hasan',
          rollNumber: '2204028',
          series: '22',
          session: '2022-23',
          department: 'ETE',
          departmentRef: ete?._id,
          contactNo: '01712345678',
          password: 'password123',
          role: 'student'
        });
        user = await User.create({
          loginIdentifier: '2204028',
          loginIdentifierLower: '2204028',
          passwordHash: hash,
          role: 'student',
          name: 'Md. Jahid Hasan',
          department: 'ETE',
          profileRef: student._id,
          profileModel: 'Student',
          status: 'ACTIVE'
        });
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Demo account not found' });
    }

    const safeUser = await formatSafeUser(user);
    const token = generateToken({
      id: user.profileRef || user._id,
      userId: user._id,
      role: user.role,
      departmentCode: user.department || '',
      sessionVersion: user.sessionVersion || 1
    });

    return res.json({
      success: true,
      message: 'Demo login successful',
      user: safeUser,
      token
    });
  } catch (err) {
    console.error('demoLogin error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  login,
  registerStudent,
  registerTeacher,
  registerHead,
  registerAdmin,
  getCurrentUser,
  changePassword,
  logout,
  logoutAll,
  demoLogin
};
