const mongoose = require('mongoose');
const vivaSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: String, required: true },
  date: { type: Date, required: true },
  marks: { type: Number, min: 13, max: 25, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });
module.exports = mongoose.model('Viva', vivaSchema);