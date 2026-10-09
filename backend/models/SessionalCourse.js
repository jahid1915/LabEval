const mongoose = require('mongoose');
const { parseCourseCode } = require('../utils/courseCodeParser');

const assessmentConfigSchema = new mongoose.Schema({
  attendance:  { type: Number, default: 5,  min: 0, max: 5  },
  report:      { type: Number, default: 10, min: 0, max: 10 },
  performance: { type: Number, default: 5,  min: 0, max: 5  },
  quiz:        { type: Number, default: 30, min: 0, max: 30 },
  test:        { type: Number, default: 20, min: 0, max: 20 },
  others:      { type: Number, default: 5,  min: 0, max: 5  },
}, { _id: false });

const sessionalCourseSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: [true, 'Course code is required'],
    uppercase: true,
    trim: true
  }, // e.g. "ETE 3222", "CSE 2154"
  courseTitle: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department reference is required']
  },
  departmentCode: {
    type: String,
    required: [true, 'Department code is required'],
    uppercase: true,
    trim: true
  },
  credit: {
    type: Number,
    required: true,
    default: 1.5,
    min: 0
  },
  creditHours: {
    type: Number,
    default: 3.0,
    min: 0
  },
  courseType: {
    type: String,
    enum: ['Sessional', 'Lab'],
    default: 'Sessional'
  },
  semesterNumber: {
    type: Number,
    min: 1,
    max: 4
  },
  semesterTerm: {
    type: Number,
    min: 1,
    max: 2
  },
  semesterLevel: {
    type: String,
    trim: true // e.g. "3-2"
  },
  academicYear: {
    type: String,
    trim: true,
    default: ''
  },
  pairedTheoryCourseCode: {
    type: String,
    uppercase: true,
    trim: true,
    default: ''
  },
  defaultAssessmentConfig: {
    type: assessmentConfigSchema,
    default: () => ({})
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  syllabus: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  legacyCourseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  }
}, { timestamps: true });

// Pre-save validation & automated semester level parsing
sessionalCourseSchema.pre('save', function(next) {
  if (this.courseCode) {
    const parsed = parseCourseCode(this.courseCode);
    if (parsed.isValid) {
      if (!this.semesterNumber) this.semesterNumber = parsed.semesterNumber;
      if (!this.semesterTerm) this.semesterTerm = parsed.semesterTerm;
      if (!this.semesterLevel) this.semesterLevel = parsed.semesterLevel;
    }
  }
  next();
});

// Ensure a course code is unique per department
sessionalCourseSchema.index({ courseCode: 1, department: 1 }, { unique: true });
sessionalCourseSchema.index({ departmentCode: 1, semesterLevel: 1, isActive: 1 });
sessionalCourseSchema.index({ legacyCourseId: 1 });

module.exports = mongoose.model('SessionalCourse', sessionalCourseSchema);
