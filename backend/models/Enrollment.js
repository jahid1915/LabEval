const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  courseOfferingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseOffering',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  courseCode: {
    type: String,
    uppercase: true,
    trim: true
  },
  courseName: {
    type: String,
    trim: true
  },
  studentRoll: {
    type: String,
    trim: true
  },
  studentName: {
    type: String,
    trim: true
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty'
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  departmentCode: {
    type: String,
    uppercase: true,
    trim: true
  },
  academicSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession'
  },
  sessionName: {
    type: String,
    trim: true
  },
  semesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Semester'
  },
  semesterName: {
    type: String,
    trim: true
  },
  series: {
    type: String,
    trim: true
  },
  enrollmentType: {
    type: String,
    enum: ['COMPULSORY', 'ELECTIVE', 'SPECIAL'],
    default: 'COMPULSORY'
  },
  status: {
    type: String,
    enum: ['ENROLLED', 'COMPLETED', 'DROPPED', 'CANCELLED'],
    default: 'ENROLLED',
    index: true
  },
  cancellationReason: {
    type: String,
    default: ''
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  droppedAt: {
    type: Date
  }
}, { timestamps: true });

// MANDATORY HARD UNIQUE CONSTRAINT: exactly 1 enrollment per student per course offering
enrollmentSchema.index({ studentId: 1, courseOfferingId: 1 }, { unique: true });

// Performance indexes for academic queries
enrollmentSchema.index({ courseOfferingId: 1, status: 1 });
enrollmentSchema.index({ studentId: 1, semesterName: 1, status: 1 });
enrollmentSchema.index({ studentId: 1, status: 1 });
enrollmentSchema.index({ departmentCode: 1, series: 1, sessionName: 1, status: 1 });
enrollmentSchema.index({ courseCode: 1, series: 1, sessionName: 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
