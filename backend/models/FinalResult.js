const mongoose = require('mongoose');

const finalResultSchema = new mongoose.Schema({
  student:          { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course:           { type: String, required: true }, // e.g. "ETE 3201" or "ETE2200"
  courseOffering:   { type: mongoose.Schema.Types.ObjectId, ref: 'CourseOffering' },
  attendanceMarks:  { type: Number, default: 0, min: 0 },
  reportMarks:      { type: Number, default: 0, min: 0 },
  performanceMarks: { type: Number, default: 0, min: 0 },
  quizMarks:        { type: Number, default: 0, min: 0 },
  testMarks:        { type: Number, default: 0, min: 0 },
  othersMarks:      { type: Number, default: 0, min: 0 },
  totalMarks:       { type: Number, default: 0, min: 0 }, // max 75
  status:           { type: String, enum: ['draft', 'submitted', 'reviewed', 'published'], default: 'draft' },
  isPublished:      { type: Boolean, default: false },
  publishedAt:      { type: Date },
  teacher:          { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });

finalResultSchema.index({ student: 1, course: 1 }, { unique: true });
finalResultSchema.index({ course: 1, isPublished: 1 });

module.exports = mongoose.model('FinalResult', finalResultSchema);