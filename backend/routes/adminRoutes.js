const express = require('express');
const router = express.Router();
const {
  getSystemStats,
  getAllTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  toggleDeactivateStudent,
  resetStudentPassword,
  bulkStudentAction,
  getDepartmentCourses,
  assignCourseToTeacher,
  revokeCourseAssignment,
  getTeacherAssignedCourses,
  transferHeadship,
  getAdminRequests,
  getStudentStats
} = require('../controllers/adminController');
const { importTeachers, importStudents } = require('../controllers/dataTransferController');
const { protect, adminOrHead, enforceDepartmentIsolation } = require('../middleware/authMiddleware');

router.use(protect);
router.use(adminOrHead);
router.use(enforceDepartmentIsolation);

// ── System Statistics ────────────────────────────────────────────────
router.get('/stats', getSystemStats);
router.get('/requests', getAdminRequests);

// ── Course & Assignment Management (Section 9, 10, 11) ──────────────
router.get('/courses', getDepartmentCourses);
router.post('/assign-course', assignCourseToTeacher);
router.delete('/revoke-assignment/:id', revokeCourseAssignment);
router.get('/teacher-assignments/:teacherId', getTeacherAssignedCourses);

// ── Department Headship Transfer ─────────────────────────────────────
router.post('/transfer-headship', transferHeadship);

// ── Teacher Management ───────────────────────────────────────────────
router.get('/teachers', getAllTeachers);
router.post('/teachers', createTeacher);
router.put('/teachers/:id', updateTeacher);
router.delete('/teachers/:id', deleteTeacher);

// ── Student Management ───────────────────────────────────────────────
router.get('/students', getAllStudents);
router.post('/students', createStudent);
router.get('/students/stats', getStudentStats);  // Must be before :id
router.get('/students/:id', getStudentById);
router.put('/students/:id', updateStudent);
router.patch('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);
router.post('/students/:id/deactivate', toggleDeactivateStudent);
router.post('/students/:id/reset-password', resetStudentPassword);
router.post('/students/bulk-action', bulkStudentAction);

// ── Bulk Import ──────────────────────────────────────────────────────
router.post('/import/teachers', importTeachers);
router.post('/import/students', importStudents);

module.exports = router;

