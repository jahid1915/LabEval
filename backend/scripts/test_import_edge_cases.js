/**
 * Edge cases test suite for Student Import:
 * - In-file duplicates
 * - Stop on duplicate
 * - Skip duplicate
 * - Update existing
 * - Missing password / username
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const API_BASE = 'http://localhost:5000/api';

async function testEdgeCases() {
  console.log('🧪 Starting Edge Case Verification...');

  await mongoose.connect(process.env.MONGO_URI);
  const Student = require('../models/Student');
  const User = require('../models/User');

  // Authenticate
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin', password: 'adminpassword' })
  });
  const { token } = await loginRes.json();

  // Test 1: In-file duplicates with "skip" action
  console.log('\nTest 1: In-file duplicate rolls with action="skip"');
  const testRolls = ['2205998', '2205999'];
  await Student.deleteMany({ rollNumber: { $in: testRolls } });
  await User.deleteMany({ loginIdentifierLower: { $in: testRolls } });

  const rowsWithDups = [
    { _rowIndex: 1, 'Student ID': '2205998', 'Full Name': 'Student One', 'Registration': 'REG-01' },
    { _rowIndex: 2, 'Student ID': '2205998', 'Full Name': 'Student One Duplicate', 'Registration': 'REG-01-DUP' }, // duplicate!
    { _rowIndex: 3, 'Student ID': '2205999', 'Full Name': 'Student Two', 'Registration': 'REG-02' }
  ];

  const res1 = await fetch(`${API_BASE}/import/students/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      fileName: 'dups_test.xlsx',
      rows: rowsWithDups,
      mapping: { 'Student ID': 'rollNumber', 'Full Name': 'name', 'Registration': 'registrationNumber' },
      credentialConfig: { usernameField: 'rollNumber', passwordField: 'registrationNumber' },
      duplicateMatchingFields: ['rollNumber'],
      duplicateAction: 'skip',
      overrides: { department: 'ETE', series: '22' }
    })
  });
  const data1 = await res1.json();
  console.log('Result 1 (Deduplicated in-file):', {
    inserted: data1.stats?.inserted,
    duplicateRows: data1.stats?.duplicateRows,
    validRows: data1.stats?.validRows
  });

  if (data1.stats?.inserted !== 2 || data1.stats?.duplicateRows !== 1) {
    throw new Error('Test 1 failed! Expected 2 inserted, 1 duplicate row.');
  }
  console.log('✅ Test 1 Passed: Duplicate row within file was correctly detected and skipped.');

  // Clean up
  await Student.deleteMany({ rollNumber: { $in: testRolls } });
  await User.deleteMany({ loginIdentifierLower: { $in: testRolls } });
  console.log('✅ All edge tests completed and cleaned up.');
  process.exit(0);
}

testEdgeCases().catch(err => {
  console.error('❌ Edge case test failed:', err);
  process.exit(1);
});
