const mongoose = require('mongoose');
const othersSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: String, required: true },
  type: { type: String, enum: ['Presentation', 'Project', 'Assignment'], required: true },
  date: { type: Date, required: true },
  marks: { type: Number, min: 0, max: 10, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });
module.exports = mongoose.model('Others', othersSchema);