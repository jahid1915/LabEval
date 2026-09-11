const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientRole: {
    type: String,
    enum: ['admin', 'teacher', 'student', 'all'],
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  recipientIdentifier: {
    type: String, // teacherId or rollNumber or username
    trim: true,
    default: ''
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['assignment', 'leave', 'marks', 'attendance', 'announcement', 'system'],
    default: 'system'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  linkUrl: {
    type: String,
    default: ''
  }
}, { timestamps: true });

notificationSchema.index({ recipientRole: 1, recipientId: 1, isRead: 1 });
notificationSchema.index({ recipientIdentifier: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
