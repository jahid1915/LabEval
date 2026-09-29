const mongoose = require('mongoose');

const electiveSelectionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  offeringId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ElectiveOffering',
    required: true
  },
  selectedCourse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  selectedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  studentName: { type: String, trim: true, default: '' },
  roll: { type: String, trim: true, default: '' },
  registrationNo: { type: String, trim: true, default: '' },
  series: { type: String, trim: true, default: '' },
  semester: { type: String, trim: true, default: '' },
  department: { type: String, trim: true, uppercase: true, default: '' },
  courseCode: { type: String, trim: true, uppercase: true, default: '' },
  courseName: { type: String, trim: true, default: '' },
  status: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
    default: 'SUBMITTED'
  },
  votedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  adminOverridden: {
    type: Boolean,
    default: false
  },
  adminNotes: {
    type: String,
    default: ''
  },
  approvedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Prevent multiple selection records for the same student and elective offering
electiveSelectionSchema.index({ studentId: 1, offeringId: 1 }, { unique: true });
electiveSelectionSchema.index({ offeringId: 1, status: 1 });
electiveSelectionSchema.index({ selectedCourses: 1 });

module.exports = mongoose.model('ElectiveSelection', electiveSelectionSchema);
