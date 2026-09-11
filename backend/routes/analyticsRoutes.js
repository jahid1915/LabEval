const express = require('express');
const router = express.Router();
const {
  getAdminAnalytics,
  getTeacherAnalytics
} = require('../controllers/analyticsController');
const { protect, adminOnly, teacherOnly } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/admin', adminOnly, getAdminAnalytics);
router.get('/teacher', teacherOnly, getTeacherAnalytics);

module.exports = router;
