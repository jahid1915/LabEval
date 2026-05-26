const mongoose = require('mongoose');
const performanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: String, required: true },
  date: { type: Date, required: true },
  dayName: { type: String, required: true },
  marks: { type: Number, min: 0, max: 5, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });
module.exports = mongoose.model('Performance', performanceSchema);