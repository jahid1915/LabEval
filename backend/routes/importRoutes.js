const express = require('express');
const router = express.Router();
const {
  uploadMiddleware,
  downloadTemplate,
  parseUpload,
  previewImport,
  executeImport,
  downloadErrorReport,
  getMappingTemplates,
  saveMappingTemplate,
  deleteMappingTemplate,
  getImportHistory,
  getImportJobDetail,
  getSessionForSeries,
  exportStudents,
  getSession,
  updateSessionMapping,
  updateSessionCorrection,
  updateSessionCredentials,
  deleteSession
} = require('../controllers/importController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// All import routes require authentication
router.use(protect);

// ── Template Download ─────────────────────────────────────────────────────────
router.get('/template', downloadTemplate);

// ── Series → Session utility ──────────────────────────────────────────────────
router.get('/series-session/:series', getSessionForSeries);

// ── Admin-only Import & Management Routes ──────────────────────────────────────
router.use(adminOnly);

// Step 1: Upload and parse XLSX to inspect sheets and headers
router.post('/students/parse', uploadMiddleware, parseUpload);

// Session State Management (Requirements 2, 8, 10, 34, 35)
router.get('/session/:sessionId', getSession);
router.patch('/session/:sessionId/mapping', updateSessionMapping);
router.patch('/session/:sessionId/correction', updateSessionCorrection);
router.patch('/session/:sessionId/credentials', updateSessionCredentials);
router.delete('/session/:sessionId', deleteSession);

// Step 2 & 3: Preview import (validate, selective mapping, duplicate checks)
router.post('/students/preview', previewImport);

// Step 4: Execute import
router.post('/students/execute', executeImport);

// Error Report Download
router.post('/download-error-report', downloadErrorReport);

// Saved Column Mapping Templates (Requirement 42)
router.get('/mapping-templates', getMappingTemplates);
router.post('/mapping-templates', saveMappingTemplate);
router.delete('/mapping-templates/:id', deleteMappingTemplate);

// Student Export (Requirement 56)
router.get('/students/export', exportStudents);

// Import History
router.get('/history', getImportHistory);
router.get('/history/:jobId', getImportJobDetail);

module.exports = router;
