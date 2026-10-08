const mongoose = require('mongoose');

const projectMessageSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  senderRole: {
    type: String,
    enum: ['student', 'teacher', 'department_head', 'admin'],
    default: 'student'
  },
  senderRoll: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

projectMessageSchema.index({ project: 1, createdAt: 1 });

module.exports = mongoose.model('ProjectMessage', projectMessageSchema);
