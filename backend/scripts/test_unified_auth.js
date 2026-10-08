require('dotenv').config();
const mongoose = require('mongoose');

const BASE_URL = 'http://127.0.0.1:5000';

const summary = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: []
};

function recordTest(name, passed, details = '') {
  summary.total++;
  if (passed) {
    summary.passed++;
    console.log(`  ✅ [PASS] ${name}`);
  } else {
    summary.failed++;
    const errMsg = `❌ [FAIL] ${name} — ${details}`;
    summary.failures.push(errMsg);
    console.error(`  ${errMsg}`);
  }
}

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

async function runAuthTests() {
  console.log('===============================================================');
  console.log('🔐 LABEVAL UNIFIED AUTHENTICATION & ROLE AUTHORIZATION QA SUITE');
  console.log(`Target: ${BASE_URL}`);
  console.log('===============================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('📦 Connected to MongoDB for database state validation.\n');

  const User = require('../models/User');
  const Student = require('../models/Student');
  const Teacher = require('../models/Teacher');
  const Admin = require('../models/Admin');

  // Clean test records before start
  await User.deleteMany({
    loginIdentifierLower: { $in: ['2209901', '2209902', 't-test-001', 'head-test-001', 'lockout-test-001'] }
  });
  await Student.deleteMany({ rollNumber: { $in: ['2209901', '2209902'] } });
  await Teacher.deleteMany({ teacherId: 'T-TEST-001' });
  await Admin.deleteMany({ $or: [{ headId: 'HEAD-TEST-001' }, { username: 'head-test-001' }] });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. STUDENT REGISTRATION & DUPLICATE PREVENTION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('🔹 1. STUDENT REGISTRATION & VALIDATION');
  {
    // Valid Student Registration
    const regRes = await api('/api/auth/register/student', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Jahid Hasan QA',
        rollNumber: '2209901',
        session: '2025-26',
        series: '22',
        phone: '01711223344',
        email: 'jahid.qa@ruet.ac.bd',
        department: 'ETE',
        faculty: 'Faculty of Electrical & Computer Engineering',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
    });
    recordTest('Student Registration Success (201 Created)', regRes.status === 201 && !!regRes.data?.token);

    // Verify DB records
    const dbUser = await User.findOne({ loginIdentifierLower: '2209901' });
    const dbStudent = await Student.findOne({ rollNumber: '2209901' });
    recordTest('Student DB Records Created & Linked', !!dbUser && !!dbStudent && dbUser.role === 'student' && dbStudent.user?.equals(dbUser._id));

    // Duplicate Student ID Rejected (409 Conflict)
    const dupRes = await api('/api/auth/register/student', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Duplicate Student',
        rollNumber: '2209901',
        session: '2025-26',
        series: '22',
        phone: '01799999999',
        email: 'dup@ruet.ac.bd',
        department: 'ETE',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
    });
    recordTest('Duplicate Student ID Rejected (409 Conflict)', dupRes.status === 409 && dupRes.data?.code === 'DUPLICATE_STUDENT_ID');

    // Password Mismatch Validation
    const misRes = await api('/api/auth/register/student', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Mismatch Student',
        rollNumber: '2209902',
        session: '2025-26',
        series: '22',
        department: 'ETE',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!'
      })
    });
    recordTest('Student Password Mismatch Rejected (400 Bad Request)', misRes.status === 400 && misRes.data?.code === 'PASSWORD_MISMATCH');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. TEACHER REGISTRATION & DUPLICATE PREVENTION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔹 2. TEACHER REGISTRATION & VALIDATION');
  {
    // Valid Teacher Registration
    const tReg = await api('/api/auth/register/teacher', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Dr. QA Teacher',
        teacherId: 'T-TEST-001',
        phone: '01722334455',
        email: 'teacher.qa@ruet.ac.bd',
        department: 'ETE',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
    });
    recordTest('Teacher Registration Success (201 Created)', tReg.status === 201 && !!tReg.data?.token);

    // Verify DB
    const dbUser = await User.findOne({ loginIdentifierLower: 't-test-001' });
    const dbTeacher = await Teacher.findOne({ teacherId: 'T-TEST-001' });
    recordTest('Teacher DB Records Created & Linked', !!dbUser && !!dbTeacher && dbUser.role === 'teacher');

    // Duplicate Teacher ID Rejected (409 Conflict)
    const dupT = await api('/api/auth/register/teacher', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Duplicate Teacher',
        teacherId: 'T-TEST-001',
        department: 'ETE',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
    });
    recordTest('Duplicate Teacher ID Rejected (409 Conflict)', dupT.status === 409 && dupT.data?.code === 'DUPLICATE_TEACHER_ID');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. DEPARTMENT HEAD REGISTRATION & DUPLICATE PREVENTION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔹 3. DEPARTMENT HEAD REGISTRATION & VALIDATION');
  {
    // Valid Department Head Registration
    const hReg = await api('/api/auth/register/head', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Dr. QA Head ETE',
        headId: 'HEAD-TEST-001',
        phone: '01733445566',
        email: 'head.qa@ruet.ac.bd',
        department: 'ETE',
        departmentCode: 'ETE',
        faculty: 'Faculty of Electrical & Computer Engineering',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
    });
    recordTest('Department Head Registration Success (201 Created)', hReg.status === 201 && !!hReg.data?.token);

    // Verify DB
    const dbUser = await User.findOne({ loginIdentifierLower: 'head-test-001' });
    const dbAdmin = await Admin.findOne({ headId: 'HEAD-TEST-001' });
    recordTest('Department Head DB Records Created & Linked', !!dbUser && !!dbAdmin && dbUser.role === 'department_head');

    // Duplicate Head ID Rejected (409 Conflict)
    const dupH = await api('/api/auth/register/head', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Duplicate Head',
        headId: 'HEAD-TEST-001',
        department: 'ETE',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
    });
    recordTest('Duplicate Head ID Rejected (409 Conflict)', dupH.status === 409 && dupH.data?.code === 'DUPLICATE_HEAD_ID');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. ADMIN PUBLIC SIGNUP PROHIBITED
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔹 4. ADMIN PUBLIC SIGNUP PROHIBITION');
  {
    const admSignup1 = await api('/api/auth/register/admin', {
      method: 'POST',
      body: JSON.stringify({ username: 'hacker_admin', password: 'password123' })
    });
    recordTest('/api/auth/register/admin Prohibited (403 Forbidden)', admSignup1.status === 403);

    const admSignup2 = await api('/api/auth/admin-register', {
      method: 'POST',
      body: JSON.stringify({ username: 'hacker_admin', password: 'password123' })
    });
    recordTest('/api/auth/admin-register Prohibited (403 Forbidden)', admSignup2.status === 403);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. UNIFIED LOGIN FOR ALL 4 ROLES
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔹 5. UNIFIED LOGIN ENDPOINT (POST /api/auth/login)');
  let studentToken = '';
  let teacherToken = '';
  let headToken = '';
  let adminToken = '';

  {
    // 5.1 Student Login using Roll Number
    const sLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: '2209901', password: 'Password123!' })
    });
    recordTest('Student Unified Login by Student ID', sLogin.status === 200 && sLogin.data?.user?.role === 'student');
    studentToken = sLogin.data?.token || '';

    // 5.2 Teacher Login using Teacher ID
    const tLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'T-TEST-001', password: 'Password123!' })
    });
    recordTest('Teacher Unified Login by Teacher ID', tLogin.status === 200 && tLogin.data?.user?.role === 'teacher');
    teacherToken = tLogin.data?.token || '';

    // 5.3 Department Head Login using Head ID
    const hLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'HEAD-TEST-001', password: 'Password123!' })
    });
    recordTest('Department Head Unified Login by Head ID', hLogin.status === 200 && hLogin.data?.user?.role === 'department_head');
    headToken = hLogin.data?.token || '';

    // 5.4 Admin Login using ADMIN
    const aLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'ADMIN', password: 'admin123' })
    });
    recordTest('Admin Unified Login by ADMIN', aLogin.status === 200 && (aLogin.data?.user?.role === 'admin' || aLogin.data?.user?.role === 'super_admin'));
    adminToken = aLogin.data?.token || '';

    // 5.5 Admin Case-Insensitive Login (admin)
    const aLoginLower = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'admin', password: 'admin123' })
    });
    recordTest('Admin Case-Insensitive Login', aLoginLower.status === 200);

    // 5.6 Wrong Password Rejection
    const badLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: '2209901', password: 'WrongPassword!' })
    });
    recordTest('Incorrect Password Rejected (401 Unauthorized)', badLogin.status === 401);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. FAILED LOGIN COUNTER & ACCOUNT LOCKOUT
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔹 6. FAILED LOGIN COUNTER & ACCOUNT LOCKOUT');
  {
    // Create dedicated account for lockout testing
    const pwHash = await User.hashPassword('Password123!');
    const lockUser = await User.create({
      loginIdentifier: 'LOCKOUT-TEST-001',
      loginIdentifierLower: 'lockout-test-001',
      passwordHash: pwHash,
      role: 'student',
      status: 'ACTIVE',
      name: 'Lockout Test Student'
    });

    let lockoutTriggered = false;
    for (let i = 1; i <= 6; i++) {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: 'LOCKOUT-TEST-001', password: 'WrongPassword!' })
      });
      if (res.status === 423) {
        lockoutTriggered = true;
        break;
      }
    }
    recordTest('Temporary Lockout After 5 Failed Attempts (423 Locked)', lockoutTriggered);
    await User.deleteOne({ _id: lockUser._id });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 7. ACCOUNT STATUS ENFORCEMENT (ACTIVE, INACTIVE, SUSPENDED)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔹 7. ACCOUNT STATUS ENFORCEMENT');
  {
    const userToStatus = await User.findOne({ loginIdentifierLower: '2209901' });

    // 7.1 Test INACTIVE
    userToStatus.status = 'INACTIVE';
    await userToStatus.save();
    const inactRes = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: '2209901', password: 'Password123!' })
    });
    recordTest('INACTIVE Account Login Blocked (403 Forbidden)', inactRes.status === 403);

    // 7.2 Test SUSPENDED
    userToStatus.status = 'SUSPENDED';
    await userToStatus.save();
    const suspRes = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: '2209901', password: 'Password123!' })
    });
    recordTest('SUSPENDED Account Login Blocked (403 Forbidden)', suspRes.status === 403);

    // 7.3 Restore to ACTIVE
    userToStatus.status = 'ACTIVE';
    await userToStatus.save();
    const actRes = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: '2209901', password: 'Password123!' })
    });
    recordTest('ACTIVE Account Login Allowed (200 OK)', actRes.status === 200);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 8. PROFILE INSPECTION (/api/auth/me) & PASSWORD CHANGE
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔹 8. CURRENT USER & PASSWORD CHANGE');
  {
    // GET /api/auth/me
    const meRes = await api('/api/auth/me', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    recordTest('GET /api/auth/me Returns Safe Profile', meRes.status === 200 && !meRes.data?.user?.passwordHash && meRes.data?.user?.identifier === '2209901');

    // Change Password
    const pwChangeRes = await api('/api/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        currentPassword: 'Password123!',
        newPassword: 'NewPassword999!',
        confirmNewPassword: 'NewPassword999!'
      })
    });
    recordTest('Password Change Success (200 OK)', pwChangeRes.status === 200);

    // Verify Old Password Rejected
    const oldLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: '2209901', password: 'Password123!' })
    });
    recordTest('Old Password Invalidated (401 Unauthorized)', oldLogin.status === 401);

    // Verify New Password Accepted
    const newLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: '2209901', password: 'NewPassword999!' })
    });
    recordTest('New Password Validated for Login (200 OK)', newLogin.status === 200);
    studentToken = newLogin.data?.token || '';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 9. ROLE & DEPARTMENT ISOLATION (STRICT RBAC)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔹 9. STRICT ROLE & DEPARTMENT ISOLATION');
  {
    // 9.1 Student Accessing Admin API Blocked
    const sToAdmin = await api('/api/admin/stats', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    recordTest('Student Blocked from Admin Endpoints (403 Forbidden)', sToAdmin.status === 403);

    // 9.2 Teacher Accessing Admin API Blocked
    const tToAdmin = await api('/api/admin/stats', {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    recordTest('Teacher Blocked from Admin Endpoints (403 Forbidden)', tToAdmin.status === 403);

    // 9.3 Student Accessing Teacher API Blocked
    const sToTeacher = await api('/api/teacher/courses', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    recordTest('Student Blocked from Teacher Endpoints (403 Forbidden)', sToTeacher.status === 403);

    // 9.4 Department Head Isolation: ETE Head accessing CSE department data rejected
    const hCrossDept = await api('/api/admin/students?department=CSE', {
      headers: { Authorization: `Bearer ${headToken}` }
    });
    recordTest('Department Head Blocked from Other Departments (403 Department Isolation Violation)', hCrossDept.status === 403);

    // 9.5 Department Head Accessing Own Department Allowed
    const hOwnDept = await api('/api/admin/students?department=ETE', {
      headers: { Authorization: `Bearer ${headToken}` }
    });
    recordTest('Department Head Access to Own Department Allowed (200 OK)', hOwnDept.status === 200);

    // 9.6 Global Admin Accessing All Departments Allowed
    const admCrossDept = await api('/api/admin/students?department=CSE', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('Global Admin Can Access All Departments (200 OK)', admCrossDept.status === 200);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 10. CLEANUP TEST DATA
  // ──────────────────────────────────────────────────────────────────────────
  await User.deleteMany({
    loginIdentifierLower: { $in: ['2209901', '2209902', 't-test-001', 'head-test-001'] }
  });
  await Student.deleteMany({ rollNumber: { $in: ['2209901', '2209902'] } });
  await Teacher.deleteMany({ teacherId: 'T-TEST-001' });
  await Admin.deleteMany({ $or: [{ headId: 'HEAD-TEST-001' }, { username: 'head-test-001' }] });

  await mongoose.disconnect();

  console.log('\n===============================================================');
  console.log(`📊 TEST SUMMARY: Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
  if (summary.failed === 0) {
    console.log('🎉 ALL UNIFIED AUTHENTICATION & AUTHORIZATION TESTS PASSED PERFECTLY!');
  } else {
    console.log('⚠️ FAILURES DETECTED:');
    summary.failures.forEach(f => console.log('  ' + f));
  }
  console.log('===============================================================\n');

  process.exit(summary.failed === 0 ? 0 : 1);
}

runAuthTests().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
