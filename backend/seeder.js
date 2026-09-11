const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const Course = require('./models/Course');
const Admin = require('./models/Admin');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const importData = async () => {
  try {
    await Student.deleteMany();
    await Teacher.deleteMany();
    await Course.deleteMany();
    await Admin.deleteMany();

    // Create Super Admin
    await Admin.create({
      name: 'System Administrator',
      username: 'admin',
      email: 'admin@ruet.ac.bd',
      contactNo: '01700000999',
      password: 'admin123',
      role: 'admin',
    });

    await Course.insertMany([
      { teacherId: 'T-101', courseCode: 'CSE2200', courseName: 'Software Development Lab', series: '22', department: 'CSE' },
      { teacherId: 'T-101', courseCode: 'CSE2202', courseName: 'Algorithm Lab', series: '22', department: 'CSE' },
      { teacherId: 'T-101', courseCode: 'ETE3111', courseName: 'Communication Theory Lab', series: '22', department: 'ETE' }
    ]);

    await Teacher.create({
      name: 'Dr. Test Teacher',
      teacherId: 'T-101',
      department: 'CSE',
      contactNo: '01700000000',
      password: 'password123',
      role: 'teacher',
      allocatedCourses: [
        { courseCode: 'CSE2200', courseName: 'Software Development Lab', series: '22' },
        { courseCode: 'CSE2202', courseName: 'Algorithm Lab', series: '22' },
        { courseCode: 'ETE3111', courseName: 'Communication Theory Lab', series: '22' }
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
        enrolledCourses: [{ courseCode: 'CSE2200' }, { courseCode: 'CSE2202' }]
      });
    }
    
    await Student.insertMany(students);

    console.log('Data Imported successfully into MongoDB (including Super Admin: admin / admin123)!');
    process.exit(0);
  } catch (error) {
    console.error('Error importing data: ' + error.message);
    process.exit(1);
  }
};

importData();
