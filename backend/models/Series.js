const mongoose = require('mongoose');

const seriesSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true // e.g. "2020", "2021", "2022", "2023", "2024", "2025" or "20", "21", "22", "23"
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  departmentCode: {
    type: String,
    uppercase: true,
    trim: true // e.g. "ETE"
  },
  academicSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession'
  },
  currentSemester: {
    type: String,
    default: '1st Semester'
  },
  totalStudents: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'graduated', 'archived'],
    default: 'active'
  }
}, { timestamps: true });

seriesSchema.index({ name: 1, department: 1 }, { unique: true });

module.exports = mongoose.model('Series', seriesSchema);
