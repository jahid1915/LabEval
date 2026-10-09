require('dotenv').config();
const connectDB = require('../config/db');

async function audit() {
  await connectDB();
  const mongoose = require('mongoose');
  const Teacher = require('../models/Teacher');
  const User = require('../models/User');
  const Student = require('../models/Student');
  const Department = require('../models/Department');

  // Let's inspect all collections in MongoDB to see if there is another teacher collection or data!
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('--- ALL COLLECTIONS IN DB ---');
  for (const c of collections) {
    const count = await mongoose.connection.db.collection(c.name).countDocuments();
    console.log(`${c.name}: ${count}`);
  }

  const teacherCount = await Teacher.countDocuments({});
  const teacherUserCount = await User.countDocuments({ role: 'teacher' });
  const studentCount = await Student.countDocuments({});
  const studentUserCount = await User.countDocuments({ role: 'student' });
  const deptCount = await Department.countDocuments({});

  console.log('\n--- MODEL COUNTS ---');
  console.log('Teacher collection count:', teacherCount);
  console.log('User (role=teacher) count:', teacherUserCount);
  console.log('Student collection count:', studentCount);
  console.log('User (role=student) count:', studentUserCount);
  console.log('Department collection count:', deptCount);

  // Aggregation of teachers by department
  const teachersByDept = await Teacher.aggregate([
    { $group: { _id: '$department', count: { $sum: 1 } } }
  ]);
  console.log('Teachers by department field:', teachersByDept);

  // Check if department is an ObjectId or code or string
  const sample = await Teacher.find({}).limit(10).lean();
  console.log('Sample teachers:', sample.map(t => ({
    id: t._id,
    name: t.name,
    teacherId: t.teacherId,
    dept: t.department,
    deptRef: t.departmentRef,
    status: t.status
  })));

  process.exit(0);
}
audit().catch(e => { console.error(e); process.exit(1); });
