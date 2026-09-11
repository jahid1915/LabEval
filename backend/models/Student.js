const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  series: { 
    type: String, 
    required: true,
    trim: true 
  },
  seriesRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Series'
  },
  rollNumber: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  registrationNumber: {
    type: String,
    trim: true,
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
  academicSessionRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession'
  },
  contactNo: { 
    type: String, 
    required: true,
    trim: true 
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  avatarUrl: {
    type: String,
    default: ''
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    default: 'student' 
  },
  status: {
    type: String,
    enum: ['active', 'graduated', 'inactive', 'suspended'],
    default: 'active'
  },
  enrolledCourses: [{ 
    courseCode: String,
    courseOffering: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseOffering' }
  }]
}, { timestamps: true });

studentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

studentSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

studentSchema.index({ rollNumber: 1, department: 1, series: 1 });

module.exports = mongoose.model('Student', studentSchema);
