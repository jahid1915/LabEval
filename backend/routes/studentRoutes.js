const express = require('express');
const router  = express.Router();
const { getStudentCourses, getStudentMarks } = require('../controllers/studentCourseController');
const { createRequest, getStudentRequests }  = require('../controllers/requestController');
const { protect }                            = require('../middleware/authMiddleware');

router.use(protect);

// Course listing (courses matching student's dept/series + request status)
router.get('/courses', getStudentCourses);

// Full marks breakdown (gated by Accepted request)
router.get('/marks/:courseCode', getStudentMarks);

// Request management
router.post('/request',  createRequest);
router.get('/requests',  getStudentRequests);

module.exports = router;
