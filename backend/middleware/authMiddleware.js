const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');
const TeacherAssignment = require('../models/TeacherAssignment');
const CourseOffering = require('../models/CourseOffering');
const Course = require('../models/Course');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const commonFields = '-password -passwordHash -__v -enrolledCourses';

      // 1. Look up central User
      let authUser = null;
      if (decoded.userId) {
        authUser = await User.findById(decoded.userId).select('-passwordHash');
      } else if (decoded.id) {
        authUser = await User.findOne({
          $or: [{ _id: decoded.id }, { profileRef: decoded.id }]
        }).select('-passwordHash');
      }

      // 2. Look up role profile document for DB queries
      let profileDoc = null;
      const targetRole = authUser?.role || decoded.role;

      if (targetRole === 'teacher') {
        profileDoc = await Teacher.findById(authUser?.profileRef || decoded.id).select(commonFields).lean();
      } else if (targetRole === 'student') {
        profileDoc = await Student.findById(authUser?.profileRef || decoded.id).select(commonFields).lean();
      } else if (['admin', 'department_head', 'super_admin'].includes(targetRole)) {
        profileDoc = await Admin.findById(authUser?.profileRef || decoded.id).select(commonFields).lean();
      }

      if (!authUser && !profileDoc) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found', code: 'USER_NOT_FOUND' });
      }

      // Check account status
      const accountStatus = authUser?.status || (profileDoc?.status === 'active' ? 'ACTIVE' : profileDoc?.status?.toUpperCase());
      if (accountStatus === 'SUSPENDED') {
        return res.status(403).json({ success: false, message: 'Account is suspended. Please contact administrator.', code: 'ACCOUNT_SUSPENDED' });
      }
      if (accountStatus === 'INACTIVE') {
        return res.status(403).json({ success: false, message: 'Account is inactive. Please contact administrator.', code: 'ACCOUNT_INACTIVE' });
      }

      // Build unified req.user with profileDoc properties and authUser
      req.user = profileDoc ? { ...profileDoc } : { _id: authUser._id, name: authUser.name };
      req.user.userId = authUser?._id || req.user._id;
      req.user.role = authUser?.role || decoded.role;
      req.user.department = req.user.department || authUser?.department || '';
      req.user.departmentCode = req.user.departmentCode || authUser?.department || '';
      req.authUser = authUser;

      return next();
    } catch (error) {
      console.error('Auth protect error:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed or expired', code: 'TOKEN_INVALID' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided', code: 'NO_TOKEN' });
  }
};

// Generic Role-based authorization factory
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const userRole = req.user.role;
    if (roles.includes(userRole)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: `Access forbidden: Requires one of [${roles.join(', ')}] role. Your role is '${userRole}'.`,
      code: 'FORBIDDEN_ROLE'
    });
  };
};

const teacherOnly = (req, res, next) => {
  if (req.user && req.user.role === 'teacher') return next();
  res.status(403).json({ success: false, message: 'Access forbidden: Teacher privileges required', code: 'FORBIDDEN_TEACHER' });
};

const studentOnly = (req, res, next) => {
  if (req.user && req.user.role === 'student') return next();
  res.status(403).json({ success: false, message: 'Access forbidden: Student privileges required', code: 'FORBIDDEN_STUDENT' });
};

// Strict Admin-only middleware (Only global Admin, NOT department heads)
const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
    return next();
  }
  res.status(403).json({ success: false, message: 'Access forbidden: System Administrator privileges required', code: 'FORBIDDEN_ADMIN' });
};

// Allows Administrator or Department Head
const adminOrHead = (req, res, next) => {
  if (req.user && ['admin', 'department_head', 'super_admin'].includes(req.user.role)) {
    return next();
  }
  res.status(403).json({ success: false, message: 'Access forbidden: Administrator or Department Head required', code: 'FORBIDDEN_ADMIN_OR_HEAD' });
};

const adminOrTeacher = (req, res, next) => {
  if (req.user && (['admin', 'department_head', 'super_admin'].includes(req.user.role) || req.user.role === 'teacher')) {
    return next();
  }
  res.status(403).json({ success: false, message: 'Access forbidden: Not authorized for this resource' });
};

// Strict Department Isolation Middleware
const enforceDepartmentIsolation = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });

  // Global Admin has unrestricted cross-department access
  if (req.user.role === 'admin' || req.user.role === 'super_admin') {
    return next();
  }

  const userDept = (req.user.departmentCode || req.user.department || '').trim().toUpperCase();
  if (!userDept) return next();

  const paramDept = (req.params?.department || req.params?.departmentCode || '').trim().toUpperCase();
  const queryDept = (req.query?.department || req.query?.departmentCode || '').trim().toUpperCase();
  const bodyDept  = (req.body?.department || req.body?.departmentCode || '').trim().toUpperCase();

  if (paramDept && paramDept !== userDept) {
    return res.status(403).json({
      success: false,
      message: `Department Isolation Violation: You are not authorized to access department '${paramDept}'. Your authorized department is '${userDept}'.`,
      code: 'DEPARTMENT_ISOLATION_VIOLATION'
    });
  }
  if (queryDept && queryDept !== userDept) {
    return res.status(403).json({
      success: false,
      message: `Department Isolation Violation: You are not authorized to access department '${queryDept}'. Your authorized department is '${userDept}'.`,
      code: 'DEPARTMENT_ISOLATION_VIOLATION'
    });
  }
  if (bodyDept && bodyDept !== userDept) {
    return res.status(403).json({
      success: false,
      message: `Department Isolation Violation: You cannot create or assign records for department '${bodyDept}'. Your authorized department is '${userDept}'.`,
      code: 'DEPARTMENT_ISOLATION_VIOLATION'
    });
  }

  req.userDepartment = userDept;
  next();
};

// Student Resource Ownership Verification
const requireStudentOwnership = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });

  // Admins, Department Heads, and Teachers can view student records
  if (['admin', 'department_head', 'super_admin', 'teacher'].includes(req.user.role)) {
    return next();
  }

  if (req.user.role === 'student') {
    const requestedRoll = req.params.rollNumber || req.params.studentId || req.query.rollNumber;
    const ownRoll = req.user.rollNumber || req.authUser?.loginIdentifier;

    if (requestedRoll && ownRoll && requestedRoll !== ownRoll) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You are only authorized to view your own academic records.',
        code: 'OWNERSHIP_VIOLATION'
      });
    }
  }

  next();
};

// Teacher Course Assignment Access Verification
const requireTeacherCourseAccess = async (req, res, next) => {
  if (['admin', 'department_head', 'super_admin'].includes(req.user.role)) return next();
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Teacher credentials required' });
  }

  const courseCodeOrId = req.params.courseId || req.params.offeringId || req.body.courseId || req.query.courseId;
  if (!courseCodeOrId) return next();

  try {
    let isAuthorized = false;

    if (courseCodeOrId.match(/^[0-9a-fA-F]{24}$/)) {
      const assignment = await TeacherAssignment.findOne({
        courseOffering: courseCodeOrId,
        teacher: req.user._id,
        status: 'active'
      });
      if (assignment) isAuthorized = true;

      if (!isAuthorized) {
        const legacyCourse = await Course.findOne({ _id: courseCodeOrId, teacherId: req.user.teacherId });
        if (legacyCourse) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      const cleanCode = courseCodeOrId.trim().toUpperCase();
      const offerings = await CourseOffering.find({ courseCode: cleanCode });
      if (offerings.length > 0) {
        const offeringIds = offerings.map(o => o._id);
        const assignment = await TeacherAssignment.findOne({
          courseOffering: { $in: offeringIds },
          teacher: req.user._id,
          status: 'active'
        });
        if (assignment) isAuthorized = true;
      }

      if (!isAuthorized) {
        const legacyCourse = await Course.findOne({ courseCode: cleanCode, teacherId: req.user.teacherId });
        if (legacyCourse) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You are not assigned to this course.'
      });
    }

    next();
  } catch (err) {
    console.error('Course access check error:', err);
    res.status(500).json({ success: false, message: 'Internal authorization error' });
  }
};

module.exports = {
  protect,
  requireRole,
  teacherOnly,
  studentOnly,
  adminOnly,
  adminOrHead,
  adminOrTeacher,
  enforceDepartmentIsolation,
  requireStudentOwnership,
  requireTeacherCourseAccess
};
