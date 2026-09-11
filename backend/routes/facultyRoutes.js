const express = require('express');
const router = express.Router();
const {
  getFaculties,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty
} = require('../controllers/facultyController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getFaculties);
router.get('/:id', getFacultyById);

router.post('/', adminOnly, createFaculty);
router.put('/:id', adminOnly, updateFaculty);
router.delete('/:id', adminOnly, deleteFaculty);

module.exports = router;
