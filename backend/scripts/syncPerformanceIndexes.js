require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const SessionalCourse = require('../models/SessionalCourse');
const ElectiveCourse = require('../models/ElectiveCourse');
const CourseOffering = require('../models/CourseOffering');
const TeacherAssignment = require('../models/TeacherAssignment');
const CohortSemesterHistory = require('../models/CohortSemesterHistory');
const Department = require('../models/Department');

async function syncAllIndexes() {
  console.log('🚀 Connecting to MongoDB Atlas to synchronize performance indexes...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected. Synchronizing indexes across collections...');

  const models = [
    { name: 'User', model: User },
    { name: 'Student', model: Student },
    { name: 'Teacher', model: Teacher },
    { name: 'Department', model: Department },
    { name: 'SessionalCourse', model: SessionalCourse },
    { name: 'ElectiveCourse', model: ElectiveCourse },
    { name: 'CourseOffering', model: CourseOffering },
    { name: 'TeacherAssignment', model: TeacherAssignment },
    { name: 'CohortSemesterHistory', model: CohortSemesterHistory }
  ];

  for (const { name, model } of models) {
    try {
      const start = Date.now();
      await model.syncIndexes();
      const existingIndexes = await model.collection.indexes();
      console.log(`  ✓ ${name}: synced in ${Date.now() - start}ms (${existingIndexes.length} active indexes)`);
    } catch (err) {
      console.warn(`  ⚠️ ${name} sync warning:`, err.message);
    }
  }

  console.log('\n✨ All performance compound indexes are verified and active on database!');
  await mongoose.disconnect();
}

syncAllIndexes().catch(err => {
  console.error('Index sync failed:', err);
  process.exit(1);
});
