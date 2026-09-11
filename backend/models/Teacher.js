const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teacherSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  teacherId: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true 
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  department: { 
    type: String, 
    required: true,
    uppercase: true,
    trim: true 
  },
  departmentRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  facultyRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty'
  },
  designation: {
    type: String,
    default: 'Lecturer',
    trim: true
  },
  contactNo: { 
    type: String, 
    required: true,
    trim: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    default: 'teacher' 
  },
  dutyStatus: {
    type: String,
    enum: ['ON_DUTY', 'ON_LEAVE', 'UNAVAILABLE', 'INACTIVE'],
    default: 'ON_DUTY'
  },
  specialization: {
    type: String,
    default: ''
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  avatarUrl: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  // Legacy compatibility array
  allocatedCourses: [{
    courseCode: String,
    courseName: String,
    series:     String,
    _id:        false
  }]
}, { timestamps: true });

teacherSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

teacherSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

teacherSchema.index({ teacherId: 1, department: 1, dutyStatus: 1 });

module.exports = mongoose.model('Teacher', teacherSchema);
