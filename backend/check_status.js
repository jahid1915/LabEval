require('dotenv').config();
const mongoose = require('mongoose');

async function checkStatus() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    const Faculty = require('./models/Faculty');
    const Department = require('./models/Department');
    const Course = require('./models/Course');
    const Teacher = require('./models/Teacher');
    const Student = require('./models/Student');
    const Admin = require('./models/Admin');
    const CourseOffering = require('./models/CourseOffering');
    const TeacherAssignment = require('./models/TeacherAssignment');
    const Semester = require('./models/Semester');
    const AcademicSession = require('./models/AcademicSession');
    const Series = require('./models/Series');

    const counts = {
      faculties: await Faculty.countDocuments(),
      departments: await Department.countDocuments(),
      courses: await Course.countDocuments(),
      teachers: await Teacher.countDocuments(),
      students: await Student.countDocuments(),
      admins: await Admin.countDocuments(),
      courseOfferings: await CourseOffering.countDocuments(),
      teacherAssignments: await TeacherAssignment.countDocuments(),
      semesters: await Semester.countDocuments(),
      academicSessions: await AcademicSession.countDocuments(),
      series: await Series.countDocuments(),
    };

    console.log('Current Database Counts:', JSON.stringify(counts, null, 2));

    const depts = await Department.find({}).select('name code faculty').lean();
    console.log('Departments:', JSON.stringify(depts, null, 2));

    const admins = await Admin.find({}).lean();
    console.log('Admins:', JSON.stringify(admins, null, 2));

    const sampleCourses = await Course.find({}).limit(5).lean();
    console.log('Sample Courses:', JSON.stringify(sampleCourses, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkStatus();
