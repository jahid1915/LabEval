const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teacherSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  teacherId: { type: String, required: true, unique: true, uppercase: true, trim: true },
  department:{ type: String, required: true },
  contactNo: { type: String, required: true },
  password:  { type: String, required: true },
  role:      { type: String, default: 'teacher' },
  // Courses are now managed via the Course collection, but kept here for quick lookup
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

module.exports = mongoose.model('Teacher', teacherSchema);
