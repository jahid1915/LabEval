require('dotenv').config();
const assert = require('node:assert');
const mongoose = require('mongoose');
const { parseCourseCode, normalizeSemesterLevel, isCourseCompatibleWithSemester } = require('../utils/courseCodeParser');
const SessionalCourse = require('../models/SessionalCourse');
const ElectiveCourse = require('../models/ElectiveCourse');
const CohortSemesterHistory = require('../models/CohortSemesterHistory');
const Series = require('../models/Series');
const Department = require('../models/Department');

let passedTests = 0;
let failedTests = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${testName}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

async function runAsyncTest(testName, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${testName}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

async function main() {
  console.log('====================================================');
  console.log('🧪 LabEval Academic Management Test Suite');
  console.log('====================================================\n');

  // ── GROUP 1: COURSE CODE PARSER & SEMESTER CLASSIFICATION ─────────────
  console.log('📌 Group 1: Course Code Parser Tests');

  runTest('Classify "2111" as Semester 2-1', () => {
    const res = parseCourseCode('2111');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.year, 2);
    assert.strictEqual(res.term, 1);
    assert.strictEqual(res.semesterLevel, '2-1');
  });

  runTest('Classify "3221" as Semester 3-2', () => {
    const res = parseCourseCode('3221');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.year, 3);
    assert.strictEqual(res.term, 2);
    assert.strictEqual(res.semesterLevel, '3-2');
  });

  runTest('Classify "1111" as Semester 1-1', () => {
    const res = parseCourseCode('1111');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.year, 1);
    assert.strictEqual(res.term, 1);
    assert.strictEqual(res.semesterLevel, '1-1');
  });

  runTest('Classify "4211" as Semester 4-2', () => {
    const res = parseCourseCode('4211');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.year, 4);
    assert.strictEqual(res.term, 2);
    assert.strictEqual(res.semesterLevel, '4-2');
  });

  runTest('Detect Sessional parity on "ETE 3222"', () => {
    const res = parseCourseCode('ETE 3222');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.prefix, 'ETE');
    assert.strictEqual(res.semesterLevel, '3-2');
    assert.strictEqual(res.isLikelySessional, true);
  });

  runTest('Reject malformed course code with out-of-bounds year (5111)', () => {
    const res = parseCourseCode('5111');
    assert.strictEqual(res.isValid, false);
    assert.match(res.error, /Invalid academic year/);
  });

  runTest('Reject malformed course code with out-of-bounds term (3311)', () => {
    const res = parseCourseCode('3311');
    assert.strictEqual(res.isValid, false);
    assert.match(res.error, /Invalid academic term/);
  });

  runTest('Normalize legacy semester representations', () => {
    assert.strictEqual(normalizeSemesterLevel('3rd Year 2nd Term'), '3-2');
    assert.strictEqual(normalizeSemesterLevel('1st Semester'), '1-1');
    assert.strictEqual(normalizeSemesterLevel('6th Semester'), '3-2');
    assert.strictEqual(normalizeSemesterLevel('4-1'), '4-1');
  });

  runTest('Validate semester compatibility correctly', () => {
    assert.strictEqual(isCourseCompatibleWithSemester('ETE 3221', '3-2'), true);
    assert.strictEqual(isCourseCompatibleWithSemester('ETE 3221', '2-2'), false);
    assert.strictEqual(isCourseCompatibleWithSemester('CSE 2112', '2-1'), true);
  });

  // ── GROUP 2: DATABASE SCHEMAS & DATA INTEGRITY ─────────────────────────
  console.log('\n📌 Group 2: Database Model Integrity Tests');

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/labeval';
  await mongoose.connect(mongoUri);

  await runAsyncTest('SessionalCourse collection exists and has migrated records', async () => {
    const count = await SessionalCourse.countDocuments();
    assert.ok(count > 0, `Expected sessional courses count > 0, got ${count}`);
  });

  await runAsyncTest('ElectiveCourse collection exists and has migrated records', async () => {
    const count = await ElectiveCourse.countDocuments();
    assert.ok(count > 0, `Expected elective courses count > 0, got ${count}`);
  });

  await runAsyncTest('CohortSemesterHistory model creates and indexes properly', async () => {
    const dept = await Department.findOne({ code: 'ETE' });
    const series = await Series.findOne({ departmentCode: 'ETE' });

    assert.ok(dept, 'Department ETE should exist');
    assert.ok(series, 'Series for ETE should exist');

    const testHistory = await CohortSemesterHistory.create({
      department: dept._id,
      departmentCode: 'ETE',
      series: series._id,
      seriesName: series.name,
      previousSemester: '2-2',
      newSemester: '3-1',
      changedBy: new mongoose.Types.ObjectId(),
      changedByName: 'Automated Test Runner',
      reason: 'Automated test progression verification',
      affectedStudentsCount: 57,
      availableOfferingsCount: 5
    });

    assert.ok(testHistory._id, 'History record should have an _id');
    assert.strictEqual(testHistory.previousSemester, '2-2');
    assert.strictEqual(testHistory.newSemester, '3-1');

    // Clean up test record
    await CohortSemesterHistory.deleteOne({ _id: testHistory._id });
  });

  // ── GROUP 3: ROLE PERMISSION BOUNDARIES (STATIC VERIFICATION) ─────────
  console.log('\n📌 Group 3: Role Permission Boundary Tests');

  runTest('Admin is denied assignment mutations via route guard', () => {
    const adminRoutesContent = require('fs').readFileSync(
      require('path').resolve(__dirname, '../routes/adminRoutes.js'),
      'utf8'
    );
    assert.ok(adminRoutesContent.includes("code: 'FORBIDDEN_ADMIN_ACADEMIC_OPERATION'"), 'Admin routes must reject /assign-course and /teaching-assignments with 403');
  });

  runTest('Department Head is denied student master mutations', () => {
    const headControllerContent = require('fs').readFileSync(
      require('path').resolve(__dirname, '../controllers/headController.js'),
      'utf8'
    );
    assert.ok(headControllerContent.includes("createHeadStudent = async (req, res) => {"), 'createHeadStudent handler exists');
    assert.ok(headControllerContent.includes("code: 'ROLE_RESTRICTION'"), 'Head cannot create/delete student master records');
  });

  await mongoose.disconnect();

  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test runner encountered an error:', err);
  process.exit(1);
});
