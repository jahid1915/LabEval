const mongoose = require('mongoose');
const { parseCourseCode } = require('../utils/courseCodeParser');

const electiveCourseSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: [true, 'Course code is required'],
    uppercase: true,
    trim: true
  }, // e.g. "ETE 4241", "CSE 4261"
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
    default: 3.0,
    min: 0
  },
  creditHours: {
    type: Number,
    default: 3.0,
    min: 0
  },
  courseType: {
    type: String,
    enum: ['Theory', 'Sessional'],
    default: 'Theory'
  },
  electiveGroup: {
    type: String,
    required: [true, 'Elective group is required'],
    trim: true,
    default: 'Elective I' // e.g. "Elective I", "Elective II", "Elective III", "Group A"
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
    trim: true // e.g. "4-1", "4-2"
  },
  academicYear: {
    type: String,
    trim: true,
    default: ''
  },
  eligibilityRules: {
    eligibleSeries: [{
      type: String,
      trim: true
    }], // e.g. ["20", "21"]
    prerequisites: [{
      type: String,
      trim: true
    }],
    minCgpa: {
      type: Number,
      default: 0
    },
    maxEnrolledStudents: {
      type: Number,
      default: 60
    }
  },
  syllabus: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
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
electiveCourseSchema.pre('save', function(next) {
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
electiveCourseSchema.index({ courseCode: 1, department: 1 }, { unique: true });
electiveCourseSchema.index({ departmentCode: 1, electiveGroup: 1, semesterLevel: 1, isActive: 1 });
electiveCourseSchema.index({ legacyCourseId: 1 });

module.exports = mongoose.model('ElectiveCourse', electiveCourseSchema);
