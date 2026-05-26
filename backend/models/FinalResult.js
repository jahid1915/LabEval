const mongoose = require('mongoose');

const finalResultSchema = new mongoose.Schema({
  student:          { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course:           { type: String, required: true },
  attendanceMarks:  { type: Number, default: 0 },   // max 10
  reportMarks:      { type: Number, default: 0 },   // max 10
  performanceMarks: { type: Number, default: 0 },   // max 5
  quizMarks:        { type: Number, default: 0 },   // max 20
  testMarks:        { type: Number, default: 0 },   // max 20
  othersMarks:      { type: Number, default: 0 },   // max 10
  totalMarks:       { type: Number, default: 0 },   // max 75
  grade:            { type: String },
  teacher:          { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });

module.exports = mongoose.model('FinalResult', finalResultSchema);