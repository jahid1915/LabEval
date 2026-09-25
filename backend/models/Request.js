const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true 
  },
  studentRoll: {
    type: String,
    trim: true,
  },
  studentName: {
    type: String,
    trim: true,
  },
  series: {
    type: String,
    trim: true,
  },
  department: {
    type: String,
    uppercase: true,
    trim: true,
  },
  semester: {
    type: String,
    trim: true,
    default: '3-2'
  },
  academicSession: {
    type: String,
    trim: true,
    default: '2024-2025'
  },
  course: { 
    type: String, 
    required: true,
    uppercase: true,
    trim: true,
  }, // courseCode, e.g. "ETE 3221"
  courseName: {
    type: String,
    trim: true,
  },
  teacher: { 
    type: String, 
    required: true,
    uppercase: true,
    trim: true,
  }, // teacherId, e.g. "ETE-294"
  teacherRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
  },
  teacherName: {
    type: String,
    trim: true,
  },
  requestDate: {
    type: Date,
    default: Date.now,
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Accepted', 'Rejected', 'Completed'], 
    default: 'Pending' 
  },
  detailedMarks: {
    quiz:         { type: Number, default: 0 },
    labReport:    { type: Number, default: 0 },
    labViva:      { type: Number, default: 0 },
    labTest:      { type: Number, default: 0 },
    openEnded:    { type: mongoose.Schema.Types.Mixed, default: 'A' },
    attendance:   { type: Number, default: 0 },
    assignment:   { type: Number, default: 0 },
    midterm:      { type: Number, default: 0 },
    final:        { type: Number, default: 0 },
    presentation: { type: Number, default: 0 },
    others:       { type: Number, default: 0 },
    total:        { type: Number, default: 0 },
    grade:        { type: String, default: '' },
    gradePoint:   { type: Number, default: 0 },
  },
  remarks: {
    type: String,
    default: '',
  },
  processedAt: {
    type: Date,
  }
}, { timestamps: true });

requestSchema.index({ student: 1, course: 1, semester: 1 }, { unique: true });
requestSchema.index({ teacher: 1, status: 1 });
requestSchema.index({ department: 1, series: 1 });

module.exports = mongoose.model('Request', requestSchema);