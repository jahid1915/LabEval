const mongoose = require('mongoose');

const finalResultSchema = new mongoose.Schema({
  student:          { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course:           { type: String, required: true },
  attendanceMarks:  { type: Number, default: 0 },   // configurable max
  reportMarks:      { type: Number, default: 0 },   // configurable max
  performanceMarks: { type: Number, default: 0 },   // configurable max
  quizMarks:        { type: Number, default: 0 },   // configurable max
  testMarks:        { type: Number, default: 0 },   // configurable max
  othersMarks:      { type: Number, default: 0 },   // configurable max
  totalMarks:       { type: Number, default: 0 },   // max 75
  teacher:          { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });

module.exports = mongoose.model('FinalResult', finalResultSchema);