const express = require('express');
const router = express.Router();
const {
  getAcademicSessions,
  createAcademicSession,
  updateAcademicSession,
  getSemesters,
  createSemester,
  getSeries,
  createSeries,
  updateSeries,
  deleteSeries
} = require('../controllers/academicSessionController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);

// Sessions
router.get('/sessions', getAcademicSessions);
router.post('/sessions', adminOnly, createAcademicSession);
router.put('/sessions/:id', adminOnly, updateAcademicSession);

// Semesters
router.get('/semesters', getSemesters);
router.post('/semesters', adminOnly, createSemester);

// Series
router.get('/series', getSeries);
router.post('/series', adminOnly, createSeries);
router.put('/series/:id', adminOnly, updateSeries);
router.delete('/series/:id', adminOnly, deleteSeries);

module.exports = router;
