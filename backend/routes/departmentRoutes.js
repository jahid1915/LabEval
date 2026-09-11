const express = require('express');
const router = express.Router();
const {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
} = require('../controllers/departmentController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getDepartments);
router.get('/:id', getDepartmentById);

router.post('/', adminOnly, createDepartment);
router.put('/:id', adminOnly, updateDepartment);
router.delete('/:id', adminOnly, deleteDepartment);

module.exports = router;
