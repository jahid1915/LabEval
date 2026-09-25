const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');
const Otp = require('../models/Otp');
const { sendOtpEmail } = require('../utils/emailService');
const { logAudit } = require('../middleware/auditMiddleware');

/**
 * Helper to mask email for security
 * e.g., "jahidhasan@gmail.com" -> "j***n@gmail.com"
 */
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return 'your registered email';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
};

/**
 * POST /api/auth/send-otp
 * Request an OTP sent to user's registered Gmail for password change
 */
const requestPasswordResetOtp = async (req, res) => {
  try {
    const { role, identifier, email } = req.body;

    if (!role || (!identifier && !email)) {
      return res.status(400).json({ message: 'Role and User Identifier (Roll/ID/Username) or Email are required' });
    }

    const cleanRole = role.toLowerCase().trim();
    const cleanId = identifier ? String(identifier).trim() : '';
    const cleanEmail = email ? String(email).trim().toLowerCase() : '';

    let userDoc = null;
    let userModel = '';

    if (cleanRole === 'student') {
      userModel = 'Student';
      const query = cleanId 
        ? { rollNumber: cleanId } 
        : { email: cleanEmail };
      userDoc = await Student.findOne(query);
    } else if (cleanRole === 'teacher') {
      userModel = 'Teacher';
      const query = cleanId 
        ? { teacherId: cleanId.toUpperCase() } 
        : { email: cleanEmail };
      userDoc = await Teacher.findOne(query);
    } else if (cleanRole === 'admin' || cleanRole === 'department_head') {
      userModel = 'Admin';
      const query = cleanId 
        ? { username: cleanId.toLowerCase() } 
        : { email: cleanEmail };
      userDoc = await Admin.findOne(query);
    } else {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    if (!userDoc) {
      return res.status(404).json({
        message: `No ${cleanRole} account found with the provided credentials. Please check your Student Roll / Teacher ID / Username.`
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
        message: 'No registered Gmail address found for your account. Please enter your Gmail address below to receive the OTP.'
      });
    }

    // Rate-limiting check: avoid spamming OTPs within 60 seconds
    const existingRecentOtp = await Otp.findOne({
      $or: [{ email: targetEmail }, { identifier: cleanId || userDoc.rollNumber || userDoc.teacherId || userDoc.username }],
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
    });

    if (existingRecentOtp) {
      return res.status(429).json({
        message: 'An OTP was recently sent. Please wait 60 seconds before requesting a new code.'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Invalidate previous OTPs for this user
    await Otp.deleteMany({
      $or: [
        { email: targetEmail },
        { identifier: cleanId || userDoc.rollNumber || userDoc.teacherId || userDoc.username, role: cleanRole }
      ]
    });

    const accountIdentifier = userDoc.rollNumber || userDoc.teacherId || userDoc.username || cleanId;

    // Create OTP record (TTL index will expire after 10 minutes)
    await Otp.create({
      email: targetEmail,
      otp,
      userId: userDoc._id,
      userModel,
      role: cleanRole,
      identifier: accountIdentifier,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    // Send email
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
      targetEmail,
      expiresInMinutes: 10,
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (error) {
    console.error('Error in requestPasswordResetOtp:', error);
    return res.status(500).json({ message: error.message || 'Server error while sending OTP' });
  }
};

/**
 * POST /api/auth/change-password
 * Verify OTP and update password in real-time
 */
const verifyOtpAndChangePassword = async (req, res) => {
  try {
    const { role, identifier, email, otp, newPassword, confirmPassword } = req.body;

    if (!role || !otp || !newPassword) {
      return res.status(400).json({ message: 'Role, OTP, and new password are required' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const cleanRole = role.toLowerCase().trim();
    const cleanOtp = String(otp).trim();
    const cleanId = identifier ? String(identifier).trim() : '';
    const cleanEmail = email ? String(email).trim().toLowerCase() : '';

    // Find active valid OTP
    const queryConditions = [];
    if (cleanEmail) queryConditions.push({ email: cleanEmail });
    if (cleanId) queryConditions.push({ identifier: cleanId, role: cleanRole });
    if (queryConditions.length === 0) {
      queryConditions.push({ role: cleanRole });
    }

    const otpDoc = await Otp.findOne({
      $or: queryConditions,
      otp: cleanOtp,
      used: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      return res.status(400).json({
        message: 'Invalid or expired OTP code. Please enter the correct code or request a new one.'
      });
    }

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
      return res.status(404).json({ message: 'Associated user account not found.' });
    }

    // Update password in database in real-time
    // The pre('save') hook on Student, Teacher, and Admin models automatically hashes modified passwords
    userDoc.password = newPassword;

    // If user didn't have email saved, link the verified email now
    if (!userDoc.email && otpDoc.email) {
      userDoc.email = otpDoc.email;
    }

    await userDoc.save();

    // Mark OTP as used and cleanup
    await Otp.deleteMany({ _id: otpDoc._id });

    // Optional audit log
    try {
      await logAudit({
        req,
        action: 'PASSWORD_RESET_OTP',
        entity: otpDoc.userModel,
        entityId: userDoc._id,
        details: `Password changed successfully via Gmail OTP for ${userDoc.name} (${otpDoc.identifier})`
      });
    } catch {
      // Non-critical audit error
    }

    return res.json({
      success: true,
      message: 'Your password has been changed successfully in real-time! You can now log in with your new password.',
      role: cleanRole
    });
  } catch (error) {
    console.error('Error in verifyOtpAndChangePassword:', error);
    return res.status(500).json({ message: error.message || 'Server error while resetting password' });
  }
};

module.exports = {
  requestPasswordResetOtp,
  verifyOtpAndChangePassword
};
