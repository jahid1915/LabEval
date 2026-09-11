const express = require('express');
const router = express.Router();
const {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getAnnouncements);
router.post('/', adminOnly, createAnnouncement);
router.delete('/:id', adminOnly, deleteAnnouncement);

module.exports = router;
