const mongoose = require('mongoose');
const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: String, required: true },
  date: { type: Date, required: true },
  dayName: { type: String, required: true },
  status: { type: String, enum: ['Present', 'Absent'], required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });

// Optimizes queries filtered by student/course/dayName
attendanceSchema.index({ student: 1, course: 1, dayName: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);