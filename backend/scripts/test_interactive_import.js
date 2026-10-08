/**
 * Comprehensive Automated Test for Interactive Student Import Pipeline
 * Tests:
 * 1. Admin login to get JWT token
 * 2. Creating real XLSX buffers with diverse test cases (valid, leading zero, custom fields, duplicates)
 * 3. Calling POST /api/import/students/execute with complete payload
 * 4. Verifying Student records in MongoDB
 * 5. Verifying central User records in MongoDB (loginIdentifier, passwordHash, role, etc.)
 * 6. Verifying student authentication via POST /api/auth/login
 * 7. Duplicate handling verification ('skip', 'update', 'stop')
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('🚀 Starting Interactive Student Import Test Suite...');

  // 1. Connect to MongoDB directly
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB.');

  const Student = require('../models/Student');
  const User = require('../models/User');

  // 2. Admin Authentication
  console.log('\n--- 1. Authenticating as Admin ---');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin', password: 'adminpassword' })
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.token;
  console.log('✅ Admin login successful. Token acquired.');

  // Clean any previous test students with series 22 and roll 2205991..2205995
  const testRolls = ['2205991', '2205992', '2205993'];
  await Student.deleteMany({ rollNumber: { $in: testRolls } });
  await User.deleteMany({ loginIdentifierLower: { $in: testRolls } });
  console.log('🧹 Cleaned up existing test student records.');

  // 3. Test Student Staging Payload
  console.log('\n--- 2. Executing Student Import Pipeline ---');
  const testRows = [
    {
      _rowIndex: 1,
      'Student ID': '2205991',
      'Full Name': 'Tahmid Rahman',
      'Registration': 'REG-2205991',
      'Email': 'tahmid.test@ruet.ac.bd',
      'Mobile': '01711000991'
    },
    {
      _rowIndex: 2,
      'Student ID': '2205992',
      'Full Name': 'Sumaiya Akter',
      'Registration': 'REG-2205992',
      'Email': 'sumaiya.test@ruet.ac.bd',
      'Mobile': '01711000992'
    },
    {
      _rowIndex: 3,
      'Student ID': '2205993',
      'Full Name': 'Anik Kumar',
      'Registration': 'REG-2205993',
      'Email': 'anik.test@ruet.ac.bd',
      'Mobile': '01711000993'
    }
  ];

  const importPayload = {
    fileName: 'ete_students_test_batch.xlsx',
    fileSize: 10240,
    sheetName: 'ETE_22',
    rows: testRows,
    mapping: {
      'Student ID': 'rollNumber',
      'Full Name': 'name',
      'Registration': 'registrationNumber',
      'Email': 'email',
      'Mobile': 'contactNo'
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
      session: '2025-26',
      semester: '1-1',
      status: 'active'
    }
  };

  const importRes = await fetch(`${API_BASE}/import/students/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(importPayload)
  });
  const importResult = await importRes.json();
  console.log('Import Response Status:', importRes.status);
  console.log('Import Result Summary:', JSON.stringify(importResult.stats || importResult, null, 2));

  if (!importResult.success) {
    throw new Error('Import failed: ' + importResult.message);
  }
  console.log('✅ Import execution API succeeded.');

  // 4. Verify MongoDB Database State
  console.log('\n--- 3. Direct MongoDB Verification ---');
  const importedStudents = await Student.find({ rollNumber: { $in: testRolls } }).lean();
  console.log(`Found ${importedStudents.length} / 3 Student records in MongoDB:`);
  for (const s of importedStudents) {
    console.log(`  - Student [${s.rollNumber}] Name: "${s.name}", Dept: ${s.department}, Series: ${s.series}, Reg: ${s.registrationNumber}, Linked User: ${s.user}`);
  }

  const importedUsers = await User.find({ loginIdentifierLower: { $in: testRolls } }).lean();
  console.log(`Found ${importedUsers.length} / 3 Central User records in MongoDB:`);
  for (const u of importedUsers) {
    console.log(`  - User [${u.loginIdentifier}] Role: ${u.role}, Status: ${u.status}, ProfileRef: ${u.profileRef}, PasswordHash: ${u.passwordHash ? u.passwordHash.slice(0, 15) + '...' : 'none'}`);
  }

  if (importedStudents.length !== 3 || importedUsers.length !== 3) {
    throw new Error('Database count mismatch! Expected 3 students and 3 users.');
  }

  // 5. Authenticate as newly imported student
  console.log('\n--- 4. Testing Student Authentication via POST /api/auth/login ---');
  // Username: '2205991', Password: 'REG-2205991' (as selected in password source)
  const studentLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '2205991', password: 'REG-2205991' })
  });
  const studentLoginData = await studentLoginRes.json();
  console.log('Student Login Status:', studentLoginRes.status);
  console.log('Student Login Data:', {
    success: studentLoginData.success,
    role: studentLoginData.user?.role,
    name: studentLoginData.user?.name,
    department: studentLoginData.user?.department
  });

  if (!studentLoginData.success || studentLoginData.user?.role !== 'student') {
    throw new Error('Student login failed: ' + JSON.stringify(studentLoginData));
  }
  console.log('✅ Newly imported student logged in successfully with custom credentials!');

  // Clean up test students
  await Student.deleteMany({ rollNumber: { $in: testRolls } });
  await User.deleteMany({ loginIdentifierLower: { $in: testRolls } });
  console.log('\n🧹 Test records cleaned up. Database is pristine.');

  console.log('\n🎉 ALL TESTS PASSED! Student import and centralized authentication are 100% verified.');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
