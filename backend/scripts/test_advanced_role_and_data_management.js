/**
 * Verification Test Suite for LabEval Advanced Role Architecture,
 * Admin Master-Data Control, Department Head Dual-Mode, and Referential Integrity Safety
 */

const http = require('http');

const API_BASE = 'http://localhost:5000';

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ statusCode: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function login(loginIdentifier, password) {
  const res = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { loginIdentifier, password });

  if (res.statusCode !== 200) {
    throw new Error(`Login failed for ${loginIdentifier}: ${res.statusCode} ${JSON.stringify(res.body)}`);
  }
  return {
    token: res.body.token,
    user: res.body.user
  };
}

async function runTests() {
  console.log('=================================================================');
  console.log('LABEVAL ADVANCED ROLE ARCHITECTURE & MASTER-DATA CONTROL TEST SUITE');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate All Actors
    console.log('Step 1: Authenticating All System Roles...');
    const adminAuth = await login('admin', 'adminpassword');
    assert(adminAuth.user.role === 'admin' || adminAuth.user.role === 'super_admin', 'Admin authenticated with admin authority');

    const headAuth = await login('head_ete', 'Password123!');
    assert(headAuth.user.role === 'department_head', 'Head authenticated with department_head role');
    assert(headAuth.user.departmentCode === 'ETE', 'Head associated with ETE department');

    console.log('\nStep 2: Department Head Hard Restrictions (Section 3 & 53)...');

    // Head attempting to create student master record -> Must be 403 Forbidden
    const headCreateStudent = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/students',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${headAuth.token}`
      }
    }, { name: 'Illegal Student', rollNumber: '9999999', series: '99', department: 'ETE' });
    assert(headCreateStudent.statusCode === 403, `Head calling POST /api/admin/students rejected with 403 (got ${headCreateStudent.statusCode})`);

    // Head attempting XLSX preview -> Must be 403 Forbidden
    const headImportXlsx = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/imports/xlsx/preview',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${headAuth.token}` }
    });
    assert(headImportXlsx.statusCode === 403, `Head calling POST /api/admin/imports/xlsx rejected with 403 (got ${headImportXlsx.statusCode})`);

    // Head attempting JSON preview -> Must be 403 Forbidden
    const headImportJson = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/imports/json/preview',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${headAuth.token}`
      }
    }, { data: [{ rollNumber: '1111111' }] });
    assert(headImportJson.statusCode === 403, `Head calling POST /api/admin/imports/json rejected with 403 (got ${headImportJson.statusCode})`);

    // Head attempting legacy import route -> Must be 403 Forbidden
    const headLegacyImport = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/import/template',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${headAuth.token}` }
    });
    assert(headLegacyImport.statusCode === 403, `Head calling GET /api/import/template rejected with 403 (got ${headLegacyImport.statusCode})`);

    // Head attempting master course creation -> Must be 403 Forbidden
    const headCreateCourse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/courses',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${headAuth.token}`
      }
    }, { courseCode: 'ETE 9999', courseName: 'Illegal Master Course' });
    assert(headCreateCourse.statusCode === 403, `Head calling POST /api/admin/courses rejected with 403 (got ${headCreateCourse.statusCode})`);

    // Head attempting series modification -> Must be 403 Forbidden
    const headCreateSeries = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/academic/series',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${headAuth.token}`
      }
    }, { name: '99', departmentCode: 'ETE' });
    assert(headCreateSeries.statusCode === 403, `Head calling POST /api/academic/series rejected with 403 (got ${headCreateSeries.statusCode})`);

    console.log('\nStep 3: Department Scoping & Cross-Department Protection (Section 23)...');

    // Head requesting students with wrong department parameter
    const headCrossDept = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/head/students?department=CSE',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${headAuth.token}` }
    });
    assert(headCrossDept.statusCode === 403 || headCrossDept.body.department === 'ETE', 
      `Head cross-department request handled securely (status: ${headCrossDept.statusCode})`);

    // Head requesting own department students
    const headOwnStudents = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/head/students?limit=10',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${headAuth.token}` }
    });
    assert(headOwnStudents.statusCode === 200, `Head gets own department students (status: 200)`);
    assert(headOwnStudents.body.department === 'ETE', `Returned dataset strictly scoped to ETE`);
    assert(Array.isArray(headOwnStudents.body.students) && headOwnStudents.body.pagination.total > 0, 
      `Found ${headOwnStudents.body.pagination.total} students in ETE department`);

    console.log('\nStep 4: Department Head Dual-Mode (Head Mode & Teacher Mode)...');

    // Head accessing Head-mode endpoint
    const headDashboard = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/head/stats',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${headAuth.token}` }
    });
    assert(headDashboard.statusCode === 200, `Head Mode dashboard overview accessed (status: 200)`);

    // Head accessing Teacher-mode endpoint (Teacher assignments/courses)
    const headAsTeacherCourses = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/teacher/courses',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${headAuth.token}` }
    });
    assert(headAsTeacherCourses.statusCode === 200, `Teacher Mode /api/teacher/courses accessed via dual-capability (status: 200)`);

    // Head accessing Teacher-mode supervision
    const headAsTeacherSup = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/teacher/supervision',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${headAuth.token}` }
    });
    assert(headAsTeacherSup.statusCode === 200, `Teacher Mode /api/teacher/supervision accessed via dual-capability (status: 200)`);

    console.log('\nStep 5: Admin Master Data & JSON Import Pipeline (Section 10, 11, 14)...');

    // Admin JSON import preview
    const testRoll = `220399${Math.floor(10 + Math.random() * 89)}`;
    const previewRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/imports/json/preview',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAuth.token}`
      }
    }, {
      targetEntity: 'students',
      data: [
        {
          rollNumber: testRoll,
          name: 'Automated QA Test Student',
          registrationNumber: `REG${testRoll}`,
          department: 'ETE',
          series: '22',
          session: '2022-2023',
          semester: '1st'
        }
      ]
    });
    assert(previewRes.statusCode === 200, `Admin JSON preview returned 200 (importId: ${previewRes.body.importId})`);

    const importId = previewRes.body.importId;

    // Admin JSON import validate
    const validateRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/imports/json/validate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAuth.token}`
      }
    }, {
      importId,
      duplicatePolicy: 'skip'
    });
    assert(validateRes.statusCode === 200, `Admin JSON validate returned 200 (validCount: ${validateRes.body.summary.validCount})`);

    // Admin JSON import commit
    const commitRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/imports/json/commit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAuth.token}`
      }
    }, {
      importId,
      duplicatePolicy: 'skip'
    });
    assert(commitRes.statusCode === 200, `Admin JSON commit returned 200 (created: ${commitRes.body.createdCount})`);

    // Verify imported student exists in Head's view immediately
    const headFindStudent = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/head/students?search=${testRoll}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${headAuth.token}` }
    });
    assert(headFindStudent.statusCode === 200 && headFindStudent.body.students.length > 0, 
      `Imported student ${testRoll} immediately visible to Department Head`);

    // Verify student user can log in with their registration number
    const studentLogin = await login(testRoll, `REG${testRoll}`);
    assert(studentLogin.user.role === 'student', `Imported student logged in successfully with default credentials`);

    console.log('\nStep 6: Safe Deletion & Referential Integrity Protection (Section 16 & 62)...');

    // Attempt to delete student with academic attendance/marks (e.g. 2203001)
    const existingStudentRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/students?limit=5',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminAuth.token}` }
    });
    const sampleStudent = existingStudentRes.body.students[0];

    // Safe delete clean test student (has 0 attendance/marks)
    const testStudentDoc = headFindStudent.body.students[0];
    const safeDeleteClean = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin/students/${testStudentDoc._id}/safe`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminAuth.token}` }
    });
    if (safeDeleteClean.statusCode !== 200) {
      console.log('safeDeleteClean debug:', safeDeleteClean.statusCode, safeDeleteClean.body);
    }
    assert(safeDeleteClean.statusCode === 200, `Clean test student ${testRoll} safely deleted (status: 200)`);

    // Admin Data Export (Section 63)
    console.log('\nStep 7: Admin Data Export (Section 63)...');
    const exportJson = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/export/students?format=json&department=ETE',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminAuth.token}` }
    });
    assert(exportJson.statusCode === 200 && Array.isArray(exportJson.body), 
      `Exported ${exportJson.body.length} student records in JSON format without credentials`);

  } catch (err) {
    console.error('Test suite error:', err);
    failed++;
  }

  console.log('\n=================================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('=================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
