const express = require('express');
const router  = express.Router();
const { registerStudent, loginStudent, registerTeacher, loginTeacher } = require('../controllers/authController');

router.post('/student-register', registerStudent);
router.post('/student-login',    loginStudent);
router.post('/teacher-register', registerTeacher);
router.post('/teacher-login',    loginTeacher);

module.exports = router;
