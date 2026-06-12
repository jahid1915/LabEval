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
  teacherId:  { type: String, required: true },             // e.g. "AIS"
  courseCode: { type: String, required: true },             // e.g. "ETE2200"
  courseName: { type: String, required: true },             // e.g. "Antenna Design"
  series:     { type: String, required: true },             // e.g. "22"
  department: { type: String, required: true },             // e.g. "ETE"
  assessmentConfig: { type: assessmentConfigSchema, default: () => ({}) },
}, { timestamps: true });

// A teacher cannot have the same courseCode+series combination twice
courseSchema.index({ teacherId: 1, courseCode: 1, series: 1 }, { unique: true });

module.exports = mongoose.model('Course', courseSchema);
