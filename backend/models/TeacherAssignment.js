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
    enum: ['PRIMARY_TEACHER', 'CO_TEACHER', 'LAB_TEACHER', 'COURSE_COORDINATOR', 'PRIMARY', 'TEMPORARY'],
    default: 'PRIMARY_TEACHER'
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
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty'
  },
  facultyCode: {
    type: String,
    uppercase: true,
    trim: true,
    default: ''
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
    ref: 'User'
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
teacherAssignmentSchema.index({ courseOffering: 1, status: 1, role: 1 });
teacherAssignmentSchema.index({ departmentCode: 1, status: 1 });
teacherAssignmentSchema.index({ facultyCode: 1, status: 1 });
teacherAssignmentSchema.index({ academicSession: 1, semester: 1 });
teacherAssignmentSchema.index({ status: 1, updatedAt: -1 });
teacherAssignmentSchema.index({ status: 1, departmentCode: 1, updatedAt: -1 });

module.exports = mongoose.model('TeacherAssignment', teacherAssignmentSchema);
