const express = require('express');
const router = express.Router();
const {
  getSystemStats,
  getAdminDashboardSummary,
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
const { protect, adminOnly, enforceDepartmentIsolation } = require('../middleware/authMiddleware');

router.use(protect);
router.use(adminOnly);
router.use(enforceDepartmentIsolation);

// ── Central Database Management Portal (Section 7, 8, 48) ────────────
router.use('/database', require('./databaseManagementRoutes'));

// ── System Statistics, Summary & Settings ─────────────────────────────
router.get('/dashboard/summary', getAdminDashboardSummary);
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

// ── Headship Transfer Approval (Section 31) ──────────────────────────
const {
  getAdminHeadshipTransfers,
  approveAdminHeadshipTransfer,
  rejectAdminHeadshipTransfer
} = require('../controllers/headshipTransferController');

router.get('/headship-transfers', getAdminHeadshipTransfers);
router.post('/headship-transfers/:id/approve', approveAdminHeadshipTransfer);
router.post('/headship-transfers/:id/reject', rejectAdminHeadshipTransfer);

// ── Student Data Correction Review (Section 29) ───────────────────────
const {
  getAdminCorrectionRequests,
  approveAdminCorrectionRequest,
  rejectAdminCorrectionRequest
} = require('../controllers/dataCorrectionController');

router.get('/correction-requests', getAdminCorrectionRequests);
router.post('/correction-requests/:id/approve', approveAdminCorrectionRequest);
router.post('/correction-requests/:id/reject', rejectAdminCorrectionRequest);

// ── Admin Data Management & Imports / Exports (Sections 10, 11, 16, 17, 18, 35, 63) ──
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});
const uploadFile = upload.single('file');

const {
  previewXlsx,
  validateXlsx,
  commitXlsx,
  previewJson,
  validateJson,
  commitJson,
  getImportJobs,
  getImportJobById,
  getImportJobErrors,
  cancelImportJob,
  exportData,
  deleteStudentSafe,
  deleteCourseSafe,
  bulkDeleteSafe,
  createCourse,
  getCourseById,
  updateCourse,
  bulkUpdateCourses
} = require('../controllers/adminDataManagementController');

// ── XLSX Import Pipeline ──
router.post('/imports/xlsx/preview', uploadFile, previewXlsx);
router.post('/imports/xlsx/validate', validateXlsx);
router.post('/imports/xlsx/commit', commitXlsx);

// ── JSON Import Pipeline ──
router.post('/imports/json/preview', previewJson);
router.post('/imports/json/validate', validateJson);
router.post('/imports/json/commit', commitJson);

// ── Import Job Status & Error Reports ──
router.get('/imports', getImportJobs);
router.get('/imports/:id', getImportJobById);
router.get('/imports/:id/errors', getImportJobErrors);
router.post('/imports/:id/cancel', cancelImportJob);

// ── Data Export (XLSX & JSON) ──
router.get('/export/:entity', exportData);
router.get('/exports/:entity', exportData);

// ── Safe Delete & Bulk Deletions ──
router.delete('/students/:id/safe', deleteStudentSafe);
router.post('/bulk-delete', bulkDeleteSafe);

// ── Master Course Management (Section 18 & 34) ──
router.post('/courses', createCourse);
router.get('/courses/:id', getCourseById);
router.patch('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourseSafe);
router.post('/courses/bulk-update', bulkUpdateCourses);

// ── Master Data Direct Access Aliases (Section 34) ──
const { getFaculties, getFacultyById, createFaculty, updateFaculty, deleteFaculty } = require('../controllers/facultyController');
const { getDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment } = require('../controllers/departmentController');
const { getAcademicSessions, createAcademicSession, updateAcademicSession } = require('../controllers/academicSessionController');
const { getSemesters, createSemester } = require('../controllers/academicSessionController');
const { getSeries, createSeries, updateSeries, deleteSeries } = require('../controllers/academicSessionController');

router.get('/faculties', getFaculties);
router.post('/faculties', createFaculty);
router.get('/faculties/:id', getFacultyById);
router.patch('/faculties/:id', updateFaculty);
router.delete('/faculties/:id', deleteFaculty);

router.get('/departments', getDepartments);
router.post('/departments', createDepartment);
router.get('/departments/:id', getDepartmentById);
router.patch('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

router.get('/academic-sessions', getAcademicSessions);
router.post('/academic-sessions', createAcademicSession);
router.patch('/academic-sessions/:id', updateAcademicSession);

router.get('/semesters', getSemesters);
router.post('/semesters', createSemester);

router.get('/series', getSeries);
router.post('/series', createSeries);
router.patch('/series/:id', updateSeries);
router.delete('/series/:id', deleteSeries);

module.exports = router;

