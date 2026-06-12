const mongoose = require('mongoose');
const performanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: String, required: true },
  date: { type: Date, required: true },
  dayName: { type: String, required: true },
  marks: { type: Number, min: 0, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });

// Optimizes queries filtered by student/course/dayName
performanceSchema.index({ student: 1, course: 1, dayName: 1 });

module.exports = mongoose.model('Performance', performanceSchema);