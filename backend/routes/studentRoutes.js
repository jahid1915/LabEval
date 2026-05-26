const express = require('express');
const router  = express.Router();
const { getDashboardSummary, getDetailedMarks } = require('../controllers/studentController');
const { createRequest, getStudentRequests }      = require('../controllers/requestController');
const { protect }                                = require('../middleware/authMiddleware');

router.use(protect);

router.get('/dashboard/:courseId', getDashboardSummary);
router.get('/detailed-marks/:courseId', getDetailedMarks);

// Request management
router.post('/request',   createRequest);
router.get('/requests',   getStudentRequests);

module.exports = router;
