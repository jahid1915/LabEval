const mongoose = require('mongoose');

const departmentHeadHistorySchema = new mongoose.Schema({
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  departmentCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    default: null
  },
  facultyCode: {
    type: String,
    uppercase: true,
    trim: true,
    default: ''
  },
  previousHead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    default: null
  },
  previousHeadId: {
    type: String,
    trim: true,
    default: ''
  },
  previousHeadName: {
    type: String,
    trim: true,
    default: ''
  },
  newHead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    default: null
  },
  newHeadId: {
    type: String,
    trim: true,
    default: ''
  },
  newHeadName: {
    type: String,
    trim: true,
    default: ''
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedByName: {
    type: String,
    trim: true,
    default: 'System Admin'
  },
  effectiveDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  reason: {
    type: String,
    trim: true,
    default: 'Department Head appointment/reassignment'
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'revoked'],
    default: 'active'
  }
}, { timestamps: true });

departmentHeadHistorySchema.index({ departmentCode: 1, effectiveDate: -1 });
departmentHeadHistorySchema.index({ department: 1, status: 1 });
departmentHeadHistorySchema.index({ newHeadId: 1 });

module.exports = mongoose.model('DepartmentHeadHistory', departmentHeadHistorySchema);
