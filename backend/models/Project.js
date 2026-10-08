const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  dueDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  completedAt: {
    type: Date,
    default: null
  },
  completedBy: {
    type: String,
    default: ''
  }
}, { _id: true, timestamps: true });

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  activityType: {
    type: String,
    enum: ['PROJECT_I', 'PROJECT_II', 'SEMINAR', 'THESIS'],
    required: true,
    default: 'PROJECT_I'
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
  primarySupervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  primarySupervisorId: {
    type: String,
    required: true,
    trim: true
  },
  primarySupervisorName: {
    type: String,
    required: true,
    trim: true
  },
  coSupervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    default: null
  },
  coSupervisorId: {
    type: String,
    trim: true,
    default: ''
  },
  coSupervisorName: {
    type: String,
    trim: true,
    default: ''
  },
  students: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    rollNumber: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    }
  }],
  milestones: [milestoneSchema],
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'cancelled'],
    default: 'in_progress'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

projectSchema.index({ departmentCode: 1, activityType: 1, academicSession: 1 });
projectSchema.index({ primarySupervisor: 1, status: 1 });
projectSchema.index({ 'students.student': 1, activityType: 1 });
projectSchema.index({ 'students.rollNumber': 1 });

module.exports = mongoose.model('Project', projectSchema);
