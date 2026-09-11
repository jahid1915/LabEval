const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  userRole: {
    type: String,
    enum: ['admin', 'teacher', 'student', 'system'],
    default: 'admin'
  },
  userName: {
    type: String,
    default: 'System'
  },
  action: {
    type: String,
    required: true,
    trim: true // e.g. "CREATE_OFFERING", "ASSIGN_TEACHER", "UPDATE_MARKS", "APPROVE_LEAVE", "PUBLISH_MARKS"
  },
  entity: {
    type: String,
    required: true,
    trim: true // e.g. "CourseOffering", "TeacherAssignment", "LeaveRequest", "FinalResult", "Teacher"
  },
  entityId: {
    type: String,
    default: ''
  },
  details: {
    type: String,
    default: ''
  },
  oldValues: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newValues: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  }
}, { timestamps: true });

auditLogSchema.index({ entity: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
