const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    unique: true // e.g. "ECE", "ME", "CE"
  },
  deanName: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'inactive'],
    default: 'active'
  }
}, { timestamps: true });

module.exports = mongoose.model('Faculty', facultySchema);
