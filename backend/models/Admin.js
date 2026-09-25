const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  contactNo: {
    type: String,
    default: '',
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['super_admin', 'department_head', 'admin'],
    default: 'department_head',
  },
  designation: {
    type: String,
    default: 'Head of the Department',
    trim: true,
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
  },
  facultyCode: {
    type: String,
    uppercase: true,
    trim: true,
  },
  facultyName: {
    type: String,
    trim: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  departmentCode: {
    type: String,
    uppercase: true,
    trim: true,
  },
  departmentName: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  }
}, { timestamps: true });

adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next ? next() : undefined;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

adminSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

adminSchema.index({ username: 1, departmentCode: 1 });

module.exports = mongoose.model('Admin', adminSchema);
