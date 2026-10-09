const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');
const TeacherAssignment = require('../models/TeacherAssignment');
const CourseOffering = require('../models/CourseOffering');
const Course = require('../models/Course');

// ── High-Performance Auth Cache (5 min TTL, max 5,000 active sessions) ────────
const authCache = new Map();
const AUTH_CACHE_TTL = 5 * 60 * 1000;

const getCachedAuth = (cacheKey) => {
  const item = authCache.get(cacheKey);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    authCache.delete(cacheKey);
    return null;
  }
  return item.data;
};

const setCachedAuth = (cacheKey, data) => {
  if (authCache.size > 5000) {
    const firstKey = authCache.keys().next().value;
    if (firstKey) authCache.delete(firstKey);
  }
  authCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + AUTH_CACHE_TTL
  });
};

const { invalidateUserContextCache } = require('../services/authorizationService');

const invalidateAuthCache = (identifierOrId) => {
  invalidateUserContextCache(identifierOrId);
  if (!identifierOrId) {
    authCache.clear();
    return;
  }
  const target = String(identifierOrId).toLowerCase();
  for (const [key, val] of authCache.entries()) {
    if (
      key.toLowerCase().includes(target) ||
      val.data?.authUser?._id?.toString() === target ||
      val.data?.user?._id?.toString() === target ||
      val.data?.user?.userId?.toString() === target ||
      val.data?.authUser?.loginIdentifier?.toLowerCase() === target
    ) {
      authCache.delete(key);
    }
  }
};

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const cacheKey = `${token.slice(-16)}_${decoded.id || decoded.userId}`;
      const cached = getCachedAuth(cacheKey);
      if (cached) {
        req.user = { ...cached.user };
        req.authUser = cached.authUser;
        if (cached.userContext) {
          req.userContext = cached.userContext;
        }
        return next();
      }

      const commonFields = '-password -passwordHash -__v -enrolledCourses';

      // 1. Single-pass look up central User with populated profileRef
      let authUser = null;
      const userLookupId = decoded.userId || decoded.id;
      if (userLookupId && mongoose.Types.ObjectId.isValid(userLookupId)) {
        authUser = await User.findById(userLookupId)
          .select('-passwordHash')
          .populate({ path: 'profileRef', select: commonFields })
          .lean();
      }

      if (!authUser && decoded.id) {
        authUser = await User.findOne({
          $or: [{ _id: decoded.id }, { profileRef: decoded.id }]
        })
          .select('-passwordHash')
          .populate({ path: 'profileRef', select: commonFields })
          .lean();
      }

      let profileDoc = authUser?.profileRef || null;

      // Fallback query only if profileRef was not linked on User
      if (!profileDoc && authUser) {
        const targetRole = authUser.role || decoded.role;
        if (targetRole === 'teacher') {
          profileDoc = await Teacher.findOne({
            $or: [{ user: authUser._id }, { teacherId: authUser.loginIdentifier?.toUpperCase() }]
          }).select(commonFields).lean();
        } else if (targetRole === 'student') {
          profileDoc = await Student.findOne({
            $or: [{ user: authUser._id }, { rollNumber: authUser.loginIdentifier?.toUpperCase() }]
          }).select(commonFields).lean();
        } else if (['admin', 'department_head', 'super_admin'].includes(targetRole)) {
          profileDoc = await Admin.findOne({
            $or: [{ user: authUser._id }, { username: authUser.loginIdentifier?.toLowerCase() }]
          }).select(commonFields).lean();
        }
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

      // Centralized capability & dual-mode resolution (Section 8)
      try {
        const { resolveUserContext } = require('../services/authorizationService');
        const userContext = await resolveUserContext(authUser);
        if (userContext) {
          req.userContext = userContext;
          req.user.capabilities = userContext.capabilities;
          if (userContext.teacherProfile) {
            req.user.teacherProfile = userContext.teacherProfile;
            req.user.teacherId = req.user.teacherId || userContext.teacherProfile.teacherId;
            req.user.teacherRef = userContext.teacherProfile._id;
          }
          if (userContext.departmentHeadProfile) {
            req.user.departmentHeadProfile = userContext.departmentHeadProfile;
          }
        }
      } catch (err) {
        console.warn('resolveUserContext non-blocking warning:', err.message);
      }

      setCachedAuth(cacheKey, { user: req.user, authUser: req.authUser, userContext: req.userContext });

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

// Teacher Only: allows teachers AND Department Heads (dual-mode teaching capability)
const teacherOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'teacher' || (req.user.role === 'department_head' && req.user.capabilities?.canTeach))) {
    return next();
  }
  res.status(403).json({ success: false, message: 'Access forbidden: Teacher privileges required', code: 'FORBIDDEN_TEACHER' });
};

// Department Head Only
const headOnly = (req, res, next) => {
  if (req.user && req.user.role === 'department_head') {
    return next();
  }
  res.status(403).json({ success: false, message: 'Access forbidden: Department Head privileges required', code: 'FORBIDDEN_HEAD' });
};

// Capability Verification Middleware (Section 8)
const requireCapability = (capabilityName) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (req.user.capabilities?.[capabilityName]) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: `Access forbidden: Required capability '${capabilityName}' not granted to your account.`,
      code: 'FORBIDDEN_CAPABILITY'
    });
  };
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
  headOnly,
  studentOnly,
  adminOnly,
  adminOrHead,
  adminOrTeacher,
  requireCapability,
  enforceDepartmentIsolation,
  requireStudentOwnership,
  requireTeacherCourseAccess,
  invalidateAuthCache
};
