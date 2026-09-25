const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  otp: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  userModel: {
    type: String,
    enum: ['Student', 'Teacher', 'Admin'],
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin', 'department_head', 'super_admin'],
    required: true
  },
  identifier: {
    type: String,
    required: true,
    trim: true
  },
  used: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  }
}, { timestamps: true });

// TTL index: MongoDB will automatically delete expired documents
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ email: 1, role: 1 });
otpSchema.index({ identifier: 1, role: 1 });

module.exports = mongoose.model('Otp', otpSchema);
