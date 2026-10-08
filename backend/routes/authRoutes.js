const express = require('express');
const router  = express.Router();
const {
  login,
  registerStudent,
  registerTeacher,
  registerHead,
  registerAdmin,
  getCurrentUser,
  changePassword,
  logout,
  logoutAll,
  demoLogin
} = require('../controllers/authController');
const {
  requestPasswordResetOtp,
  verifyOtp,
  resetPassword,
  verifyOtpAndChangePassword,
  updatePasswordDirect
} = require('../controllers/passwordController');
const { protect } = require('../middleware/authMiddleware');

// ── UNIFIED CORE AUTH ─────────────────────────────────────────────────────────
// Single unified login for ALL 4 ROLES: Student, Teacher, Department Head, Admin
router.post('/login', login);

// Role-specific Registration Endpoints
router.post('/register/student', registerStudent);
router.post('/register/teacher', registerTeacher);
router.post('/register/head',    registerHead);
router.post('/register/admin',   registerAdmin); // Explicitly prohibited (returns 403)

// Profile & Session Management
router.get('/me',               protect, getCurrentUser);
router.post('/change-password', protect, changePassword);
router.post('/logout',          protect, logout);
router.post('/logout-all',      protect, logoutAll);

// ── LEGACY ALIASES (Preserves Existing Frontends & Automated Tests) ───────────
router.post('/student-login',    login);
router.post('/student-register', registerStudent);
router.post('/teacher-login',    login);
router.post('/teacher-register', registerTeacher);
router.post('/admin-login',      login);
router.post('/admin-register',   registerAdmin); // Blocked with 403
router.post('/head-register',    registerHead);
router.post('/update-password',  protect, changePassword);

// ── DEMO LOGIN ────────────────────────────────────────────────────────────────
router.post('/demo-login',       demoLogin);

// ── Rate Limited OTP Endpoints (Password Recovery) ───────────────────────────
const rateLimit = require('express-rate-limit');
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 100,
  message: { success: false, message: 'Too many OTP requests from this IP. Please try again in 15 minutes.', code: 'OTP_RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/send-otp',         otpLimiter, requestPasswordResetOtp);
router.post('/verify-otp',       otpLimiter, verifyOtp);
router.post('/reset-password',   otpLimiter, resetPassword);

module.exports = router;
