const mongoose = require('mongoose');

const assessmentConfigSchema = new mongoose.Schema({
  performance: { type: Number, default: 5,  min: 0 },
  quiz:        { type: Number, default: 30, min: 0 },
  report:      { type: Number, default: 10, min: 0 },
  attendance:  { type: Number, default: 5,  min: 0 },
  test:        { type: Number, default: 20, min: 0 },
  others:      { type: Number, default: 5,  min: 0 },
}, { _id: false });

const courseSchema = new mongoose.Schema({
  courseCode: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true 
  }, // e.g. "ETE 3201"
  courseName: { 
    type: String, 
    required: true, 
    trim: true 
  }, // e.g. "Optical Fiber Communication Lab"
  credit: { 
    type: Number, 
    default: 1.5, 
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
  courseType: { 
    type: String, 
    enum: ['Lab', 'Theory', 'Project', 'Thesis'], 
    default: 'Lab' 
  },
  semesterLevel: { 
    type: String, 
    default: '' 
  }, // e.g. "3rd Year 2nd Term"
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

  // Legacy compatibility fields (for seamless transition of existing records)
  teacherId:  { type: String },
  series:     { type: String },
  assessmentConfig: { type: assessmentConfigSchema, default: () => ({}) }
}, { timestamps: true });

courseSchema.index({ courseCode: 1, departmentCode: 1 });

module.exports = mongoose.model('Course', courseSchema);
