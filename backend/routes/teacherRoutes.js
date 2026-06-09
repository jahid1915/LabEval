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
  saveViva,
  getRecords,
  bulkSaveAttendance,
} = require('../controllers/teacherController');

const { getFinalResults }    = require('../controllers/teacherResultController');
const { getCourses, addCourse, deleteCourse } = require('../controllers/courseController');
const { getTeacherRequests, updateRequest }   = require('../controllers/requestController');
const { protect, teacherOnly }               = require('../middleware/authMiddleware');

router.use(protect);
router.use(teacherOnly);

// ── Course management ──────────────────────────────────────────────
router.get('/courses',       getCourses);
router.post('/courses',      addCourse);
router.delete('/courses/:id', deleteCourse);

// ── Student fetch ──────────────────────────────────────────────────
// GET /api/teacher/students/any?department=ETE&series=22
router.get('/students/any',       getStudentsByCourse);
router.get('/students/:courseId', getStudentsByCourse);

// ── Lab data save / update ─────────────────────────────────────────
router.post('/attendance/bulk', bulkSaveAttendance);
router.post('/attendance',      saveAttendance);
router.post('/report',          saveReport);
router.post('/performance',     savePerformance);
router.post('/quiz',            saveQuiz);
router.post('/test',            saveTest);
router.post('/others',          saveOthers);
router.post('/viva',            saveViva);

// ── Records fetch ──────────────────────────────────────────────────
router.get('/records/:model/:courseId', getRecords);

// ── Final results ──────────────────────────────────────────────────
router.get('/results/:courseId', getFinalResults);

// ── Student requests ───────────────────────────────────────────────
router.get('/requests',         getTeacherRequests);
router.patch('/requests/:id',   updateRequest);

module.exports = router;
