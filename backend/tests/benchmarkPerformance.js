require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const SessionalCourse = require('../models/SessionalCourse');
const ElectiveCourse = require('../models/ElectiveCourse');
const CourseOffering = require('../models/CourseOffering');
const TeacherAssignment = require('../models/TeacherAssignment');
const Department = require('../models/Department');

function calculatePercentiles(durations) {
  if (durations.length === 0) return { p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 };
  const sorted = [...durations].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const avg = Number((sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(2));
  return {
    p50: Number(p50.toFixed(2)),
    p95: Number(p95.toFixed(2)),
    p99: Number(p99.toFixed(2)),
    avg,
    min: Number(sorted[0].toFixed(2)),
    max: Number(sorted[sorted.length - 1].toFixed(2))
  };
}

async function measureTask(name, fn, iterations = 20) {
  const times = [];
  // Warmup run
  try { await fn(); } catch (e) { /* ignore warmup error */ }

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    await fn();
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    times.push(durationMs);
  }
  const stats = calculatePercentiles(times);
  return { name, iterations, ...stats };
}

async function runBenchmark() {
  console.log('====================================================');
  console.log('⚡ LabEval Full-Stack Performance Benchmark Suite');
  console.log('====================================================');

  const connStart = Date.now();
  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 20,
    minPoolSize: 5
  });
  const connTime = Date.now() - connStart;
  console.log(`✅ Connected to DB in ${connTime}ms\n`);

  const results = [];

  // 1. Ping DB
  results.push(await measureTask('1. DB Ping / Connection Health', async () => {
    await mongoose.connection.db.admin().ping();
  }, 10));

  // 2. User Indexed Lookup by Identifier
  results.push(await measureTask('2. Indexed User Lookup (loginIdentifierLower)', async () => {
    await User.findOne({ loginIdentifierLower: 'admin' }).select('-passwordHash').lean();
  }, 20));

  // 3. Bcrypt Password Compare (Cost Factor 10)
  const testHash = await bcrypt.hash('admin123', 10);
  results.push(await measureTask('3. Bcrypt Password Verification (Security work factor)', async () => {
    await bcrypt.compare('admin123', testHash);
  }, 10));

  // 4. JWT Sign and Verification
  const payload = { userId: new mongoose.Types.ObjectId(), role: 'admin', departmentCode: 'ETE' };
  let token = '';
  results.push(await measureTask('4. JWT Token Generation & Verification', async () => {
    token = jwt.sign(payload, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });
    jwt.verify(token, process.env.JWT_SECRET || 'test_secret');
  }, 50));

  // 5. Sessional Course Catalog Query (lean)
  results.push(await measureTask('5. Sessional Course Catalog Query (lean)', async () => {
    await SessionalCourse.find({ departmentCode: 'ETE' }).select('courseCode courseTitle credit semesterLevel').lean();
  }, 20));

  // 6. Elective Course Catalog Query (lean)
  results.push(await measureTask('6. Elective Course Catalog Query (lean)', async () => {
    await ElectiveCourse.find({ departmentCode: 'ETE' }).select('courseCode courseTitle credit electiveGroup').lean();
  }, 20));

  // 7. Student Search / Filtering by Department and Series
  results.push(await measureTask('7. Student Search by Dept & Series (with lean & select)', async () => {
    await Student.find({ department: 'ETE', series: '22' }).select('name rollNumber series department status').limit(50).lean();
  }, 20));

  // 8. Teacher Assignments Query
  results.push(await measureTask('8. Teacher Assignments Query (populated)', async () => {
    await TeacherAssignment.find({ departmentCode: 'ETE', status: 'active' })
      .populate('teacher', 'name teacherId designation')
      .populate('courseOffering', 'courseCode courseName')
      .lean();
  }, 20));

  // 9. Department Metadata / Resolution
  results.push(await measureTask('9. Department Resolution Query', async () => {
    await Department.findOne({ code: 'ETE' }).lean();
  }, 20));

  // 10. Single Document Write vs BulkWrite comparison
  const sampleRoll = '9999999';
  results.push(await measureTask('10. Atomic Single Record Update ($set)', async () => {
    await Student.updateOne(
      { rollNumber: '2204028' },
      { $set: { updatedAt: new Date() } }
    );
  }, 10));

  // 11. BulkWrite Benchmark (100 operations in single network round-trip)
  results.push(await measureTask('11. BulkWrite Batching (50 updates in 1 round-trip)', async () => {
    const ops = [];
    for (let i = 0; i < 50; i++) {
      ops.push({
        updateOne: {
          filter: { rollNumber: '2204028' },
          update: { $set: { updatedAt: new Date() } }
        }
      });
    }
    await Student.bulkWrite(ops, { ordered: false });
  }, 5));

  console.log('\n📊 BENCHMARK RESULTS (Time in ms):');
  console.log('-------------------------------------------------------------------------------------------------');
  console.log(
    'Operation'.padEnd(50) +
    'p50 (ms)'.padStart(10) +
    'p95 (ms)'.padStart(10) +
    'p99 (ms)'.padStart(10) +
    'Avg (ms)'.padStart(10)
  );
  console.log('-------------------------------------------------------------------------------------------------');
  for (const r of results) {
    console.log(
      r.name.padEnd(50) +
      r.p50.toString().padStart(10) +
      r.p95.toString().padStart(10) +
      r.p99.toString().padStart(10) +
      r.avg.toString().padStart(10)
    );
  }
  console.log('-------------------------------------------------------------------------------------------------\n');

  await mongoose.disconnect();
}

runBenchmark().catch(err => {
  console.error('Benchmark Error:', err);
  process.exit(1);
});
