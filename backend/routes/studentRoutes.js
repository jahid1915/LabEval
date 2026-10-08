const express = require('express');
const router  = express.Router();
const { getStudentCourses, getStudentMarks, getStudentAcademicHistory, getStudentProfile } = require('../controllers/studentCourseController');
const { createRequest, getStudentRequests }  = require('../controllers/requestController');
const { protect, studentOnly }              = require('../middleware/authMiddleware');

router.use(protect);
router.use(studentOnly);

// Profile
router.get('/profile',             getStudentProfile);

// Course listing (courses matching student's dept/series + request status)
router.get('/courses', getStudentCourses);

// Full marks breakdown (visible when published)
router.get('/marks/:courseCode', getStudentMarks);

// Academic history (semester-wise)
router.get('/history', getStudentAcademicHistory);

// Request management
router.post('/request',  createRequest);
router.get('/requests',  getStudentRequests);

module.exports = router;

