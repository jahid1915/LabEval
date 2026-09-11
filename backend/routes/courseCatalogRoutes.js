const express = require('express');
const router = express.Router();
const {
  getMasterCourses,
  createMasterCourse,
  updateMasterCourse,
  deleteMasterCourse
} = require('../controllers/courseCatalogController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getMasterCourses);
router.post('/', adminOnly, createMasterCourse);
router.put('/:id', adminOnly, updateMasterCourse);
router.delete('/:id', adminOnly, deleteMasterCourse);

module.exports = router;
