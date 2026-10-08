require('dotenv').config();
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
  console.log('🔒 Testing Strict Cross-Department Isolation...');
  await mongoose.connect(process.env.MONGO_URI);

  const Student = require('../models/Student');
  const User = require('../models/User');

  // Login as head_ete
  const headLoginRes = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'head_ete', password: 'Password123!' })
  });
  if (!headLoginRes.ok || !headLoginRes.data?.token) {
    throw new Error('head_ete login failed');
  }
  const eteToken = headLoginRes.data.token;

  // Insert 5 test students in CSE and 5 test students in ETE
  await Student.deleteMany({ rollNumber: { $regex: /^ISOLATION-/ } });
  await User.deleteMany({ loginIdentifierLower: { $regex: /^isolation-/ } });

  const cseStudents = [];
  const eteStudents = [];

  for (let i = 1; i <= 5; i++) {
    cseStudents.push({
      rollNumber: `ISOLATION-CSE-${i}`,
      name: `CSE Student ${i}`,
      department: 'CSE',
      series: '22',
      session: '2022-2023',
      password: 'TestPassword123!',
      status: 'active'
    });
    eteStudents.push({
      rollNumber: `ISOLATION-ETE-${i}`,
      name: `ETE Student ${i}`,
      department: 'ETE',
      series: '22',
      session: '2022-2023',
      password: 'TestPassword123!',
      status: 'active'
    });
  }

  await Student.insertMany([...cseStudents, ...eteStudents]);
  console.log('✅ Seeded 5 CSE students and 5 ETE students.');

  // Attempt 1: ETE Head calls /api/head/students (should ONLY see ETE students)
  const studentsRes = await api('/api/head/students?search=ISOLATION', {
    headers: { Authorization: `Bearer ${eteToken}` }
  });
  if (!studentsRes.ok) {
    throw new Error(`Failed to fetch students: ${JSON.stringify(studentsRes.data)}`);
  }
  const returnedStudents = studentsRes.data.students || [];
  console.log(`ETE Head query returned ${returnedStudents.length} isolation students.`);
  
  const hasCSE = returnedStudents.some(s => s.department === 'CSE' || s.rollNumber.includes('CSE'));
  if (hasCSE) {
    throw new Error('SECURITY VIOLATION: ETE Head received CSE students in results!');
  }
  console.log('✅ PASS: No CSE students leaked to ETE Head.');

  // Attempt 2: Malicious query injection - ETE Head sends department=CSE query parameter
  const spoofRes = await api('/api/head/students?department=CSE&search=ISOLATION', {
    headers: { Authorization: `Bearer ${eteToken}` }
  });
  const spoofedStudents = spoofRes.data.students || [];
  const spoofHasCSE = spoofedStudents.some(s => s.department === 'CSE' || s.rollNumber.includes('CSE'));
  if (spoofHasCSE) {
    throw new Error('SECURITY VIOLATION: department query parameter override allowed cross-department data access!');
  }
  console.log('✅ PASS: Backend ignores client department spoofing and enforces authenticated head profile.');

  // Attempt 3: Academic Session detail with search
  const sessionStudentsRes = await api('/api/head/academic-sessions/2022-2023/students?search=ISOLATION', {
    headers: { Authorization: `Bearer ${eteToken}` }
  });
  const sessionStudents = sessionStudentsRes.data.students || [];
  const sessionHasCSE = sessionStudents.some(s => s.department === 'CSE' || s.rollNumber.includes('CSE'));
  if (sessionHasCSE) {
    throw new Error('SECURITY VIOLATION: Academic session detail leaked CSE students!');
  }
  console.log(`✅ PASS: Academic session students endpoint strictly filtered to ETE (${sessionStudents.length} students returned).`);

  // Cleanup
  await Student.deleteMany({ rollNumber: { $regex: /^ISOLATION-/ } });
  console.log('🧹 Cleaned up isolation test records.');
  console.log('\n🛡️ CROSS-DEPARTMENT ISOLATION IS AIRTIGHT AND VERIFIED!\n');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ ISOLATION TEST FAILED:', err);
  process.exit(1);
});
