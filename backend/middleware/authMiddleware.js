const jwt = require('jsonwebtoken');
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
      
      if (decoded.role === 'teacher') {
        req.user = await Teacher.findById(decoded.id).select('-password');
      } else if (decoded.role === 'student') {
        req.user = await Student.findById(decoded.id).select('-password');
      } else if (decoded.role === 'admin') {
        req.user = await Admin.findById(decoded.id).select('-password');
      }

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      return next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const teacherOnly = (req, res, next) => {
  if (req.user && req.user.role === 'teacher') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as teacher' });
  }
};

const studentOnly = (req, res, next) => {
  if (req.user && req.user.role === 'student') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as student' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as administrator' });
  }
};

const adminOrTeacher = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'teacher')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized for this resource' });
  }
};

// Resource-level verification: Teacher can only access assigned course / course offering
const requireTeacherCourseAccess = async (req, res, next) => {
  if (req.user.role === 'admin') return next();
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Teacher credentials required' });
  }

  const courseCodeOrId = req.params.courseId || req.params.offeringId || req.body.courseId || req.query.courseId;
  if (!courseCodeOrId) return next();

  try {
    // Check if courseCodeOrId is an Offering ObjectId or a courseCode string
    let isAuthorized = false;

    if (courseCodeOrId.match(/^[0-9a-fA-F]{24}$/)) {
      // It's a CourseOffering or Course ID
      const assignment = await TeacherAssignment.findOne({
        courseOffering: courseCodeOrId,
        teacher: req.user._id,
        status: 'active'
      });
      if (assignment) isAuthorized = true;

      if (!isAuthorized) {
        // Fallback: check if legacy course has matching teacherId
        const legacyCourse = await Course.findOne({ _id: courseCodeOrId, teacherId: req.user.teacherId });
        if (legacyCourse) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      // Check by courseCode string
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

      // Also check legacy allocated courses or teacherId in Course collection
      if (!isAuthorized) {
        const legacyCourse = await Course.findOne({ courseCode: cleanCode, teacherId: req.user.teacherId });
        if (legacyCourse) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        message: 'Access Denied: You are not assigned to this course offering.'
      });
    }

    next();
  } catch (err) {
    console.error('Course access check error:', err);
    res.status(500).json({ message: 'Internal authorization error' });
  }
};

module.exports = {
  protect,
  teacherOnly,
  studentOnly,
  adminOnly,
  adminOrTeacher,
  requireTeacherCourseAccess
};
