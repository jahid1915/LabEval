const mongoose = require('mongoose');

const assessmentConfigSchema = new mongoose.Schema({
  quiz:        { type: Number, default: 20, min: 0 },
  labReport:   { type: Number, default: 15, min: 0 },
  labViva:     { type: Number, default: 10, min: 0 },
  labTest:     { type: Number, default: 20, min: 0 },
  openEnded:   { type: Number, default: 0,  min: 0 },
  attendance:  { type: Number, default: 10, min: 0 },
  others:      { type: Number, default: 0,  min: 0 },
  // Legacy fields
  performance: { type: Number, default: 5,  min: 0 },
  report:      { type: Number, default: 10, min: 0 },
  test:        { type: Number, default: 20, min: 0 },
}, { _id: false });

const courseSchema = new mongoose.Schema({
  courseCode: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true 
  }, // e.g. "ETE 3221"
  courseName: { 
    type: String, 
    required: true, 
    trim: true 
  }, // e.g. "Microwave Devices"
  credit: { 
    type: Number, 
    default: 3.0, 
    min: 0 
  },
  creditHours: {
    type: Number,
    default: 3.0,
    min: 0
  },
  department: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department' 
  },
  departmentCode: { 
    type: String, 
    uppercase: true, 
    trim: true 
  }, // e.g. "ETE"
  faculty: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Faculty' 
  },
  facultyCode: {
    type: String,
    uppercase: true,
    trim: true
  },
  courseType: { 
    type: String, 
    enum: ['Theory', 'Sessional', 'Lab', 'Project', 'Thesis'], 
    default: 'Theory' 
  },
  isElective: {
    type: Boolean,
    default: true
  },
  isSessional: {
    type: Boolean,
    default: false
  },
  pairedCourseCode: {
    type: String,
    default: null,
    trim: true
  },
  semesterLevel: { 
    type: String, 
    default: '3-2' 
  }, // e.g. "3-2", "4-1", "4-2"
  syllabus: { 
    type: String, 
    default: '' 
  },
  description: { 
    type: String, 
    default: '' 
  },
  defaultAssessmentConfig: { 
    type: assessmentConfigSchema, 
    default: () => ({}) 
  },
  status: { 
    type: String, 
    enum: ['active', 'archived', 'inactive'], 
    default: 'active' 
  },

  // Legacy compatibility fields
  teacherId:  { type: String },
  series:     { type: String },
  assessmentConfig: { type: assessmentConfigSchema, default: () => ({}) }
}, { timestamps: true });

courseSchema.index({ courseCode: 1, departmentCode: 1 });
courseSchema.index({ isElective: 1, departmentCode: 1, semesterLevel: 1 });

module.exports = mongoose.model('Course', courseSchema);
