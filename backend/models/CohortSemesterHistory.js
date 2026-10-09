const mongoose = require('mongoose');

const cohortSemesterHistorySchema = new mongoose.Schema({
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  departmentCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true
  },
  series: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Series',
    required: true,
    index: true
  },
  seriesName: {
    type: String,
    required: true,
    trim: true
  },
  academicSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession',
    default: null
  },
  sessionName: {
    type: String,
    trim: true,
    default: ''
  },
  section: {
    type: String,
    trim: true,
    default: 'ALL'
  },
  previousSemester: {
    type: String,
    required: true,
    trim: true // e.g. "2-2" or "4th Semester"
  },
  newSemester: {
    type: String,
    required: true,
    trim: true // e.g. "3-1" or "5th Semester"
  },
  effectiveAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changedByName: {
    type: String,
    trim: true,
    default: ''
  },
  reason: {
    type: String,
    trim: true,
    default: 'Academic cohort progression'
  },
  affectedStudentsCount: {
    type: Number,
    default: 0
  },
  availableOfferingsCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Compound indexes for fast historical lookups
cohortSemesterHistorySchema.index({ series: 1, effectiveAt: -1 });
cohortSemesterHistorySchema.index({ departmentCode: 1, seriesName: 1, effectiveAt: -1 });

module.exports = mongoose.model('CohortSemesterHistory', cohortSemesterHistorySchema);
