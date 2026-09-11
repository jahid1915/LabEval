const express = require('express');
const router  = express.Router();
const {
  registerStudent,
  loginStudent,
  registerTeacher,
  loginTeacher,
  registerAdmin,
  loginAdmin
} = require('../controllers/authController');

router.post('/student-register', registerStudent);
router.post('/student-login',    loginStudent);
router.post('/teacher-register', registerTeacher);
router.post('/teacher-login',    loginTeacher);
router.post('/admin-register',   registerAdmin);
router.post('/admin-login',      loginAdmin);

module.exports = router;
