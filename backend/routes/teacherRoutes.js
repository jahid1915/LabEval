const express = require('express');
const router  = express.Router();

const {
  getStudentsByCourse,
  saveAttendance,
  saveReport,
  savePerformance,
  saveQuiz,
  saveTest,
  saveOthers,
  getRecords,
  bulkSaveAttendance,
} = require('../controllers/teacherController');

const { getFinalResults, submitMarkSheet } = require('../controllers/teacherResultController');
const {
  getCourses,
  addCourse,
  deleteCourse,
  getAssessmentConfig,
  updateAssessmentConfig
} = require('../controllers/courseController');
const { getTeacherRequests, updateRequest }   = require('../controllers/requestController');
const { protect, teacherOnly, requireTeacherCourseAccess } = require('../middleware/authMiddleware');

router.use(protect);
router.use(teacherOnly);

// ── Course management ──────────────────────────────────────────────
router.get('/courses',       getCourses);
router.post('/courses',      addCourse);
router.delete('/courses/:id', deleteCourse);

// ── Assessment configuration (per course) ─────────────────────────
router.get('/courses/:id/config',   getAssessmentConfig);
router.patch('/courses/:id/config', updateAssessmentConfig);

// ── Student fetch ──────────────────────────────────────────────────
router.get('/students/any',       getStudentsByCourse);
router.get('/students/:courseId', requireTeacherCourseAccess, getStudentsByCourse);

// ── Lab data save / update ─────────────────────────────────────────
router.post('/attendance/bulk', requireTeacherCourseAccess, bulkSaveAttendance);
router.post('/attendance',      requireTeacherCourseAccess, saveAttendance);
router.post('/report',          requireTeacherCourseAccess, saveReport);
router.post('/performance',     requireTeacherCourseAccess, savePerformance);
router.post('/quiz',            requireTeacherCourseAccess, saveQuiz);
router.post('/test',            requireTeacherCourseAccess, saveTest);
router.post('/others',          requireTeacherCourseAccess, saveOthers);

// ── Records fetch ──────────────────────────────────────────────────
router.get('/records/:model/:courseId', requireTeacherCourseAccess, getRecords);

// ── Final results ──────────────────────────────────────────────────
router.get('/results/:courseId', requireTeacherCourseAccess, getFinalResults);
router.post('/results/:courseId/submit', requireTeacherCourseAccess, submitMarkSheet);

// ── Student requests ───────────────────────────────────────────────
router.get('/requests',         getTeacherRequests);
router.patch('/requests/:id',   updateRequest);

module.exports = router;
