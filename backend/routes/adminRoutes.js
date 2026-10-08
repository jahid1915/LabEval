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
  getStudentStats,
  getFacultiesSummary,
  getDepartmentOverview,
  getDepartmentHeadHistory,
  assignDepartmentHead,
  removeDepartmentHead,
  getCurrentTeachingAssignments,
  getTeacherTeachingOverview,
  getCourseTeachingRoster,
  createTeachingAssignment,
  updateTeachingAssignment,
  deleteTeachingAssignment,
  getSystemSettings,
  updateSystemSettings
} = require('../controllers/adminController');
const { importTeachers, importStudents } = require('../controllers/dataTransferController');
const { protect, adminOrHead, enforceDepartmentIsolation } = require('../middleware/authMiddleware');

router.use(protect);
router.use(adminOrHead);
router.use(enforceDepartmentIsolation);

// ── System Statistics & Settings ─────────────────────────────────────
router.get('/stats', getSystemStats);
router.get('/requests', getAdminRequests);
router.get('/system-settings', getSystemSettings);
router.put('/system-settings', updateSystemSettings);

// ── Hierarchical Navigation (Faculty -> Department -> Head/Teachers) ─
router.get('/faculties-summary', getFacultiesSummary);
router.get('/departments/:deptCode/overview', getDepartmentOverview);
router.get('/departments/:deptCode/head-history', getDepartmentHeadHistory);
router.post('/departments/:deptCode/assign-head', assignDepartmentHead);
router.post('/departments/:deptCode/remove-head', removeDepartmentHead);

// ── Course & Assignment Management ───────────────────────────────────
router.get('/courses', getDepartmentCourses);
router.post('/assign-course', assignCourseToTeacher);
router.delete('/revoke-assignment/:id', revokeCourseAssignment);
router.get('/teacher-assignments/:teacherId', getTeacherAssignedCourses);

// ── Current Teacher–Course Assignments & Workload (ADD-ON) ────────────
router.get('/teaching-assignments/current', getCurrentTeachingAssignments);
router.post('/teaching-assignments', createTeachingAssignment);
router.patch('/teaching-assignments/:id', updateTeachingAssignment);
router.delete('/teaching-assignments/:id', deleteTeachingAssignment);
router.get('/teachers/:id/teaching-overview', getTeacherTeachingOverview);
router.get('/courses/:id/teaching-roster', getCourseTeachingRoster);

// ── Department Headship Transfer (Legacy & Dedicated) ────────────────
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

