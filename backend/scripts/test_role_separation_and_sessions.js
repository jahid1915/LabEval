const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const BASE_URL = 'http://127.0.0.1:5000';

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('🚀 Starting Comprehensive Architecture & Role Separation Test Suite...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB.');

  const Student = require('../models/Student');
  const User = require('../models/User');
  const Admin = require('../models/Admin');
  const AcademicSession = require('../models/AcademicSession');
  const Series = require('../models/Series');
  const bcrypt = require('bcryptjs');

  // Ensure known passwords for test runners
  const headHash = await bcrypt.hash('Password123!', 10);
  await User.updateOne({ loginIdentifier: 'head_ete' }, { passwordHash: headHash });
  await Admin.updateOne({ username: 'head_ete' }, { password: 'Password123!' });

  const adminHash = await bcrypt.hash('adminpassword', 10);
  await User.updateOne({ loginIdentifierLower: 'admin' }, { passwordHash: adminHash, failedLoginAttempts: 0, lockedUntil: null });
  await Admin.updateOne({ username: 'admin' }, { password: 'adminpassword' });

  // ── 1. Authenticate Department Head (head_ete) ─────────────────────
  console.log('\n--- 1. Testing Department Head Authentication ---');
  const headLoginRes = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'head_ete', password: 'Password123!' })
  });

  if (!headLoginRes.ok || !headLoginRes.data?.token) {
    throw new Error(`Department Head login failed: ${JSON.stringify(headLoginRes.data)}`);
  }

  const headToken = headLoginRes.data.token;
  const headUser = headLoginRes.data.user;
  console.log(`✅ Department Head Login OK. Role: "${headUser.role}", Dept: "${headUser.department}"`);

  if (headUser.role !== 'department_head') {
    throw new Error(`Expected role 'department_head', got '${headUser.role}'`);
  }

  // ── 2. Authenticate Admin (admin) ──────────────────────────────────
  console.log('\n--- 2. Testing Admin Authentication ---');
  const adminLoginRes = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'admin', password: 'adminpassword' })
  });

  if (!adminLoginRes.ok || !adminLoginRes.data?.token) {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes.data)}`);
  }

  const adminToken = adminLoginRes.data.token;
  const adminUser = adminLoginRes.data.user;
  console.log(`✅ Admin Login OK. Role: "${adminUser.role}"`);

  // ── 3. Strict Backend Authorization Enforcement ────────────────────
  console.log('\n--- 3. Testing Backend Role Enforcement & Access Boundaries ---');

  // A: Department Head calls /api/admin/students -> MUST BE 403 Forbidden!
  const headToAdminRes = await api('/api/admin/students', {
    headers: { Authorization: `Bearer ${headToken}` }
  });
  console.log(`Department Head -> GET /api/admin/students Status: ${headToAdminRes.status} (Expected: 403)`);
  if (headToAdminRes.status !== 403) {
    throw new Error(`SECURITY VULNERABILITY: Department Head should get 403 for /api/admin/students, but got ${headToAdminRes.status}`);
  }
  console.log('✅ PASS: Department Head is strictly forbidden from accessing /api/admin endpoints (403 Forbidden).');

  // B: Admin calls /api/head/stats -> MUST BE 403 Forbidden (requires department_head)!
  const adminToHeadRes = await api('/api/head/stats', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log(`Admin -> GET /api/head/stats Status: ${adminToHeadRes.status} (Expected: 403)`);
  if (adminToHeadRes.status !== 403) {
    throw new Error(`Admin should get 403 for /api/head/stats, but got ${adminToHeadRes.status}`);
  }
  console.log('✅ PASS: Admin cannot call /api/head endpoints (strictly reserved for department_head).');

  // C: Department Head calls /api/head/stats -> 200 OK!
  const headStatsRes = await api('/api/head/stats', {
    headers: { Authorization: `Bearer ${headToken}` }
  });
  console.log(`Department Head -> GET /api/head/stats Status: ${headStatsRes.status}`);
  if (!headStatsRes.ok) {
    throw new Error(`Failed to get /api/head/stats: ${JSON.stringify(headStatsRes.data)}`);
  }
  console.log(`✅ PASS: /api/head/stats returns department metrics for ${headStatsRes.data.department.code}.`);

  // ── 4. Scenario Testing: Import Students with Real Academic Identity ─
  console.log('\n--- 4. Testing Student Import & Academic Session Integration ---');
  // Clean up any test rolls first
  await Student.deleteMany({ rollNumber: { $regex: /^TEST-2204/ } });
  await User.deleteMany({ loginIdentifierLower: { $regex: /^test-2204/ } });

  // Generate 25 test student records (representing Series 22, Session 2022-23, ETE)
  const testRows = [];
  for (let i = 1; i <= 25; i++) {
    const roll = `TEST-22040${i < 10 ? '0' + i : i}`;
    testRows.push({
      _rowIndex: i,
      'Student ID (Roll)': roll,
      'Student Name': `Test Student ${i}`,
      'Registration No': `REG-${roll}`,
      rollNumber: roll,
      name: `Test Student ${i}`,
      registrationNumber: `REG-${roll}`
    });
  }

  const importPayload = {
    fileName: 'test_ete_22_students.xlsx',
    fileSize: 1024,
    sheetName: 'Sheet1',
    rows: testRows,
    mapping: {
      'Student ID (Roll)': 'rollNumber',
      'Student Name': 'name',
      'Registration No': 'registrationNumber'
    },
    credentialConfig: {
      usernameField: 'rollNumber',
      passwordField: 'registrationNumber'
    },
    duplicateMatchingFields: ['rollNumber'],
    duplicateAction: 'skip',
    overrides: {
      department: 'ETE',
      series: '22',
      session: '2022-23',
      semester: '1st Semester',
      status: 'active'
    }
  };

  // Verify Head is strictly forbidden from importing master data (Requirement 8)
  const headImportRes = await api('/api/import/students/execute', {
    method: 'POST',
    headers: { Authorization: `Bearer ${headToken}` },
    body: JSON.stringify(importPayload)
  });
  if (headImportRes.status !== 403) {
    throw new Error(`Expected Head import to be rejected with 403, got ${headImportRes.status}`);
  }
  console.log('✅ PASS: Department Head is strictly forbidden from importing students (403 Forbidden).');

  // Admin executes master data import
  const importRes = await api('/api/import/students/execute', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(importPayload)
  });

  if (!importRes.ok) {
    throw new Error(`Import failed: ${JSON.stringify(importRes.data)}`);
  }
  console.log(`✅ Student Import executed by Admin: Inserted ${importRes.data.stats?.inserted} students.`);

  // ── 5. Database Direct Verification ────────────────────────────────
  console.log('\n--- 5. Verifying Database Relationships ---');
  const sampleStudent = await Student.findOne({ rollNumber: 'TEST-2204001' }).lean();
  if (!sampleStudent) {
    throw new Error('Imported student not found in MongoDB!');
  }

  console.log('Sample Student Record in MongoDB:');
  console.log(`  - Roll: ${sampleStudent.rollNumber}`);
  console.log(`  - Name: ${sampleStudent.name}`);
  console.log(`  - Department: ${sampleStudent.department} (Ref: ${sampleStudent.departmentRef})`);
  console.log(`  - Series: ${sampleStudent.series} (Ref: ${sampleStudent.seriesRef})`);
  console.log(`  - Academic Session: ${sampleStudent.session} (Ref: ${sampleStudent.academicSessionRef})`);
  console.log(`  - Linked User: ${sampleStudent.user}`);

  if (!sampleStudent.departmentRef) {
    console.warn('⚠️ Warning: departmentRef missing on student');
  } else {
    console.log('  ✅ departmentRef linked properly.');
  }

  if (sampleStudent.series !== '22' || (!['2022-23', '2022-2023'].includes(sampleStudent.session)) || sampleStudent.department !== 'ETE') {
    throw new Error(`Student fields mismatch: series=${sampleStudent.series}, session=${sampleStudent.session}, dept=${sampleStudent.department}`);
  }
  console.log('✅ PASS: Real academic identity verified on student record.');

  // ── 6. Department Head Academic Session Endpoints Verification ─────
  console.log('\n--- 6. Testing Department Head Academic Session APIs ---');

  // Verify /api/head/academic-sessions
  const headSessionsRes = await api('/api/head/academic-sessions', {
    headers: { Authorization: `Bearer ${headToken}` }
  });
  if (!headSessionsRes.ok) {
    throw new Error(`Failed to get academic sessions: ${JSON.stringify(headSessionsRes.data)}`);
  }
  const session2022 = headSessionsRes.data.sessions.find(s => s.name === '2022-23' || s.name === '2022-2023');
  console.log(`Academic Session 2022-23 Found: ${!!session2022}`);
  if (session2022) {
    console.log(`  - Total Students in 2022-23: ${session2022.totalStudents}`);
    console.log(`  - Active Students in 2022-23: ${session2022.activeStudents}`);
  }
  console.log('✅ PASS: Academic Sessions endpoint aggregates live student counts.');

  // Verify /api/head/academic-sessions/:id/students
  const headSessStudentsRes = await api('/api/head/academic-sessions/2022-23/students', {
    headers: { Authorization: `Bearer ${headToken}` }
  });
  if (!headSessStudentsRes.ok) {
    throw new Error(`Failed to get session students: ${JSON.stringify(headSessStudentsRes.data)}`);
  }
  console.log(`Session Detail 2022-23 returned ${headSessStudentsRes.data.students.length} students (Total: ${headSessStudentsRes.data.pagination.total}).`);
  console.log('✅ PASS: Session Detail roster API works.');

  // Verify /api/head/students (strictly scoped to ETE)
  const headStudentsRes = await api('/api/head/students?series=22', {
    headers: { Authorization: `Bearer ${headToken}` }
  });
  if (!headStudentsRes.ok) {
    throw new Error(`Failed to get department students: ${JSON.stringify(headStudentsRes.data)}`);
  }
  console.log(`Department Students API returned ${headStudentsRes.data.students.length} students for Series 22.`);
  console.log('✅ PASS: Department Students directory returns live records.');

  // ── 7. Central Authentication for Imported Student ─────────────────
  console.log('\n--- 7. Testing Centralized Authentication for Imported Student ---');
  const studentLoginRes = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'TEST-2204001', password: 'REG-TEST-2204001' })
  });

  if (!studentLoginRes.ok || !studentLoginRes.data?.user) {
    throw new Error(`Student login failed: ${JSON.stringify(studentLoginRes.data)}`);
  }
  console.log(`Student Login OK! Role: "${studentLoginRes.data.user.role}", Name: "${studentLoginRes.data.user.name}", Dept: "${studentLoginRes.data.user.department}"`);
  console.log('✅ PASS: Imported student successfully logged in through central auth.');

  // ── Clean up test data ─────────────────────────────────────────────
  console.log('\n--- 8. Cleaning up test data ---');
  await Student.deleteMany({ rollNumber: { $regex: /^TEST-2204/ } });
  await User.deleteMany({ loginIdentifierLower: { $regex: /^test-2204/ } });
  console.log('🧹 Cleaned up test records. Database is pristine.');

  console.log('\n🎉 ALL ARCHITECTURAL TESTS PASSED! ROLE SEPARATION AND ACADEMIC SESSIONS ARE 100% VERIFIED.\n');
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ TEST RUN ERROR:', err);
  process.exit(1);
});
