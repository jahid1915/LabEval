import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Teacher from '../models/Teacher.js';
import Student from '../models/Student.js';
import Department from '../models/Department.js';
import User from '../models/User.js';

async function verify() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.\n');

  console.log('--- 1. TEACHER RECORD AUDIT ---');
  const totalTeachers = await Teacher.countDocuments();
  console.log(`Total Teachers in DB: ${totalTeachers} (Target: > 450)`);
  if (totalTeachers < 450) {
    throw new Error(`Expected > 450 teachers, found ${totalTeachers}`);
  }

  const deptCounts = await Teacher.aggregate([
    { $group: { _id: '$department', count: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } },
    { $sort: { count: -1 } }
  ]);
  console.log('Department breakdown (Top 5):', deptCounts.slice(0, 5));
  console.log(`Total departments represented in teachers: ${deptCounts.length}`);

  console.log('\n--- 2. STUDENT RECORD AUDIT ---');
  const totalStudents = await Student.countDocuments();
  console.log(`Total Students in DB: ${totalStudents}`);

  const studentCohortCounts = await Student.aggregate([
    { $group: { _id: { department: '$department', series: '$series', semester: '$semester' }, count: { $sum: 1 } } }
  ]);
  console.log('Student Cohort breakdown:', studentCohortCounts);

  console.log('\n--- 3. PAGINATION & ACCESS VERIFICATION ---');
  // Verify that page 1 (50) and page 2 (50) yield distinct non-overlapping teachers
  const page1 = await Teacher.find().sort({ teacherId: 1 }).skip(0).limit(50).select('teacherId name').lean();
  const page2 = await Teacher.find().sort({ teacherId: 1 }).skip(50).limit(50).select('teacherId name').lean();
  
  const page1Ids = new Set(page1.map(t => t.teacherId));
  const overlap = page2.filter(t => page1Ids.has(t.teacherId));
  console.log(`Page 1 count: ${page1.length}, Page 2 count: ${page2.length}`);
  console.log(`Pagination overlap: ${overlap.length} (Expected: 0)`);
  if (overlap.length > 0) {
    throw new Error('Pagination overlap detected!');
  }

  // Verify all 461 teachers can be retrieved via limit ceiling
  const allTeachers = await Teacher.find().limit(500).select('teacherId').lean();
  console.log(`Retrieved with high limit (500): ${allTeachers.length} of ${totalTeachers}`);
  if (allTeachers.length !== totalTeachers) {
    throw new Error(`Limit ceiling still blocking records: got ${allTeachers.length}, expected ${totalTeachers}`);
  }

  console.log('\n✅ ALL VERIFICATION CHECKS PASSED.');
  await mongoose.disconnect();
  process.exit(0);
}

verify().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
