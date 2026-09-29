const mongoose = require('mongoose');

const electiveOfferingSchema = new mongoose.Schema({
  department: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  departmentCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  departmentRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  semester: {
    type: String,
    required: true,
    trim: true // e.g. "3-1", "3-2", "4-1", "4-2"
  },
  academicSession: {
    type: String,
    required: true,
    trim: true // e.g. "2025-2026"
  },
  series: {
    type: String,
    trim: true,
    default: ''
  },
  eligibleSeries: [{
    type: String,
    trim: true
  }],
  electiveGroup: {
    type: String,
    required: true,
    trim: true // e.g. "Elective Group A", "Elective I", "Wireless Communication"
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  availableCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  assignedTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    default: null
  },
  teacherName: {
    type: String,
    trim: true,
    default: ''
  },
  teacherId: {
    type: String,
    trim: true,
    default: ''
  },
  teacherAssignments: [{
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    teacherName: { type: String, trim: true },
    teacherId: { type: String, trim: true }
  }],
  maxChoices: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  selectionOpenAt: {
    type: Date,
    default: Date.now
  },
  selectionCloseAt: {
    type: Date,
    default: null
  },
  offeredAt: {
    type: Date,
    default: Date.now
  },
  votingStartedAt: {
    type: Date,
    default: Date.now
  },
  votingClosedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['DRAFT', 'OFFERED', 'VOTING_OPEN', 'VOTING_CLOSED', 'FINALIZED', 'ARCHIVED', 'CANCELLED', 'REJECTED', 'OPEN', 'CLOSED'],
    default: 'OFFERED'
  },
  showStudentNamesInStats: {
    type: Boolean,
    default: true
  },
  isFinalized: {
    type: Boolean,
    default: false
  },
  finalizedAt: {
    type: Date,
    default: null
  },
  finalizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, { timestamps: true });

// Indexes for fast lookup
electiveOfferingSchema.index({ departmentCode: 1, semester: 1, status: 1 });
electiveOfferingSchema.index({ eligibleSeries: 1, departmentCode: 1, status: 1 });
electiveOfferingSchema.index({ 'teacherAssignments.teacher': 1 });

module.exports = mongoose.model('ElectiveOffering', electiveOfferingSchema);
