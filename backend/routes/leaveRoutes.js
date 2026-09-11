const express = require('express');
const router = express.Router();
const {
  getMyLeaves,
  submitLeave,
  cancelLeave,
  getAllLeaves,
  reviewLeave
} = require('../controllers/leaveController');
const { protect, teacherOnly, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/my', teacherOnly, getMyLeaves);
router.post('/', teacherOnly, submitLeave);
router.patch('/:id/cancel', teacherOnly, cancelLeave);

router.get('/', adminOnly, getAllLeaves);
router.patch('/:id/review', adminOnly, reviewLeave);

module.exports = router;
