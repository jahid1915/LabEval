const mongoose = require('mongoose');

const supervisionAssignmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentRoll: {
    type: String,
    required: true,
    trim: true
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  teacherId: {
    type: String,
    required: true,
    trim: true
  },
  teacherName: {
    type: String,
    required: true,
    trim: true
  },
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
  academicSession: {
    type: String,
    required: true,
    trim: true
  },
  academicSessionRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession',
    default: null
  },
  series: {
    type: String,
    required: true,
    trim: true
  },
  semester: {
    type: String,
    default: '4th'
  },
  activityType: {
    type: String,
    enum: ['PROJECT_I', 'PROJECT_II', 'SEMINAR', 'THESIS'],
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  role: {
    type: String,
    enum: ['PRIMARY_SUPERVISOR', 'CO_SUPERVISOR'],
    default: 'PRIMARY_SUPERVISOR'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
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

// Prevent accidental duplicate primary supervisor assignments for same activity and session
supervisionAssignmentSchema.index(
  { student: 1, activityType: 1, academicSession: 1, role: 1 },
  { unique: true, partialFilterExpression: { status: 'active', role: 'PRIMARY_SUPERVISOR' } }
);

supervisionAssignmentSchema.index({ departmentCode: 1, activityType: 1 });
supervisionAssignmentSchema.index({ teacher: 1, status: 1 });
supervisionAssignmentSchema.index({ student: 1, status: 1 });
supervisionAssignmentSchema.index({ project: 1 });

module.exports = mongoose.model('SupervisionAssignment', supervisionAssignmentSchema);
