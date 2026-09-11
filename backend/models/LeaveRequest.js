const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  teacherId: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  teacherName: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true,
    uppercase: true
  },
  leaveType: {
    type: String,
    enum: ['Casual', 'Medical', 'Duty', 'Study', 'Earned', 'Special'],
    default: 'Casual',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  supportingDocUrl: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  reviewRemarks: {
    type: String,
    default: ''
  },
  reviewedAt: {
    type: Date
  }
}, { timestamps: true });

leaveRequestSchema.index({ teacher: 1, status: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1, status: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
