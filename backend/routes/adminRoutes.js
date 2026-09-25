const express = require('express');
const router = express.Router();
const {
  getSystemStats,
  getAllTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getDepartmentCourses,
  assignCourseToTeacher,
  revokeCourseAssignment,
  getTeacherAssignedCourses,
  transferHeadship
} = require('../controllers/adminController');
const { importTeachers, importStudents } = require('../controllers/dataTransferController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);
router.use(adminOnly);

// ── System Statistics ────────────────────────────────────────────────
router.get('/stats', getSystemStats);

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
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

// ── Bulk Import ──────────────────────────────────────────────────────
router.post('/import/teachers', importTeachers);
router.post('/import/students', importStudents);

module.exports = router;
