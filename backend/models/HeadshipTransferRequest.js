const mongoose = require('mongoose');

const headshipTransferRequestSchema = new mongoose.Schema({
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  departmentCode: {
    type: String,
    required: true,
    uppercase: true
  },
  currentHead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    default: null
  },
  currentHeadUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentHeadName: {
    type: String,
    required: true
  },
  proposedHead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  proposedHeadUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  proposedHeadName: {
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
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  adminNotes: {
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

headshipTransferRequestSchema.index({ departmentCode: 1, status: 1 });
headshipTransferRequestSchema.index({ currentHead: 1 });

module.exports = mongoose.model('HeadshipTransferRequest', headshipTransferRequestSchema);
