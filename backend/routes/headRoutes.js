const express = require('express');
const router = express.Router();
const {
  getHeadDashboardStats,
  getHeadAcademicSessions,
  getHeadSessionStudents,
  getHeadStudents,
  getHeadStudentById,
  createHeadStudent,
  updateHeadStudent,
  deleteHeadStudent,
  getHeadTeachers,
  getHeadCourses,
  getHeadTeachingAssignments,
  getHeadAnalytics
} = require('../controllers/headController');
const { protect, requireRole, enforceDepartmentIsolation } = require('../middleware/authMiddleware');

// Strict protection: Only authenticated users with 'department_head' role!
router.use(protect);
router.use(requireRole('department_head'));
router.use(enforceDepartmentIsolation);

// ── Department Head Routes ───────────────────────────────────────────
router.get('/stats', getHeadDashboardStats);

// Academic Sessions
router.get('/academic-sessions', getHeadAcademicSessions);
router.get('/academic-sessions/:sessionId/students', getHeadSessionStudents);

// Students
router.get('/students', getHeadStudents);
router.post('/students', createHeadStudent);
router.get('/students/:id', getHeadStudentById);
router.put('/students/:id', updateHeadStudent);
router.patch('/students/:id', updateHeadStudent);
router.delete('/students/:id', deleteHeadStudent);

// Teachers & Courses
router.get('/teachers', getHeadTeachers);
router.get('/courses', getHeadCourses);
router.get('/teaching-assignments', getHeadTeachingAssignments);

// Analytics
router.get('/analytics', getHeadAnalytics);

module.exports = router;
