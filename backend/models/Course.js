const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  teacherId:  { type: String, required: true },             // e.g. "AIS"
  courseCode: { type: String, required: true },             // e.g. "ETE2200"
  courseName: { type: String, required: true },             // e.g. "Antenna Design"
  series:     { type: String, required: true },             // e.g. "22"
  department: { type: String, required: true },             // e.g. "ETE"
}, { timestamps: true });

// A teacher cannot have the same courseCode+series combination twice
courseSchema.index({ teacherId: 1, courseCode: 1, series: 1 }, { unique: true });

module.exports = mongoose.model('Course', courseSchema);
