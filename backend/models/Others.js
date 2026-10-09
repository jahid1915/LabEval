const mongoose = require('mongoose');
// LabEval spec: Others max = 5
const othersSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: String, required: true },
  type: { type: String, enum: ['Presentation', 'Project', 'Assignment'], required: true },
  date: { type: Date, required: true },
  // Schema-level max enforced on document.save(); bulkWrite paths validated in controller.
  marks: { type: Number, min: 0, max: 5, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });

// Optimizes queries filtered by student/course/type
othersSchema.index({ student: 1, course: 1, type: 1 });
othersSchema.index({ course: 1 });

module.exports = mongoose.model('Others', othersSchema);