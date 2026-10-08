const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateUserStatus,
  resetUserPassword
} = require('../controllers/userController');
const { protect, adminOrHead } = require('../middleware/authMiddleware');

router.use(protect);
router.use(adminOrHead);

router.get('/', getUsers);
router.get('/:id', getUserById);
router.patch('/:id/status', updateUserStatus);
router.post('/:id/reset-password', resetUserPassword);

module.exports = router;
