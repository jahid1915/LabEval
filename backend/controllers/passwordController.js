const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');
const Otp = require('../models/Otp');
const { sendOtpEmail } = require('../utils/emailService');
const { logAudit } = require('../middleware/auditMiddleware');

// ── Constants ─────────────────────────────────────────────────────────
const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_SECONDS = 60;
const OTP_MAX_REQUESTS_PER_WINDOW = 3;
const OTP_RATE_WINDOW_MINUTES = 15;
const MIN_PASSWORD_LENGTH = 6;

/**
 * Generate a cryptographically secure 6-digit OTP
 */
const generateSecureOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Hash OTP using salted SHA-256 for fast, zero-leak verification
 */
const hashOtp = (otp) => {
  const secret = process.env.JWT_SECRET || 'labeval-ruet-otp-salt';
  return crypto
    .createHash('sha256')
    .update(`${otp}:${secret}`)
    .digest('hex');
};

/**
 * Constant-time OTP hash verification to prevent timing attacks
 */
const verifyOtpHash = (plainOtp, hash) => {
  if (!plainOtp || !hash) return false;
  try {
    const computed = hashOtp(String(plainOtp).trim());
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
};

/**
 * Mask email for security (e.g. "jahidhasan@gmail.com" -> "j***n@gmail.com")
 */
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return 'your registered email';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
};

/**
 * POST /api/auth/send-otp
 * Request an OTP sent to user's registered email for password change
 */
const requestPasswordResetOtp = async (req, res) => {
  try {
    const { role, identifier, email } = req.body;

    if (!role || (!identifier && !email)) {
      return res.status(400).json({
        success: false,
        message: 'Role and User Identifier (Roll/ID/Username) or Email are required'
      });
    }

    const cleanRole = role.toLowerCase().trim();
    const cleanId = identifier ? String(identifier).trim() : '';
    const cleanEmail = email ? String(email).trim().toLowerCase() : '';

    let userDoc = null;
    let userModel = '';

    if (cleanRole === 'student') {
      userModel = 'Student';
      const query = cleanId
        ? { rollNumber: cleanId.toUpperCase() }
        : { email: cleanEmail };
      userDoc = await Student.findOne(query).select('_id name email rollNumber status').lean();
    } else if (cleanRole === 'teacher') {
      userModel = 'Teacher';
      const query = cleanId
        ? { teacherId: cleanId.toUpperCase() }
        : { email: cleanEmail };
      userDoc = await Teacher.findOne(query).select('_id name email teacherId').lean();
    } else if (cleanRole === 'admin' || cleanRole === 'department_head') {
      userModel = 'Admin';
      const query = cleanId
        ? { username: cleanId.toLowerCase() }
        : { email: cleanEmail };
      userDoc = await Admin.findOne(query).select('_id name email username').lean();
    } else {
      return res.status(400).json({ success: false, message: 'Invalid role specified' });
    }

    if (!userDoc) {
      // Generic message to prevent user enumeration
      return res.status(200).json({
        success: true,
        message: 'If an account exists with those credentials, an OTP has been sent to the registered email.',
        emailMasked: 'your registered email',
        expiresInMinutes: OTP_EXPIRY_MINUTES
      });
    }

    // Check if student account is active
    if (cleanRole === 'student' && userDoc.status && userDoc.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This student account is currently inactive. Please contact your department administrator.'
      });
    }

    // Determine target email
    let targetEmail = userDoc.email ? userDoc.email.trim().toLowerCase() : '';
    if (!targetEmail && cleanEmail) {
      targetEmail = cleanEmail;
    }

    if (!targetEmail) {
      return res.status(400).json({
        requiresEmailInput: true,
        message: 'No registered email address found for your account. Please enter your email address below to receive the OTP.'
      });
    }

    const accountIdentifier = userDoc.rollNumber || userDoc.teacherId || userDoc.username || cleanId;

    // Layered Rate Limiting:
    // 1. Account / Identifier limit: max OTP_MAX_REQUESTS_PER_WINDOW in OTP_RATE_WINDOW_MINUTES
    const windowStart = new Date(Date.now() - OTP_RATE_WINDOW_MINUTES * 60 * 1000);
    const recentAccountOtpCount = await Otp.countDocuments({
      identifier: accountIdentifier,
      role: cleanRole,
      createdAt: { $gt: windowStart }
    });

    if (recentAccountOtpCount >= OTP_MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        success: false,
        message: `Too many OTP requests for this account. Please wait ${OTP_RATE_WINDOW_MINUTES} minutes before trying again.`
      });
    }

    // 2. Email limit: prevent spamming same email address
    const recentEmailOtpCount = await Otp.countDocuments({
      email: targetEmail,
      createdAt: { $gt: windowStart }
    });

    if (recentEmailOtpCount >= OTP_MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        success: false,
        message: `Too many OTP requests for this email address. Please wait ${OTP_RATE_WINDOW_MINUTES} minutes before trying again.`
      });
    }

    // 3. Cooldown check: avoid back-to-back OTP generation within OTP_COOLDOWN_SECONDS
    const cooldownTime = new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000);
    const existingRecentOtp = await Otp.findOne({
      identifier: accountIdentifier,
      role: cleanRole,
      createdAt: { $gt: cooldownTime }
    }).lean();

    if (existingRecentOtp) {
      return res.status(429).json({
        success: false,
        message: `An OTP was recently sent. Please wait ${OTP_COOLDOWN_SECONDS} seconds before requesting a new code.`
      });
    }

    // Generate cryptographically secure 6-digit OTP
    const otp = generateSecureOtp();
    const otpHashed = hashOtp(otp);

    // Invalidate all previous active OTPs for this user
    await Otp.deleteMany({
      $or: [
        { identifier: accountIdentifier, role: cleanRole },
        { email: targetEmail }
      ]
    });

    // Create OTP record with hashed OTP
    await Otp.create({
      email: targetEmail,
      otpHash: otpHashed,
      userId: userDoc._id,
      studentId: cleanRole === 'student' ? userDoc._id : undefined,
      userModel,
      role: cleanRole,
      identifier: accountIdentifier,
      attemptCount: 0,
      used: false,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
    });

    // Send email (raw OTP exists only in backend memory temporarily and in email body)
    await sendOtpEmail({
      to: targetEmail,
      userName: userDoc.name,
      otp,
      role: cleanRole,
      identifier: accountIdentifier
    });

    return res.json({
      success: true,
      message: `Verification OTP has been sent to ${maskEmail(targetEmail)}`,
      emailMasked: maskEmail(targetEmail),
      expiresInMinutes: OTP_EXPIRY_MINUTES
    });
  } catch (error) {
    console.error('Error in requestPasswordResetOtp:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while sending OTP. Please try again.'
    });
  }
};

/**
 * POST /api/auth/verify-otp
 * Verify OTP code atomically with attempt limiting
 */
const verifyOtp = async (req, res) => {
  try {
    const { role, identifier, email, otp } = req.body;

    if (!role || !otp) {
      return res.status(400).json({ success: false, message: 'Role and OTP are required' });
    }

    const cleanRole = role.toLowerCase().trim();
    const cleanOtp = String(otp).trim();
    const cleanId = identifier ? String(identifier).trim() : '';
    const cleanEmail = email ? String(email).trim().toLowerCase() : '';

    const queryConditions = [];
    if (cleanId) queryConditions.push({ identifier: cleanId, role: cleanRole });
    if (cleanEmail) queryConditions.push({ email: cleanEmail, role: cleanRole });
    if (queryConditions.length === 0) {
      return res.status(400).json({ success: false, message: 'Identifier or email is required' });
    }

    // Atomic find and increment attempt count
    const otpDoc = await Otp.findOneAndUpdate(
      {
        $or: queryConditions,
        used: false,
        expiresAt: { $gt: new Date() },
        attemptCount: { $lt: OTP_MAX_ATTEMPTS }
      },
      { $inc: { attemptCount: 1 } },
      { new: true, sort: { createdAt: -1 } }
    );

    if (!otpDoc) {
      // Check if document exists but exceeded max attempts
      const lockedDoc = await Otp.findOne({
        $or: queryConditions,
        attemptCount: { $gte: OTP_MAX_ATTEMPTS }
      });
      if (lockedDoc) {
        await Otp.deleteOne({ _id: lockedDoc._id });
        return res.status(400).json({
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new OTP.'
        });
      }

      return res.status(400).json({
        success: false,
        message: 'No valid OTP found or code has expired. Please request a new one.'
      });
    }

    // Constant-time hash verification
    const isValid = verifyOtpHash(cleanOtp, otpDoc.otpHash);

    if (!isValid) {
      const remaining = OTP_MAX_ATTEMPTS - otpDoc.attemptCount;
      if (remaining <= 0) {
        await Otp.deleteOne({ _id: otpDoc._id });
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP code. Maximum attempts exceeded. Please request a new OTP.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Invalid OTP code. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`
      });
    }

    return res.json({
      success: true,
      message: 'OTP verified successfully. You can now set a new password.',
      verified: true
    });
  } catch (error) {
    console.error('Error in verifyOtp:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while verifying OTP' });
  }
};

/**
 * POST /api/auth/reset-password
 * Change password after OTP verification
 */
const resetPassword = async (req, res) => {
  try {
    const { role, identifier, email, otp, newPassword, confirmPassword } = req.body;

    if (!role || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Role, OTP, and new password are required' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
      });
    }

    const cleanRole = role.toLowerCase().trim();
    const cleanOtp = String(otp).trim();
    const cleanId = identifier ? String(identifier).trim() : '';
    const cleanEmail = email ? String(email).trim().toLowerCase() : '';

    const queryConditions = [];
    if (cleanId) queryConditions.push({ identifier: cleanId, role: cleanRole });
    if (cleanEmail) queryConditions.push({ email: cleanEmail, role: cleanRole });
    if (queryConditions.length === 0) {
      return res.status(400).json({ success: false, message: 'Identifier or email is required' });
    }

    // Atomic find and increment attempt count
    const otpDoc = await Otp.findOneAndUpdate(
      {
        $or: queryConditions,
        used: false,
        expiresAt: { $gt: new Date() },
        attemptCount: { $lt: OTP_MAX_ATTEMPTS }
      },
      { $inc: { attemptCount: 1 } },
      { new: true, sort: { createdAt: -1 } }
    );

    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        message: 'No valid OTP found or code has expired. Please request a new one.'
      });
    }

    // Verify OTP hash
    const isValid = verifyOtpHash(cleanOtp, otpDoc.otpHash);

    if (!isValid) {
      const remaining = OTP_MAX_ATTEMPTS - otpDoc.attemptCount;
      if (remaining <= 0) {
        await Otp.deleteOne({ _id: otpDoc._id });
      }
      return res.status(400).json({
        success: false,
        message: remaining > 0
          ? `Invalid OTP code. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`
          : 'Invalid OTP code. Maximum attempts exceeded. Please request a new OTP.'
      });
    }

    // Mark OTP as used immediately
    otpDoc.used = true;
    await otpDoc.save();

    // Retrieve corresponding user
    let userDoc = null;
    if (otpDoc.userModel === 'Student') {
      userDoc = await Student.findById(otpDoc.userId);
    } else if (otpDoc.userModel === 'Teacher') {
      userDoc = await Teacher.findById(otpDoc.userId);
    } else if (otpDoc.userModel === 'Admin') {
      userDoc = await Admin.findById(otpDoc.userId);
    }

    if (!userDoc) {
      return res.status(404).json({ success: false, message: 'Associated user account not found.' });
    }

    // Update password (Student/Teacher/Admin pre-save hooks hash it securely)
    userDoc.password = newPassword;

    // Link verified email if not already present
    if (!userDoc.email && otpDoc.email) {
      userDoc.email = otpDoc.email;
    }

    await userDoc.save();

    // Delete all OTPs for this user across database (single-use + complete invalidation)
    await Otp.deleteMany({
      $or: [
        { identifier: otpDoc.identifier, role: cleanRole },
        { email: otpDoc.email }
      ]
    });

    try {
      await logAudit({
        req,
        action: 'PASSWORD_RESET_OTP',
        entity: otpDoc.userModel,
        entityId: userDoc._id,
        details: `Password changed successfully via OTP for ${userDoc.name} (${otpDoc.identifier})`
      });
    } catch {
      // Non-critical audit error
    }

    return res.json({
      success: true,
      message: 'Your password has been changed successfully! You can now log in with your new password.',
      role: cleanRole
    });
  } catch (error) {
    console.error('Error in resetPassword:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while resetting password' });
  }
};

/**
 * POST /api/auth/change-password (Legacy compatibility wrapper)
 */
const verifyOtpAndChangePassword = async (req, res) => {
  return resetPassword(req, res);
};

/**
 * POST /api/auth/update-password
 * Direct authenticated password change using currentPassword and newPassword
 * (Section 26: Student Login -> Account Settings -> Change Password -> Current Password -> New Password -> Confirm Password)
 */
const updatePasswordDirect = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ success: false, message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long` });
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirmation do not match' });
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
    }

    let userDoc = null;
    const role = (req.user.role || '').toLowerCase();

    if (role === 'student') {
      userDoc = await Student.findById(req.user._id);
    } else if (role === 'teacher') {
      userDoc = await Teacher.findById(req.user._id);
    } else if (['admin', 'department_head', 'super_admin'].includes(role)) {
      userDoc = await Admin.findById(req.user._id);
    }

    if (!userDoc) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, userDoc.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    // Set new password (pre-save hook hashes with bcrypt salt 10)
    userDoc.password = newPassword;
    await userDoc.save();

    await logAudit({
      req,
      action: 'PASSWORD_CHANGE_DIRECT',
      entity: userDoc.constructor.modelName || 'User',
      entityId: userDoc._id,
      details: `Password changed directly by user ${userDoc.name || userDoc.username || userDoc.rollNumber}`
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Password changed successfully! Please use your new password next time you log in.'
    });
  } catch (error) {
    console.error('Error in updatePasswordDirect:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while updating password' });
  }
};

module.exports = {
  requestPasswordResetOtp,
  verifyOtp,
  resetPassword,
  verifyOtpAndChangePassword,
  updatePasswordDirect
};
