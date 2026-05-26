const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const Course = require('./models/Course');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const importData = async () => {
  try {
    await Student.deleteMany();
    await Teacher.deleteMany();
    await Course.deleteMany();

    await Course.insertMany([
      { courseId: 'CSE-2200', courseName: 'Software Development Lab', department: 'CSE' },
      { courseId: 'CSE-2202', courseName: 'Algorithm Lab', department: 'CSE' },
      { courseId: 'ETE-3111', courseName: 'Communication Theory Lab', department: 'ETE' }
    ]);

    await Teacher.create({
      name: 'Dr. Test Teacher',
      teacherId: 'T-101',
      department: 'CSE',
      contactNo: '01700000000',
      password: 'password123',
      role: 'teacher',
      allocatedCourses: [
        { courseCode: 'CSE-2200', series: '22' },
        { courseCode: 'CSE-2202', series: '22' },
        { courseCode: 'ETE-3111', series: '22' }
      ]
    });

    const students = [];
    for (let i = 1; i <= 60; i++) {
      students.push({
        name: 'Student ' + i,
        series: '22',
        rollNumber: '2204' + i.toString().padStart(3, '0'),
        department: 'CSE',
        contactNo: '01800000' + i.toString().padStart(3, '0'),
        password: 'password123',
        role: 'student',
        enrolledCourses: [{ courseCode: 'CSE-2200' }, { courseCode: 'CSE-2202' }]
      });
    }
    
    await Student.insertMany(students);

    console.log('Data Imported successfully into MongoDB!');
    process.exit(0);
  } catch (error) {
    console.error('Error importing data: ' + error.message);
    process.exit(1);
  }
};

importData();
