const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true // e.g. "Electronics & Telecommunication Engineering"
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    unique: true // e.g. "ETE", "CSE", "EEE"
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true
  },
  facultyCode: {
    type: String,
    uppercase: true,
    trim: true,
    default: ''
  },
  headName: {
    type: String,
    trim: true,
    default: ''
  },
  headId: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  headTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    default: null
  },
  headUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  contactEmail: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'inactive'],
    default: 'active'
  }
}, { timestamps: true });

departmentSchema.index({ code: 1, faculty: 1 });

module.exports = mongoose.model('Department', departmentSchema);
