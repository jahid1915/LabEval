const mongoose = require('mongoose');

const assessmentConfigSchema = new mongoose.Schema({
  performance: { type: Number, default: 5,  min: 0 },
  quiz:        { type: Number, default: 30, min: 0 },
  report:      { type: Number, default: 10, min: 0 },
  attendance:  { type: Number, default: 5,  min: 0 },
  test:        { type: Number, default: 20, min: 0 },
  others:      { type: Number, default: 5,  min: 0 },
}, { _id: false });

const courseOfferingSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  courseCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  courseName: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  departmentCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  series: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Series'
  },
  seriesName: {
    type: String,
    required: true,
    trim: true // e.g. "2023" or "22"
  },
  academicSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession'
  },
  sessionName: {
    type: String,
    default: '2025-2026'
  },
  semester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Semester'
  },
  semesterName: {
    type: String,
    default: '1st Semester'
  },
  assessmentConfig: {
    type: assessmentConfigSchema,
    default: () => ({})
  },
  isMarksPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  }
}, { timestamps: true });

courseOfferingSchema.index({ courseCode: 1, seriesName: 1, sessionName: 1, semesterName: 1 }, { unique: true });
courseOfferingSchema.index({ departmentCode: 1, seriesName: 1 });

module.exports = mongoose.model('CourseOffering', courseOfferingSchema);
