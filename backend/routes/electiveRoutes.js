/**
 * Elective Course Management Routes
 * Handles Admin, Student, and Teacher elective course operations
 */
const express = require('express');
const router = express.Router();
const {
  getElectiveCoursesCatalog,
  createOffering,
  getOfferings,
  getOfferingStats,
  getOfferingVotingDetails,
  checkAcademicRecords,
  updateOffering,
  deleteOffering,
  getOfferingSelections,
  updateStudentSelectionAdmin,
  bulkAssignElectives,
  finalizeOffering,
  reopenOffering,
  exportOfferingAllocations,
  getStudentEligibleOfferings,
  submitStudentVote,
  selectStudentElectives,
  submitStudentElectives,
  getTeacherElectives,
  getTeacherElectiveRoster
} = require('../controllers/electiveController');
const { protect, adminOnly, teacherOnly } = require('../middleware/authMiddleware');

router.use(protect);

// ── Elective Catalog (Admin & Authenticated) ──────────────────────────────────
router.get('/catalog', getElectiveCoursesCatalog);
router.get('/admin/catalog', adminOnly, getElectiveCoursesCatalog);

// ── Public / All Authenticated (View Stats) ───────────────────────────────────
router.get('/:offeringId/stats', getOfferingStats);

// ── Student Routes ────────────────────────────────────────────────────────────
router.get('/student/eligible', getStudentEligibleOfferings);
router.post('/student/:offeringId/vote', submitStudentVote);
router.post('/student/:offeringId/select', selectStudentElectives);
router.patch('/student/:offeringId/select', selectStudentElectives);
router.post('/student/:offeringId/submit', submitStudentElectives);

// ── Teacher Routes ────────────────────────────────────────────────────────────
router.get('/teacher/my-electives', teacherOnly, getTeacherElectives);
router.get('/teacher/:courseId/students', teacherOnly, getTeacherElectiveRoster);

// ── Admin Routes ──────────────────────────────────────────────────────────────
router.post('/admin/offering', adminOnly, createOffering);
router.get('/admin/offerings', adminOnly, getOfferings);
router.get('/admin/offering/:id', adminOnly, getOfferingStats);
router.patch('/admin/offering/:id', adminOnly, updateOffering);
router.delete('/admin/offering/:id', adminOnly, deleteOffering);

router.get('/admin/:offeringId/selections', adminOnly, getOfferingSelections);
router.get('/admin/:offeringId/voting-details', adminOnly, getOfferingVotingDetails);
router.get('/admin/offering/:offeringId/voting-details', adminOnly, getOfferingVotingDetails);
router.get('/admin/:offeringId/check-academic-records', adminOnly, checkAcademicRecords);
router.post('/admin/:offeringId/reopen', adminOnly, reopenOffering);
router.patch('/admin/selections/:id', adminOnly, updateStudentSelectionAdmin);
router.post('/admin/:offeringId/bulk-assign', adminOnly, bulkAssignElectives);
router.post('/admin/:offeringId/finalize', adminOnly, finalizeOffering);
router.post('/admin/:offeringId/approve', adminOnly, finalizeOffering); // alias
router.get('/admin/:offeringId/export', adminOnly, exportOfferingAllocations);

module.exports = router;
