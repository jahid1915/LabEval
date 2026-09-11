const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllRead
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.post('/mark-all-read', markAllRead);

module.exports = router;
