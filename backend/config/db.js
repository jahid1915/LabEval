const mongoose = require('mongoose');

let memoryServer = null;

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;
  const fallbackUri = 'mongodb://127.0.0.1:27017/labeval';

  if (primaryUri) {
    try {
      const conn = await mongoose.connect(primaryUri, {
        serverSelectionTimeoutMS: 4000,
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.warn(`⚠️ Primary MongoDB Connection failed (${error.message}). Attempting fallback to local instance...`);
    }
  }

  try {
    const fallbackConn = await mongoose.connect(fallbackUri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`✅ Fallback Local MongoDB Connected: ${fallbackConn.connection.host}`);
    return fallbackConn;
  } catch (err) {
    console.warn(`⚠️ Local MongoDB is not running (${err.message}).`);
  }

  // Auto fallback to embedded In-Memory MongoDB Server for immediate testing & offline development
  try {
    console.log(`🚀 Launching Embedded In-Memory MongoDB Server...`);
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create({
      instance: { dbName: 'labeval' }
    });
    const memUri = memoryServer.getUri();
    const memConn = await mongoose.connect(memUri);
    console.log(`✅ Embedded In-Memory MongoDB Connected at: ${memUri}`);

    // Auto-seed default accounts if database is fresh
    try {
      const Admin = require('../models/Admin');
      const adminCount = await Admin.countDocuments();
      if (adminCount === 0) {
        console.log('🌱 Fresh database detected, auto-seeding demo credentials...');
        const Faculty = require('../models/Faculty');
        const Department = require('../models/Department');
        const Teacher = require('../models/Teacher');
        const Student = require('../models/Student');
        const Course = require('../models/Course');

        const faculty = await Faculty.create({
          name: 'Faculty of Electrical & Computer Engineering',
          code: 'ECE',
          deanName: 'Prof. Dean',
          status: 'active'
        });

        const department = await Department.create({
          name: 'Computer Science & Engineering',
          code: 'CSE',
          faculty: faculty._id
        });

        await Admin.create({
          name: 'System Administrator',
          username: 'admin',
          email: 'admin@ruet.ac.bd',
          contactNo: '01700000999',
          password: 'admin123',
          role: 'admin',
        });

        await Teacher.create({
          name: 'Dr. Test Teacher',
          teacherId: 'T-101',
          email: 'teacher@ruet.ac.bd',
          department: 'CSE',
          departmentRef: department._id,
          facultyRef: faculty._id,
          contactNo: '01700000000',
          password: 'password123',
          role: 'teacher',
          allocatedCourses: [
            { courseCode: 'CSE2200', courseName: 'Software Development Lab', series: '22' },
            { courseCode: 'CSE2202', courseName: 'Algorithm Lab', series: '22' }
          ]
        });

        await Student.create({
          name: 'Demo Student',
          series: '22',
          rollNumber: '2204001',
          department: 'CSE',
          departmentRef: department._id,
          facultyRef: faculty._id,
          contactNo: '01800000001',
          password: 'password123',
          role: 'student',
          enrolledCourses: [{ courseCode: 'CSE2200' }, { courseCode: 'CSE2202' }]
        });

        await Course.create([
          { 
            teacherId: 'T-101', 
            courseCode: 'CSE2200', 
            courseName: 'Software Development Lab', 
            series: '22', 
            department: department._id,
            departmentCode: 'CSE',
            faculty: faculty._id,
            credit: 1.5,
            courseType: 'Lab'
          },
          { 
            teacherId: 'T-101', 
            courseCode: 'CSE2202', 
            courseName: 'Algorithm Lab', 
            series: '22', 
            department: department._id,
            departmentCode: 'CSE',
            faculty: faculty._id,
            credit: 1.5,
            courseType: 'Lab'
          }
        ]);

        console.log('✅ Demo accounts seeded (Admin: admin/admin123, Teacher: T-101/password123, Student: 2204001/password123)');
      }
    } catch (seedErr) {
      console.warn('⚠️ Seeding warning:', seedErr.message);
    }

    return memConn;
  } catch (memErr) {
    console.error(`❌ In-Memory MongoDB could not be started: ${memErr.message}`);
    console.warn(`👉 To use real-time database operations, ensure MongoDB or Atlas cluster is reachable.`);
  }
};

module.exports = connectDB;

