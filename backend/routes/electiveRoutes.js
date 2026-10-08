/**
 * Elective Course Management Routes
 * Handles Admin, Department Head, Student, and Teacher elective course operations
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
const { protect, adminOnly, adminOrHead, teacherOnly } = require('../middleware/authMiddleware');

router.use(protect);

// ── Elective Catalog (Admin, Department Head & Authenticated) ──────────────────
router.get('/catalog', getElectiveCoursesCatalog);
router.get('/admin/catalog', adminOrHead, getElectiveCoursesCatalog);

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

// ── Admin / Department Head Routes ───────────────────────────────────────────
// Department Heads can manage electives for their own department.
// Global Admins have unrestricted access across all departments.
router.post('/admin/offering', adminOrHead, createOffering);
router.get('/admin/offerings', adminOrHead, getOfferings);
router.get('/admin/offering/:id', adminOrHead, getOfferingStats);
router.patch('/admin/offering/:id', adminOrHead, updateOffering);
router.delete('/admin/offering/:id', adminOrHead, deleteOffering);

router.get('/admin/:offeringId/selections', adminOrHead, getOfferingSelections);
router.get('/admin/:offeringId/voting-details', adminOrHead, getOfferingVotingDetails);
router.get('/admin/offering/:offeringId/voting-details', adminOrHead, getOfferingVotingDetails);
router.get('/admin/:offeringId/check-academic-records', adminOrHead, checkAcademicRecords);
router.post('/admin/:offeringId/reopen', adminOrHead, reopenOffering);
router.patch('/admin/selections/:id', adminOrHead, updateStudentSelectionAdmin);
router.post('/admin/:offeringId/bulk-assign', adminOrHead, bulkAssignElectives);
router.post('/admin/:offeringId/finalize', adminOrHead, finalizeOffering);
router.post('/admin/:offeringId/approve', adminOrHead, finalizeOffering); // alias
router.get('/admin/:offeringId/export', adminOrHead, exportOfferingAllocations);

module.exports = router;
