const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch {
          resolve({ statusCode: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTest() {
  console.log('--- TESTING DATABASE MANAGEMENT NEW RECORD CREATION & COHORT PROGRESSION ---');
  
  // 1. Login as Admin
  const loginRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: 'admin', password: 'adminpassword' });

  if (loginRes.statusCode !== 200 || !loginRes.data.token) {
    console.error('Admin login failed:', loginRes.data);
    process.exit(1);
  }
  const token = loginRes.data.token;
  console.log('✅ Admin login succeeded');

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 2. Fetch schema for students
  const studentSchemaRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/database/students/schema',
    method: 'GET',
    headers: authHeaders
  });

  console.log('Students schema status:', studentSchemaRes.statusCode);
  if (studentSchemaRes.statusCode !== 200) {
    console.error('Failed to get student schema:', studentSchemaRes.data);
    process.exit(1);
  }
  console.log('✅ Students schema fields:', studentSchemaRes.data.createFields?.length, 'fields, color:', studentSchemaRes.data.colorTheme?.accent);
  console.log('Reference options populated: departments =', studentSchemaRes.data.referenceOptions?.departments?.length, ', series =', studentSchemaRes.data.referenceOptions?.series?.length);

  // 3. Test creating a new student via table-specific entry
  const testRoll = `TEST${Date.now().toString().slice(-5)}`;
  const createStudentRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/database/students',
    method: 'POST',
    headers: authHeaders
  }, {
    rollNumber: testRoll,
    name: 'Test Student Automated',
    department: 'ETE',
    series: '22',
    registrationNumber: '998877',
    regularStatus: 'Regular',
    status: 'active',
    section: 'A',
    semester: '4th Semester'
  });

  console.log('Create student status:', createStudentRes.statusCode);
  if (createStudentRes.statusCode !== 201) {
    console.error('Failed to create student:', createStudentRes.data);
    process.exit(1);
  }
  console.log('✅ Student created successfully:', createStudentRes.data.record?.rollNumber, 'ID:', createStudentRes.data.record?._id);

  // 4. Test duplicate roll number rejection
  const dupStudentRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/database/students',
    method: 'POST',
    headers: authHeaders
  }, {
    rollNumber: testRoll,
    name: 'Duplicate Student',
    department: 'ETE',
    series: '22'
  });
  console.log('Duplicate roll rejection status:', dupStudentRes.statusCode, '(Expected: 400)');
  if (dupStudentRes.statusCode !== 400) {
    console.error('Failed to reject duplicate roll');
    process.exit(1);
  }
  console.log('✅ Duplicate prevention verified');

  // 5. Test Cohort Preview
  const previewRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/academic/cohort-preview?department=ETE&series=22',
    method: 'GET',
    headers: authHeaders
  });
  console.log('Cohort preview status:', previewRes.statusCode, 'student count =', previewRes.data.studentCount);
  if (previewRes.statusCode !== 200 || typeof previewRes.data.studentCount !== 'number') {
    console.error('Failed cohort preview:', previewRes.data);
    process.exit(1);
  }
  console.log('✅ Cohort preview verified');

  // 6. Test Cohort Semester Update
  const updateCohortRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/academic/cohort-semester',
    method: 'POST',
    headers: authHeaders
  }, {
    department: 'ETE',
    series: '22',
    currentSemester: '5th Semester'
  });
  console.log('Cohort update status:', updateCohortRes.statusCode, 'affected students =', updateCohortRes.data.affectedStudents);
  if (updateCohortRes.statusCode !== 200) {
    console.error('Failed cohort update:', updateCohortRes.data);
    process.exit(1);
  }
  console.log('✅ Cohort semester progression verified');

  // Clean up test student
  const deleteRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/admin/database/students/${createStudentRes.data.record._id}`,
    method: 'DELETE',
    headers: authHeaders
  }, { action: 'permanent', confirmText: 'DELETE' });
  console.log('Cleanup test student status:', deleteRes.statusCode);

  console.log('🎉 ALL BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runTest().catch(console.error);
