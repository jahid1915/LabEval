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
  getHeadTeacherWorkload,
  getHeadTeachingAssignments,
  createHeadTeachingAssignment,
  deleteHeadTeachingAssignment,
  getHeadAnalytics
} = require('../controllers/headController');

const {
  getHeadSupervisionOverview,
  getHeadSupervisionList,
  getHeadEligibleSupervisionStudents,
  createSupervisionAssignment,
  cancelSupervisionAssignment,
  getHeadPersonalAcademic
} = require('../controllers/supervisionController');

const {
  requestHeadshipTransfer,
  getHeadshipTransferStatus
} = require('../controllers/headshipTransferController');

const {
  requestDataCorrection,
  getHeadCorrectionRequests
} = require('../controllers/dataCorrectionController');

const { protect, requireRole, enforceDepartmentIsolation } = require('../middleware/authMiddleware');

// Strict protection: Only authenticated users with 'department_head' role!
router.use(protect);
router.use(requireRole('department_head'));
router.use(enforceDepartmentIsolation);

// ── Department Head Routes ───────────────────────────────────────────
router.get('/stats', getHeadDashboardStats);

// Academic Sessions & Filtered Student Roster
router.get('/academic-sessions', getHeadAcademicSessions);
router.get('/academic-sessions/:sessionId/students', getHeadSessionStudents);

// Students (VIEW ONLY - Mutations are strictly 403 Forbidden!)
router.get('/students', getHeadStudents);
router.post('/students', createHeadStudent);
router.get('/students/:id', getHeadStudentById);
router.put('/students/:id', updateHeadStudent);
router.patch('/students/:id', updateHeadStudent);
router.delete('/students/:id', deleteHeadStudent);

// Student Data Correction Requests
router.post('/students/request-correction', requestDataCorrection);
router.get('/students/correction-requests', getHeadCorrectionRequests);

// Teachers & Workload
router.get('/teachers', getHeadTeachers);
router.get('/teachers/workload', getHeadTeacherWorkload);

// Courses & Course Offerings (Sections 14-24, 38-42)
const {
  getHeadCourses,
  getHeadSessionalCourses,
  getHeadElectiveCourses,
  getHeadCourseOfferings,
  createCourseOffering,
  getEligibleStudentsPreview,
  activateCourseOffering,
  assignTeacher,
  cancelOffering,
  searchTeachers
} = require('../controllers/headCourseOfferingController');

router.get('/courses', getHeadCourses);
router.get('/courses/sessional', getHeadSessionalCourses);
router.get('/courses/elective', getHeadElectiveCourses);
router.get('/course-offerings', getHeadCourseOfferings);
router.post('/course-offerings', createCourseOffering);
router.get('/course-offerings/:id/eligible-students', getEligibleStudentsPreview);
router.post('/course-offerings/:id/activate', activateCourseOffering);
router.post('/course-offerings/:id/assign-teacher', assignTeacher);
router.post('/course-offerings/:id/cancel', cancelOffering);
router.get('/teachers/search', searchTeachers);

router.get('/teaching-assignments', getHeadTeachingAssignments);
router.post('/teaching-assignments', createHeadTeachingAssignment);
router.delete('/teaching-assignments/:id', deleteHeadTeachingAssignment);

// Supervision & Academic Allocation (Project-I, Project-II, Seminar, Thesis)
router.get('/supervision/overview', getHeadSupervisionOverview);
router.get('/supervision/list', getHeadSupervisionList);
router.get('/supervision/eligible-students', getHeadEligibleSupervisionStudents);
router.post('/supervision/assign', createSupervisionAssignment);
router.delete('/supervision/:assignmentId', cancelSupervisionAssignment);

// Head Personal Academic Dashboard ("My Teaching" & "My Supervision")
router.get('/my-academic', getHeadPersonalAcademic);

// Headship Transfer Request
router.post('/headship-transfer/request', requestHeadshipTransfer);
router.get('/headship-transfer/status', getHeadshipTransferStatus);

// Analytics
router.get('/analytics', getHeadAnalytics);

module.exports = router;
