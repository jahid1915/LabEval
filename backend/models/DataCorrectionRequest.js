const mongoose = require('mongoose');

const dataCorrectionRequestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentRoll: {
    type: String,
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  departmentCode: {
    type: String,
    required: true,
    uppercase: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedByName: {
    type: String,
    required: true
  },
  field: {
    type: String,
    required: true,
    enum: ['name', 'rollNumber', 'registrationNumber', 'session', 'series', 'semester', 'department', 'status', 'other']
  },
  currentValue: {
    type: String,
    default: ''
  },
  proposedValue: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminResponse: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

dataCorrectionRequestSchema.index({ departmentCode: 1, status: 1 });

module.exports = mongoose.model('DataCorrectionRequest', dataCorrectionRequestSchema);
