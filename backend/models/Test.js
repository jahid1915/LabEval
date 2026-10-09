const mongoose = require('mongoose');
// LabEval spec: Test max = 20
const testSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: String, required: true },
  date: { type: Date, required: true },
  // Schema-level max enforced on document.save(); bulkWrite paths validated in controller.
  marks: { type: Number, min: 0, max: 20, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });

// Optimizes queries filtered by student/course
testSchema.index({ student: 1, course: 1 });
testSchema.index({ course: 1 });

module.exports = mongoose.model('Test', testSchema);