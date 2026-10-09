require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const Course = require('./models/Course');
const Department = require('./models/Department');
const Faculty = require('./models/Faculty');

async function importElectiveCourses() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is missing from .env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // 1. Locate ETE department and ECE faculty
    const faculty = await Faculty.findOne({ code: 'ECE' });
    if (!faculty) {
      console.error('Faculty ECE not found! Please ensure faculties are initialized.');
      process.exit(1);
    }

    const eteDept = await Department.findOne({ code: 'ETE' });
    if (!eteDept) {
      console.error('Department ETE not found! Please ensure departments are initialized.');
      process.exit(1);
    }

    // 2. Read courses.json
    const coursesPath = path.join(__dirname, 'data', 'courses.json');
    const rawData = fs.readFileSync(coursesPath, 'utf8');
    const allCourses = JSON.parse(rawData);

    // 3. Filter ONLY elective courses
    const electiveCourses = allCourses.filter(c => c.isElective === true);
    console.log(`Found ${electiveCourses.length} elective courses out of ${allCourses.length} total entries.`);

    const { getDefaultConfig } = require('./config/assessmentConfig');

    // 4. Upsert all elective courses safely
    let insertedCount = 0;
    const bySemester = {};

    for (const c of electiveCourses) {
      const courseCode = c.courseCode.trim().toUpperCase();
      const isSessional = !!c.isSessional;
      const courseType = isSessional ? 'Sessional' : 'Theory';

      const doc = {
        courseCode,
        courseName: c.title.trim(),
        credit: parseFloat(c.credits) || 3.0,
        creditHours: parseFloat(c.creditHours) || 3.0,
        department: eteDept._id,
        departmentCode: 'ETE',
        faculty: faculty._id,
        facultyCode: 'ECE',
        courseType,
        isElective: true,
        isSessional,
        pairedCourseCode: c.pairedCourseCode ? c.pairedCourseCode.trim().toUpperCase() : null,
        semesterLevel: c.semester ? c.semester.trim() : '3-2',
        syllabus: c.syllabus || '',
        description: `${c.title} (${courseType} Elective Course)`,
        defaultAssessmentConfig: getDefaultConfig(),
        status: 'active'
      };

      await Course.findOneAndUpdate({ courseCode }, doc, { upsert: true, returnDocument: 'after' });
      insertedCount++;
      bySemester[doc.semesterLevel] = (bySemester[doc.semesterLevel] || 0) + 1;
    }

    console.log(`\n🎉 Successfully upserted ${insertedCount} ELECTIVE courses into RUET database!`);
    console.log('Elective courses by semester:', bySemester);

    process.exit(0);
  } catch (err) {
    console.error('Import error:', err);
    process.exit(1);
  }
}

importElectiveCourses();
