const fs = require('fs');

const models = {
  'Attendance.js': `const mongoose = require('mongoose');
const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  date: { type: Date, required: true },
  dayName: { type: String, required: true },
  status: { type: String, enum: ['Present', 'Absent'], required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });
module.exports = mongoose.model('Attendance', attendanceSchema);`,

  'Report.js': `const mongoose = require('mongoose');
const reportSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  date: { type: Date, required: true },
  dayName: { type: String, required: true },
  status: { type: String, enum: ['Submitted', 'Not Submitted'], required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });
module.exports = mongoose.model('Report', reportSchema);`,

  'Performance.js': `const mongoose = require('mongoose');
const performanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  date: { type: Date, required: true },
  dayName: { type: String, required: true },
  marks: { type: Number, min: 0, max: 5, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });
module.exports = mongoose.model('Performance', performanceSchema);`,

  'Viva.js': `const mongoose = require('mongoose');
const vivaSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  date: { type: Date, required: true },
  marks: { type: Number, min: 13, max: 25, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });
module.exports = mongoose.model('Viva', vivaSchema);`,

  'Quiz.js': `const mongoose = require('mongoose');
const quizSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  date: { type: Date, required: true },
  marks: { type: Number, min: 0, max: 20, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });
module.exports = mongoose.model('Quiz', quizSchema);`,

  'Test.js': `const mongoose = require('mongoose');
const testSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  date: { type: Date, required: true },
  marks: { type: Number, min: 0, max: 20, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });
module.exports = mongoose.model('Test', testSchema);`,

  'Others.js': `const mongoose = require('mongoose');
const othersSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  type: { type: String, enum: ['Presentation', 'Project', 'Assignment'], required: true },
  date: { type: Date, required: true },
  marks: { type: Number, min: 0, max: 10, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });
module.exports = mongoose.model('Others', othersSchema);`,

  'Request.js': `const mongoose = require('mongoose');
const requestSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Request', requestSchema);`,

  'FinalResult.js': `const mongoose = require('mongoose');
const finalResultSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  attendanceMarks: { type: Number, default: 0 },
  reportMarks: { type: Number, default: 0 },
  performanceMarks: { type: Number, default: 0 },
  vivaMarks: { type: Number, default: 0 },
  quizMarks: { type: Number, default: 0 },
  testMarks: { type: Number, default: 0 },
  othersMarks: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  grade: { type: String },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });
module.exports = mongoose.model('FinalResult', finalResultSchema);`
};

for (const [filename, content] of Object.entries(models)) {
  fs.writeFileSync('./models/' + filename, content);
}
console.log('Models generated successfully!');
