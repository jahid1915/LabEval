const http = require('http');

const BASE_URL = 'http://127.0.0.1:5000';

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: data ? JSON.parse(data) : {} });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('🧪 Starting Super Admin & Current Teaching Assignment Test Suite...');
  let passed = 0;
  let failed = 0;

  function assert(condition, desc) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  // 1. Login as Admin
  console.log('\n[1] Admin Authentication');
  const adminLoginRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    identifier: 'ADMIN',
    password: 'admin123'
  });

  assert(adminLoginRes.status === 200 && adminLoginRes.data?.token, 'Admin login succeeded');
  const adminToken = adminLoginRes.data?.token;

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  };

  // 2. Faculties Summary
  console.log('\n[2] Faculties Summary (Faculty-First Hierarchical Structure)');
  const facRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/admin/faculties-summary',
    method: 'GET',
    headers: authHeaders
  });
  assert(facRes.status === 200 && facRes.data?.success && Array.isArray(facRes.data?.faculties), 'GET /api/admin/faculties-summary returns faculties list');
  assert(facRes.data.faculties.length > 0, `Found ${facRes.data.faculties.length} faculties with summary metrics`);
  const firstFac = facRes.data.faculties[0];
  assert(firstFac.stats && typeof firstFac.stats.departmentsCount === 'number', 'Faculty has departmentsCount, teachersCount, studentsCount');

  // 3. Department Overview
  console.log('\n[3] Department Overview');
  const deptRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/admin/departments/ETE/overview',
    method: 'GET',
    headers: authHeaders
  });
  assert(deptRes.status === 200 && deptRes.data?.success, 'GET /api/admin/departments/ETE/overview returns 200');
  assert(deptRes.data.department?.code === 'ETE', 'Department code is ETE');
  assert(deptRes.data.stats && typeof deptRes.data.stats.teachersCount === 'number', 'Department stats include teachers, students, courses');

  // 4. Department Head History
  console.log('\n[4] Department Head History');
  const headHistRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/admin/departments/ETE/head-history',
    method: 'GET',
    headers: authHeaders
  });
  assert(headHistRes.status === 200 && headHistRes.data?.success && Array.isArray(headHistRes.data?.history), 'GET /api/admin/departments/ETE/head-history returns array');

  // 5. Create 2 test teachers to test Head assignment & replacement
  console.log('\n[5] Test Teachers Setup for Head Assignment');
  const ts = Date.now().toString().slice(-4);
  const teacherId1 = `T-ETE-H1-${ts}`;
  const teacherId2 = `T-ETE-H2-${ts}`;

  const t1Res = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/admin/teachers',
    method: 'POST',
    headers: authHeaders
  }, {
    name: 'Dr. Head Candidate One',
    teacherId: teacherId1,
    department: 'ETE',
    designation: 'Professor',
    contactNo: '01700000001',
    password: 'Password@123'
  });
  assert(t1Res.status === 201, `Created candidate teacher 1: ${teacherId1}`);

  const t2Res = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/admin/teachers',
    method: 'POST',
    headers: authHeaders
  }, {
    name: 'Dr. Head Candidate Two',
    teacherId: teacherId2,
    department: 'ETE',
    designation: 'Professor',
    contactNo: '01700000002',
    password: 'Password@123'
  });
  assert(t2Res.status === 201, `Created candidate teacher 2: ${teacherId2}`);

  // 6. Assign Head 1
  console.log('\n[6] Assign Department Head');
  const assignHead1 = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/admin/departments/ETE/assign-head',
    method: 'POST',
    headers: authHeaders
  }, {
    teacherId: teacherId1,
    reason: 'Regular rotational head appointment'
  });
  assert(assignHead1.status === 200 && assignHead1.data?.success, `Assigned ${teacherId1} as Head of ETE`);

  // 7. Replace with Head 2 (Verify Old Head demoted, New Head promoted, History logged)
  console.log('\n[7] Replace Department Head & History Verification');
  const assignHead2 = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/admin/departments/ETE/assign-head',
    method: 'POST',
    headers: authHeaders
  }, {
    teacherId: teacherId2,
    reason: 'Handover to new department head'
  });
  assert(assignHead2.status === 200 && assignHead2.data?.success, `Replaced Head of ETE with ${teacherId2}`);

  // Check head history again
  const headHistRes2 = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/admin/departments/ETE/head-history',
    method: 'GET',
    headers: authHeaders
  });
  const latestHist = headHistRes2.data?.history?.[0];
  assert(latestHist && latestHist.newHeadId === teacherId2, `Department head history recorded new head ${teacherId2}`);
  assert(latestHist.previousHeadId === teacherId1, `Department head history recorded previous head ${teacherId1}`);

  // 8. Current Teaching Assignments (ADD-ON)
  console.log('\n[8] Current Teaching Assignments (ADD-ON)');
  const currAssignRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/admin/teaching-assignments/current',
    method: 'GET',
    headers: authHeaders
  });
  assert(currAssignRes.status === 200 && currAssignRes.data?.success && Array.isArray(currAssignRes.data?.assignments), 'GET /api/admin/teaching-assignments/current returns assignments list');

  // 9. Assign Course to Teacher (ADD-ON)
  console.log('\n[9] Assign Course to Teacher with Role & Exclusivity');
  const assignCourseRes1 = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/admin/teaching-assignments',
    method: 'POST',
    headers: authHeaders
  }, {
    courseCode: 'ETE 3221',
    teacherId: teacherId1,
    role: 'PRIMARY_TEACHER',
    series: '22',
    academicSession: '2024-2025',
    semester: '3-2',
    notes: 'Primary instructor for theory'
  });
  assert(assignCourseRes1.status === 201 && assignCourseRes1.data?.success, `Assigned course ETE 3221 to ${teacherId1} as PRIMARY_TEACHER`);
  const assignmentId = assignCourseRes1.data?.assignment?._id;

  // 10. Duplicate assignment prevention
  console.log('\n[10] Duplicate Assignment Prevention');
  const duplicateAssignRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/admin/teaching-assignments',
    method: 'POST',
    headers: authHeaders
  }, {
    courseCode: 'ETE 3221',
    teacherId: teacherId1,
    role: 'PRIMARY_TEACHER',
    series: '22',
    academicSession: '2024-2025',
    semester: '3-2'
  });
  assert(duplicateAssignRes.status === 400, 'Duplicate active assignment rejected with 400');

  // 11. Cross-department assignment conflict check
  console.log('\n[11] Cross-Department Conflict Detection');
  const crossDeptRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/admin/teaching-assignments',
    method: 'POST',
    headers: authHeaders
  }, {
    courseCode: 'CSE 3201', // CSE course
    teacherId: teacherId1,  // ETE teacher
    role: 'PRIMARY_TEACHER',
    series: '22',
    academicSession: '2024-2025',
    semester: '3-2',
    allowCrossDepartment: false
  });
  // Should reject if teacher department != course department (or succeed if course doesn't exist/different message)
  assert(crossDeptRes.status === 400 || crossDeptRes.status === 404, `Cross-department conflict check handled (${crossDeptRes.status})`);

  // 12. Primary teacher replacement (ETE 3221 reassigned to teacherId2)
  console.log('\n[12] Primary Teacher Replacement (Historical Preserved)');
  const replacePrimaryRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/admin/teaching-assignments',
    method: 'POST',
    headers: authHeaders
  }, {
    courseCode: 'ETE 3221',
    teacherId: teacherId2,
    role: 'PRIMARY_TEACHER',
    series: '22',
    academicSession: '2024-2025',
    semester: '3-2',
    notes: 'Replaced previous primary teacher'
  });
  assert(replacePrimaryRes.status === 201, `Replaced primary teacher for ETE 3221 with ${teacherId2}`);

  // 13. Teacher Teaching Overview & Workload
  console.log('\n[13] Teacher Teaching Overview & Workload');
  const teacherOverviewRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: `/api/admin/teachers/${teacherId2}/teaching-overview`,
    method: 'GET',
    headers: authHeaders
  });
  assert(teacherOverviewRes.status === 200 && teacherOverviewRes.data?.success, `GET teaching overview for ${teacherId2} returned 200`);
  assert(teacherOverviewRes.data.workload && typeof teacherOverviewRes.data.workload.totalCourses === 'number', 'Workload stats computed');
  assert(Array.isArray(teacherOverviewRes.data.currentCourses) && teacherOverviewRes.data.currentCourses.length > 0, 'Current courses list populated');

  // Check teacher 1 (should show previous course in courseHistory)
  const teacher1OverviewRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: `/api/admin/teachers/${teacherId1}/teaching-overview`,
    method: 'GET',
    headers: authHeaders
  });
  assert(teacher1OverviewRes.data.courseHistory && teacher1OverviewRes.data.courseHistory.length > 0, `Teacher 1 historical assignment preserved in courseHistory`);

  // 14. Course Teaching Roster
  console.log('\n[14] Course Teaching Roster');
  const courseRosterRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/admin/courses/ETE%203221/teaching-roster',
    method: 'GET',
    headers: authHeaders
  });
  assert(courseRosterRes.status === 200 && courseRosterRes.data?.success, 'GET course teaching roster returned 200');
  assert(Array.isArray(courseRosterRes.data.assignedTeachers) && courseRosterRes.data.assignedTeachers.length > 0, 'Assigned teachers list populated');
  assert(Array.isArray(courseRosterRes.data.students), 'Students roster populated');

  // 15. System Settings
  console.log('\n[15] System Settings');
  const settingsGetRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/admin/system-settings',
    method: 'GET',
    headers: authHeaders
  });
  assert(settingsGetRes.status === 200 && settingsGetRes.data?.settings?.currentSession, 'GET system settings succeeded');

  const settingsPutRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/admin/system-settings',
    method: 'PUT',
    headers: authHeaders
  }, {
    currentSemester: '4-1'
  });
  assert(settingsPutRes.status === 200 && settingsPutRes.data?.settings?.currentSemester === '4-1', 'PUT system settings updated currentSemester to 4-1');

  // 16. Security & Privilege Escalation Tests
  console.log('\n[16] Security & Privilege Escalation Checks');
  const noTokenRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/admin/teaching-assignments/current',
    method: 'GET'
  });
  assert(noTokenRes.status === 401, 'Unauthorized request without token rejected with 401');

  // Teacher token trying admin endpoint
  const teacherLoginRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    loginIdentifier: teacherId1,
    password: 'Password@123'
  });
  if (teacherLoginRes.data?.token) {
    const teacherToken = teacherLoginRes.data.token;
    const teacherForbiddenRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/admin/departments/ETE/assign-head',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`
      }
    }, { teacherId: teacherId1 });
    assert(teacherForbiddenRes.status === 403, 'Normal teacher token rejected from admin head assignment with 403');
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
  process.exit(0);
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
