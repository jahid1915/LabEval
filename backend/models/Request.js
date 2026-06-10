const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course:  { type: String, required: true },          // courseCode e.g. "ETE2200"
  status:  { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
  teacher: { type: String, required: true }            // teacherId e.g. "AIS"
}, { timestamps: true });

// A student can only have one request per course
requestSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Request', requestSchema);