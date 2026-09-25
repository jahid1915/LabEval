const express = require('express');
const router = express.Router();
const {
  uploadMiddleware,
  downloadTemplate,
  parseUpload,
  previewImport,
  executeImport,
  getImportHistory,
  getImportJobDetail,
  getSessionForSeries
} = require('../controllers/importController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// All import routes require authentication
router.use(protect);

// ── Template Download (public to all auth users) ─────────────────────────────
router.get('/template', downloadTemplate);

// ── Series → Session utility (all authenticated) ──────────────────────────────
router.get('/series-session/:series', getSessionForSeries);

// ── Admin-only Import Routes ──────────────────────────────────────────────────
router.use(adminOnly);

// Step 1: Upload and parse XLSX to detect headers
router.post('/students/parse', uploadMiddleware, parseUpload);

// Step 2: Preview import (validate + check DB, no write)
router.post('/students/preview', previewImport);

// Step 3: Execute import (actual write or dry run confirmation)
router.post('/students/execute', executeImport);

// ── Import History ────────────────────────────────────────────────────────────
router.get('/history', getImportHistory);
router.get('/history/:jobId', getImportJobDetail);

module.exports = router;
