const mongoose = require('mongoose');

const teacherAssignmentSchema = new mongoose.Schema({
  courseOffering: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseOffering',
    required: true
  },
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
  role: {
    type: String,
    enum: ['PRIMARY', 'CO_TEACHER', 'TEMPORARY'],
    default: 'PRIMARY'
  },
  isTemporary: {
    type: Boolean,
    default: false
  },
  reassignedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    default: null
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'revoked', 'expired'],
    default: 'active'
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
  teacherName: {
    type: String,
    trim: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  departmentCode: {
    type: String,
    uppercase: true,
    trim: true
  },
  semester: {
    type: String,
    default: '3-2'
  },
  academicSession: {
    type: String,
    default: '2024-2025'
  },
  series: {
    type: String,
    default: '22'
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  assignedByName: {
    type: String,
    default: ''
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

teacherAssignmentSchema.index({ courseOffering: 1, teacher: 1 });
teacherAssignmentSchema.index({ teacherId: 1, status: 1 });

module.exports = mongoose.model('TeacherAssignment', teacherAssignmentSchema);
