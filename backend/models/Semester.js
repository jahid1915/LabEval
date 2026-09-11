const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true // e.g. "1st Semester", "2nd Semester", "Summer Term"
  },
  code: {
    type: String,
    required: true,
    trim: true // e.g. "1-1", "1-2", "2-1", "3-2", "4-1"
  },
  academicSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession',
    required: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  isCurrent: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'upcoming', 'archived'],
    default: 'active'
  }
}, { timestamps: true });

semesterSchema.index({ academicSession: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Semester', semesterSchema);
