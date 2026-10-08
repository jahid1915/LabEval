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
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
    trim: true,
    default: ''
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
  regularStatus: {
    type: String,
    enum: ['Regular', 'Irregular'],
    default: 'Regular'
  },
  gender: {
    type: String,
    trim: true,
    default: ''
  },
  bloodGroup: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  section: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  session: {
    type: String,
    trim: true,
    default: ''  // e.g. "2022-23" — derived from series
  },
  batch: {
    type: String,
    trim: true,
    default: ''
  },
  semester: {
    type: String,
    trim: true,
    default: ''
  },
  customFields: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  enrolledCourses: [{ 
    courseCode: String,
    courseOffering: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseOffering' }
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Synchronize alias virtuals for seamless API compatibility
studentSchema.virtual('studentName')
  .get(function() { return this.name; })
  .set(function(v) { this.name = v; });

studentSchema.virtual('studentEmail')
  .get(function() { return this.email; })
  .set(function(v) { this.email = v; });

studentSchema.virtual('phone')
  .get(function() { return this.contactNo; })
  .set(function(v) { this.contactNo = v; });

studentSchema.virtual('registrationNo')
  .get(function() { return this.registrationNumber; })
  .set(function(v) { this.registrationNumber = v; });

studentSchema.virtual('currentSemester')
  .get(function() { return this.semester; })
  .set(function(v) { this.semester = v; });

studentSchema.virtual('academicSession')
  .get(function() { return this.session; })
  .set(function(v) { this.session = v; });

studentSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

studentSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Compound index for most common query patterns
studentSchema.index({ rollNumber: 1, department: 1, series: 1 });
// Individual indexes for filtering/searching
studentSchema.index({ department: 1 });
studentSchema.index({ series: 1 });
studentSchema.index({ session: 1 });
studentSchema.index({ semester: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ regularStatus: 1 });
studentSchema.index({ registrationNumber: 1 });
studentSchema.index({ email: 1 });
studentSchema.index({ section: 1 });
// Text-search friendly indexes
studentSchema.index({ name: 'text', rollNumber: 'text', registrationNumber: 'text', email: 'text' });

module.exports = mongoose.model('Student', studentSchema);
