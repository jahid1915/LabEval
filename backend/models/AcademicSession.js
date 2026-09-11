const mongoose = require('mongoose');

const academicSessionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true // e.g. "2025-2026", "2026"
  },
  year: {
    type: Number,
    required: true
  },
  isCurrent: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'upcoming'],
    default: 'active'
  }
}, { timestamps: true });

module.exports = mongoose.model('AcademicSession', academicSessionSchema);
