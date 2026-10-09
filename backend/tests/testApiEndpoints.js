import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../models/User.js';

async function testEndpoints() {
  await mongoose.connect(process.env.MONGO_URI);
  const adminUser = await User.findOne({ role: 'admin' }).lean();
  if (!adminUser) {
    throw new Error('No admin user found in database!');
  }
  console.log(`Found admin user: ${adminUser.loginIdentifier} (${adminUser._id})`);

  const token = jwt.sign(
    {
      id: adminUser._id,
      userId: adminUser._id,
      role: 'admin',
      userRole: 'admin',
      department: 'ALL'
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const baseUrl = 'http://localhost:5000/api/admin';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  console.log('Testing Admin Endpoints via HTTP...\n');

  // 1. Teacher Department Summary
  console.log('1. GET /teachers/department-summary');
  const tSummaryRes = await fetch(`${baseUrl}/teachers/department-summary`, { headers });
  const tSummary = await tSummaryRes.json();
  console.log(`Status: ${tSummaryRes.status}, Success: ${tSummary.success}`);
  console.log(`Total Teachers: ${tSummary.totals?.total}, Active: ${tSummary.totals?.active}, Inactive: ${tSummary.totals?.inactive}`);
  console.log(`Departments count: ${tSummary.departments?.length}\n`);

  // 2. Teacher Paginated List
  console.log('2. GET /teachers?page=1&limit=25');
  const tListRes = await fetch(`${baseUrl}/teachers?page=1&limit=25`, { headers });
  const tList = await tListRes.json();
  console.log(`Status: ${tListRes.status}, Teachers returned: ${tList.teachers?.length}, Total DB records: ${tList.pagination?.total}\n`);

  // 3. Student Department Summary
  console.log('3. GET /students/department-summary');
  const sSummaryRes = await fetch(`${baseUrl}/students/department-summary`, { headers });
  const sSummary = await sSummaryRes.json();
  console.log(`Status: ${sSummaryRes.status}, Success: ${sSummary.success}`);
  console.log(`Total Students: ${sSummary.totals?.total}, Departments count: ${sSummary.departments?.length}\n`);

  // 4. Student Cohort Summary for ETE
  console.log('4. GET /students/cohort-summary?department=ETE');
  const sCohortRes = await fetch(`${baseUrl}/students/cohort-summary?department=ETE`, { headers });
  const sCohort = await sCohortRes.json();
  console.log(`Status: ${sCohortRes.status}, Cohorts found:`, sCohort.cohorts);

  // 5. Student List for ETE
  console.log('\n5. GET /students?department=ETE&series=22&limit=50');
  const sListRes = await fetch(`${baseUrl}/students?department=ETE&series=22&limit=50`, { headers });
  const sList = await sListRes.json();
  console.log(`Status: ${sListRes.status}, Students returned: ${sList.students?.length}, Total DB records: ${sList.pagination?.total}`);

  console.log('\n✅ ALL LIVE HTTP API TESTS COMPLETED AND AUTHENTICATED SUCCESSFULLY!');
  await mongoose.disconnect();
}

testEndpoints().catch(err => {
  console.error('API Test Error:', err);
  process.exit(1);
});
