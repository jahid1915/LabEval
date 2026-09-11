const express = require('express');
const router = express.Router();
const {
  getCourseOfferings,
  getCourseOfferingById,
  createCourseOffering,
  assignTeacher,
  revokeAssignment,
  togglePublishMarks,
  deleteCourseOffering
} = require('../controllers/courseOfferingController');
const { protect, adminOnly, adminOrTeacher } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getCourseOfferings);
router.get('/:id', getCourseOfferingById);

router.post('/', adminOnly, createCourseOffering);
router.post('/:id/assign', adminOnly, assignTeacher);
router.delete('/:id/assign/:assignmentId', adminOnly, revokeAssignment);
router.patch('/:id/publish-marks', adminOrTeacher, togglePublishMarks);
router.delete('/:id', adminOnly, deleteCourseOffering);

module.exports = router;
