const mongoose = require('mongoose');

const projectActivitySchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null
  },
  studentRoll: {
    type: String,
    default: ''
  },
  studentName: {
    type: String,
    required: true
  },
  activityType: {
    type: String,
    enum: [
      'PROPOSAL_SUBMITTED',
      'LITERATURE_REVIEW',
      'METHODOLOGY_UPDATE',
      'CODE_COMMIT',
      'DATASET_UPLOAD',
      'MILESTONE_COMPLETED',
      'REPORT_SUBMITTED',
      'FEEDBACK_GIVEN',
      'GENERAL_UPDATE'
    ],
    default: 'GENERAL_UPDATE'
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

projectActivitySchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model('ProjectActivity', projectActivitySchema);
