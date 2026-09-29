const mongoose = require('mongoose');

const finalEnrollmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  courseCode: {
    type: String,
    uppercase: true,
    trim: true
  },
  offeringId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ElectiveOffering'
  },
  courseOfferingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseOffering'
  },
  enrollmentType: {
    type: String,
    enum: ['ELECTIVE', 'CORE', 'SPECIAL'],
    default: 'ELECTIVE'
  },
  source: {
    type: String,
    default: 'ELECTIVE_ALLOCATION'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'dropped', 'completed'],
    default: 'active'
  }
}, { timestamps: true });

// Prevent duplicate enrollment for the same student in the same course
finalEnrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
finalEnrollmentSchema.index({ courseId: 1, status: 1 });
finalEnrollmentSchema.index({ offeringId: 1 });
finalEnrollmentSchema.index({ courseOfferingId: 1 });

module.exports = mongoose.model('FinalEnrollment', finalEnrollmentSchema);
