const mongoose = require('mongoose');

const finalResultSchema = new mongoose.Schema({
  student:          { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  rollNumber:       { type: String, trim: true },
  studentName:      { type: String, trim: true },
  department:       { type: String, uppercase: true, trim: true },
  series:           { type: String, trim: true },
  semester:         { type: String, trim: true, default: '3-2' }, // e.g. "3-1", "3-2", "4-1", "4-2"
  academicSession:  { type: String, trim: true, default: '2024-2025' },
  course:           { type: String, required: true, uppercase: true, trim: true }, // e.g. "ETE 3221"
  courseName:       { type: String, trim: true },
  courseOffering:   { type: mongoose.Schema.Types.ObjectId, ref: 'CourseOffering' },
  teacher:          { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  teacherId:        { type: String, uppercase: true, trim: true },
  teacherName:      { type: String, trim: true },
  
  // Assessment components (RUET format: Quiz [20], Lab Report [15], Lab Viva [10], Lab Test [20], Open Ended [0], Atnd [10], Total [65/75])
  quizMarks:        { type: Number, default: 0, min: 0 },
  reportMarks:      { type: Number, default: 0, min: 0 },
  vivaMarks:        { type: Number, default: 0, min: 0 },
  testMarks:        { type: Number, default: 0, min: 0 },
  openEndedMarks:   { type: mongoose.Schema.Types.Mixed, default: 'A' },
  attendanceMarks:  { type: Number, default: 0, min: 0 },
  performanceMarks: { type: Number, default: 0, min: 0 },
  othersMarks:      { type: Number, default: 0, min: 0 },
  
  totalMarks:       { type: Number, default: 0, min: 0 },
  maxTotalMarks:    { type: Number, default: 65 }, // default 65 or 75
  grade:            { type: String, default: 'F', trim: true }, // A+, A, A-, B+, B, B-, C+, C, D, F
  gradePoint:       { type: Number, default: 0.00, min: 0, max: 4.00 },

  detailedMarks: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  },
  
  status:           { type: String, enum: ['draft', 'submitted', 'reviewed', 'published'], default: 'draft' },
  isPublished:      { type: Boolean, default: false },
  publishedAt:      { type: Date },
}, { timestamps: true });

finalResultSchema.index({ student: 1, course: 1, semester: 1 }, { unique: true });
finalResultSchema.index({ course: 1, semester: 1, isPublished: 1 });
finalResultSchema.index({ department: 1, series: 1, semester: 1 });

module.exports = mongoose.model('FinalResult', finalResultSchema);