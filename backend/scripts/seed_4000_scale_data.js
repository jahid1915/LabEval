require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Department = require('../models/Department');
const Faculty = require('../models/Faculty');
const Course = require('../models/Course');
const CourseOffering = require('../models/CourseOffering');
const TeacherAssignment = require('../models/TeacherAssignment');
const FinalResult = require('../models/FinalResult');

async function seed4000Data() {
  console.log('🚀 Connecting to MongoDB for 4000+ Scale Dataset Verification & Seeding...');
  await connectDB();

  const studentCount = await Student.countDocuments();
  console.log(`📊 Current student count: ${studentCount}`);

  const targetCount = 4200;
  if (studentCount >= targetCount) {
    console.log(`✅ Database already contains ${studentCount} students (>= ${targetCount}). Ready for high-concurrency benchmarks.`);
    process.exit(0);
  }

  const needed = targetCount - studentCount;
  console.log(`⚡ Seeding ${needed} realistic student records with linked User accounts across faculties and departments...`);

  const departments = ['ETE', 'CSE', 'EEE', 'ME', 'CIVIL', 'ECE'];
  const seriesList = ['20', '21', '22', '23'];
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Student@123', salt);

  const BATCH_SIZE = 500;
  let created = 0;

  for (let batch = 0; batch < Math.ceil(needed / BATCH_SIZE); batch++) {
    const currentBatchSize = Math.min(BATCH_SIZE, needed - created);
    const studentOps = [];
    const userOps = [];

    for (let i = 0; i < currentBatchSize; i++) {
      const idx = created + i + 1;
      const dept = departments[idx % departments.length];
      const series = seriesList[idx % seriesList.length];
      const rollNumber = `${series}${String(idx).padStart(5, '0')}`;
      const stuId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      studentOps.push({
        updateOne: {
          filter: { rollNumber },
          update: {
            $set: {
              _id: stuId,
              user: userId,
              name: `RUET Student ${rollNumber}`,
              rollNumber,
              series,
              department: dept,
              session: `20${series}-20${Number(series) + 1}`,
              semester: '3-2',
              contactNo: `01710${String(idx).padStart(6, '0').slice(-6)}`,
              email: `student.${rollNumber.toLowerCase()}@ruet.ac.bd`,
              status: 'active',
              updatedAt: new Date()
            },
            $setOnInsert: { createdAt: new Date() }
          },
          upsert: true
        }
      });

      userOps.push({
        updateOne: {
          filter: { loginIdentifierLower: rollNumber.toLowerCase() },
          update: {
            $set: {
              _id: userId,
              loginIdentifier: rollNumber,
              loginIdentifierLower: rollNumber.toLowerCase(),
              passwordHash,
              role: 'student',
              status: 'ACTIVE',
              name: `RUET Student ${rollNumber}`,
              email: `student.${rollNumber.toLowerCase()}@ruet.ac.bd`,
              phone: `01710${String(idx).padStart(6, '0').slice(-6)}`,
              department: dept,
              profileRef: stuId,
              profileModel: 'Student',
              updatedAt: new Date()
            },
            $setOnInsert: { createdAt: new Date() }
          },
          upsert: true
        }
      });
    }

    await Promise.all([
      Student.bulkWrite(studentOps, { ordered: false }),
      User.bulkWrite(userOps, { ordered: false })
    ]);

    created += currentBatchSize;
    console.log(`  ✓ Seeded batch: ${created}/${needed} students created`);
  }

  const finalCount = await Student.countDocuments();
  console.log(`🎉 4000+ Scale Data Seeding Complete! Total Students: ${finalCount}`);
  process.exit(0);
}

seed4000Data().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
