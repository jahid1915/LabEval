const express = require('express');
const router  = express.Router();
const {
  registerStudent,
  loginStudent,
  registerTeacher,
  loginTeacher,
  registerAdmin,
  loginAdmin,
  demoLogin
} = require('../controllers/authController');
const {
  requestPasswordResetOtp,
  verifyOtpAndChangePassword
} = require('../controllers/passwordController');

router.post('/student-register', registerStudent);
router.post('/student-login',    loginStudent);
router.post('/teacher-register', registerTeacher);
router.post('/teacher-login',    loginTeacher);
router.post('/admin-register',   registerAdmin);
router.post('/admin-login',      loginAdmin);
router.post('/demo-login',       demoLogin);

// ── Password Reset / Change via Gmail OTP ─────────────────────────────
router.post('/send-otp',         requestPasswordResetOtp);
router.post('/change-password',  verifyOtpAndChangePassword);

module.exports = router;

