const mongoose = require('mongoose');

const importJobSchema = new mongoose.Schema({
  // Import metadata
  jobId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  fileName: {
    type: String,
    required: true,
    trim: true
  },
  fileSize: {
    type: Number,
    default: 0
  },
  // Admin who ran the import
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  adminName: {
    type: String,
    default: 'System'
  },
  department: {
    type: String,
    default: ''
  },
  // Import configuration
  importMode: {
    type: String,
    enum: ['add_new', 'update_existing', 'upsert', 'dry_run'],
    default: 'upsert'
  },
  columnMapping: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Job status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  // Summary statistics
  stats: {
    totalRows: { type: Number, default: 0 },
    validRows: { type: Number, default: 0 },
    invalidRows: { type: Number, default: 0 },
    duplicateRows: { type: Number, default: 0 },
    existingStudents: { type: Number, default: 0 },
    newStudents: { type: Number, default: 0 },
    inserted: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }
  },
  // Row-level error details (limited to avoid huge docs)
  rowErrors: [{
    row: { type: Number },
    field: { type: String },
    value: { type: String },
    message: { type: String },
    _id: false
  }],
  // Timestamps
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  errorMessage: {
    type: String,
    default: ''
  }
}, { timestamps: true });

importJobSchema.index({ adminId: 1, createdAt: -1 });
importJobSchema.index({ department: 1, createdAt: -1 });
importJobSchema.index({ status: 1 });

module.exports = mongoose.model('ImportJob', importJobSchema);
