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
  deleteSeries,
  getCohortPreview,
  updateCohortSemester,
  getCohortSemesterHistory
} = require('../controllers/academicSessionController');
const { protect, adminOnly, adminOrHead } = require('../middleware/authMiddleware');
const { getSessionFromSeries, generateSeriesRange, getCurrentAcademicInfo } = require('../utils/academicUtils');

router.use(protect);

// ── Series ↔ Session Utility ──────────────────────────────────────────────────
// GET /api/academic/series-suggest/:series → auto-suggest session
router.get('/series-suggest/:series', (req, res) => {
  const session = getSessionFromSeries(req.params.series);
  if (!session) {
    return res.status(400).json({ message: `Invalid series: "${req.params.series}". Use 2-digit year (e.g. 22, 23).` });
  }
  res.json({ series: req.params.series, session, suggestions: generateSeriesRange(req.params.series, 5) });
});

// GET /api/academic/current-info → current academic year
router.get('/current-info', (req, res) => {
  res.json(getCurrentAcademicInfo());
});

// Sessions (Admin only — global scope)
router.get('/sessions', getAcademicSessions);
router.post('/sessions', adminOnly, createAcademicSession);
router.put('/sessions/:id', adminOnly, updateAcademicSession);

// Semesters
router.get('/semesters', getSemesters);
router.post('/semesters', adminOnly, createSemester);

// Series (Admin only — master academic data)
router.get('/series', getSeries);
router.post('/series', adminOnly, createSeries);
router.put('/series/:id', adminOnly, updateSeries);
router.delete('/series/:id', adminOnly, deleteSeries);

// ── Cohort Current Semester Management & History ───────────────────────
router.get('/cohort-preview', adminOrHead, getCohortPreview);
router.get('/cohort-history', adminOrHead, getCohortSemesterHistory);
router.post('/cohort-semester', adminOnly, updateCohortSemester);
router.post('/update-cohort-semester', adminOnly, updateCohortSemester);

module.exports = router;

