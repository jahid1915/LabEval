const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  targetAudience: {
    type: String,
    enum: ['ALL', 'FACULTY', 'DEPARTMENT', 'SERIES', 'COURSE', 'TEACHERS', 'STUDENTS'],
    default: 'ALL',
    required: true
  },
  targetFaculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty'
  },
  targetDepartment: {
    type: String, // e.g. "ETE", "CSE"
    uppercase: true,
    trim: true
  },
  targetSeries: {
    type: String, // e.g. "2023", "22"
    trim: true
  },
  targetCourse: {
    type: String, // e.g. "ETE 3201"
    trim: true
  },
  priority: {
    type: String,
    enum: ['normal', 'important', 'urgent'],
    default: 'normal'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  createdByName: {
    type: String,
    default: 'Administration'
  },
  expirationDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'draft'],
    default: 'active'
  }
}, { timestamps: true });

announcementSchema.index({ targetAudience: 1, targetDepartment: 1, targetSeries: 1, status: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
