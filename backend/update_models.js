const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'models');

// 1. Update Teacher.js
const teacherPath = path.join(modelsDir, 'Teacher.js');
let teacherContent = fs.readFileSync(teacherPath, 'utf8');
if (!teacherContent.includes('allocatedCourses')) {
  teacherContent = teacherContent.replace(
    /role: { type: String, default: 'teacher' }/g,
    `role: { type: String, default: 'teacher' },\n  allocatedCourses: [{ courseCode: String, series: String }]`
  );
  fs.writeFileSync(teacherPath, teacherContent);
  console.log('Updated Teacher.js');
}

// 2. Update lab models
const labModels = ['Attendance.js', 'Report.js', 'Performance.js', 'Quiz.js', 'Test.js', 'Others.js', 'Request.js', 'FinalResult.js'];
for (const file of labModels) {
  const filePath = path.join(modelsDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(
      /course: { type: mongoose\.Schema\.Types\.ObjectId, ref: 'Course', required: true }/g,
      `course: { type: String, required: true }`
    );
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
}

console.log('Model updates complete.');
