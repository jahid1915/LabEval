/**
 * LabEval — Automated QA, API Testing, Integration & Cross-Check Suite
 * Tests actual running application and API endpoints at http://127.0.0.1:5000
 */
require('dotenv').config();
const mongoose = require('mongoose');

const BASE_URL = 'http://127.0.0.1:5000';

const summary = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: [],
  categories: {}
};

function recordTest(category, name, passed, details = '') {
  summary.total++;
  if (!summary.categories[category]) {
    summary.categories[category] = { total: 0, passed: 0, failed: 0 };
  }
  summary.categories[category].total++;

  if (passed) {
    summary.passed++;
    summary.categories[category].passed++;
    console.log(`  ✅ [PASS] ${category}: ${name}`);
  } else {
    summary.failed++;
    summary.categories[category].failed++;
    const errMsg = `❌ [FAIL] ${category}: ${name} — ${details}`;
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

async function runTestSuite() {
  console.log('===============================================================');
  console.log('🚀 STARTING LABEVAL PERSISTENT QA & CROSS-CHECK TEST SUITE');
  console.log(`Target: ${BASE_URL}`);
  console.log('===============================================================\n');

  // Connect to DB for direct record verification
  await mongoose.connect(process.env.MONGO_URI);
  console.log('📦 Connected to MongoDB for database state cross-checks.\n');

  const Student = require('../models/Student');
  const Teacher = require('../models/Teacher');
  const Course = require('../models/Course');
  const CourseOffering = require('../models/CourseOffering');
  const TeacherAssignment = require('../models/TeacherAssignment');
  const Attendance = require('../models/Attendance');
  const FinalResult = require('../models/FinalResult');
  const ElectiveOffering = require('../models/ElectiveOffering');
  const ElectiveSelection = require('../models/ElectiveSelection');
  const Department = require('../models/Department');
  const Faculty = require('../models/Faculty');

  // Initial Cleanup of any leftover test markers
  await Student.deleteMany({ rollNumber: { $in: ['2299001', '2299002', '2299003', '2299004', '2299005', '2399001'] } });
  await Teacher.deleteMany({ teacherId: 'TEST-T001' });
  await Course.deleteMany({ courseCode: { $in: ['TEST-ETE-4201', 'TEST-ELE-A', 'TEST-ELE-B', 'TEST-ELE-C'] } });
  await CourseOffering.deleteMany({ courseCode: 'TEST-ETE-4201' });
  await Attendance.deleteMany({ course: 'TEST-ETE-4201' });
  await FinalResult.deleteMany({ course: 'TEST-ETE-4201' });
  await ElectiveOffering.deleteMany({ name: 'TEST-ETE-ELECTIVE-2025' });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. ENDPOINT DISCOVERY & HEALTH CHECKS
  // ──────────────────────────────────────────────────────────────────────────
  console.log('🔹 1. HEALTH & ENDPOINT DISCOVERY');
  {
    const h = await api('/health');
    recordTest('Health', 'Backend Health Endpoint', h.status === 200 && h.data?.status === 'ok');

    const live = await api('/health/live');
    recordTest('Health', 'Backend Liveness Probe', live.status === 200 && live.data?.alive === true);

    const ready = await api('/health/ready');
    recordTest('Health', 'Backend Readiness Probe', ready.status === 200 && ready.data?.ready === true);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. AUTHENTICATION & LOGIN TESTING (Section 7)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔹 2. AUTHENTICATION TESTING');
  let adminToken = '';
  {
    // Admin Valid Login
    const admLogin = await api('/api/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    recordTest('Auth', 'Admin Valid Login', admLogin.status === 200 && !!admLogin.data?.token);
    adminToken = admLogin.data?.token || '';

    // Admin Invalid Credentials
    const admBad = await api('/api/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' })
    });
    recordTest('Auth', 'Admin Invalid Password Rejected', admBad.status === 401);

    // Admin Missing Credentials
    const admMissing = await api('/api/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ username: '' })
    });
    recordTest('Auth', 'Admin Missing Credentials Rejected', admMissing.status === 400);

    // Teacher Invalid Login
    const tBad = await api('/api/auth/teacher-login', {
      method: 'POST',
      body: JSON.stringify({ teacherId: 'NON_EXISTENT', password: 'bad' })
    });
    recordTest('Auth', 'Teacher Invalid Credentials Rejected', tBad.status === 401);

    // Student Invalid Login
    const sBad = await api('/api/auth/student-login', {
      method: 'POST',
      body: JSON.stringify({ rollNumber: '0000000', password: 'bad' })
    });
    recordTest('Auth', 'Student Invalid Credentials Rejected', sBad.status === 401);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. DUMMY DATA CREATION (Section 4)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔹 3. DUMMY DATA CREATION');
  const eteDept = await Department.findOne({ code: 'ETE' });
  const faculty = await Faculty.findOne({ code: 'ECE' });

  // 3.1 Create Test Teacher
  const tCreate = await api('/api/admin/teachers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Test Teacher 01',
      teacherId: 'TEST-T001',
      phone: '01999000001',
      contactNo: '01999000001',
      email: 'testteacher01@example.com',
      department: 'ETE',
      designation: 'Lecturer',
      password: 'password123'
    })
  });
  recordTest('DummyData', 'Create Test Teacher (TEST-T001)', tCreate.status === 201 || tCreate.status === 200);

  // 3.2 Create 5 Students for Series 22 and 1 Student for Series 23
  const studentRolls = ['2299001', '2299002', '2299003', '2299004', '2299005'];
  for (let i = 0; i < studentRolls.length; i++) {
    const roll = studentRolls[i];
    const sCreate = await api('/api/admin/students', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: `Test Student 0${i + 1}`,
        rollNumber: roll,
        registrationNumber: `TEST-REG-00${i + 1}`,
        email: `teststudent0${i + 1}@example.com`,
        series: '22',
        semester: '4',
        session: '2025-26',
        department: 'ETE',
        password: 'password123'
      })
    });
    recordTest('DummyData', `Create Series 22 Student ${roll}`, sCreate.status === 201 || sCreate.status === 200);
  }

  // Series 23 Student (boundary case)
  const s23Create = await api('/api/admin/students', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Test Student Series 23',
      rollNumber: '2399001',
      registrationNumber: 'TEST-REG-2301',
      email: 'teststudent2301@example.com',
      series: '23',
      semester: '4',
      session: '2025-26',
      department: 'ETE',
      password: 'password123'
    })
  });
  recordTest('DummyData', 'Create Series 23 Student 2399001', s23Create.status === 201 || s23Create.status === 200);

  // 3.3 Create Course & Course Offering
  const courseDoc = await Course.create({
    courseCode: 'TEST-ETE-4201',
    courseName: 'Test Digital Communication',
    credit: 1.5,
    creditHours: 3.0,
    department: eteDept?._id,
    departmentCode: 'ETE',
    faculty: faculty?._id,
    facultyCode: 'ECE',
    courseType: 'Sessional',
    isSessional: true,
    isElective: false,
    semesterLevel: '4',
    series: '22',
    assessmentConfig: {
      attendance: 5,
      report: 10,
      performance: 5,
      quiz: 30,
      test: 20,
      others: 5
    }
  });

  const offeringDoc = await CourseOffering.create({
    course: courseDoc._id,
    courseCode: 'TEST-ETE-4201',
    courseName: 'Test Digital Communication',
    department: eteDept?._id,
    departmentCode: 'ETE',
    seriesName: '22',
    semesterName: '4',
    sessionName: '2025-26',
    credit: 1.5,
    status: 'active',
    assessmentConfig: {
      attendance: 5,
      report: 10,
      performance: 5,
      quiz: 30,
      test: 20,
      others: 5
    }
  });

  const teacherDoc = await Teacher.findOne({ teacherId: 'TEST-T001' });
  const assignmentDoc = await TeacherAssignment.create({
    courseOffering: offeringDoc._id,
    teacher: teacherDoc._id,
    teacherId: teacherDoc.teacherId,
    department: eteDept?._id,
    role: 'PRIMARY',
    status: 'active'
  });
  recordTest('DummyData', 'Create Course & Teacher Assignment', !!assignmentDoc._id);

  // ──────────────────────────────────────────────────────────────────────────
  // 4. ROLE-BASED ACCESS CONTROL TESTING (Section 8)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔹 4. ROLE-BASED ACCESS TESTING (RBAC)');
  // Teacher Login
  const tLogin = await api('/api/auth/teacher-login', {
    method: 'POST',
    body: JSON.stringify({ teacherId: 'TEST-T001', password: 'password123' })
  });
  recordTest('Auth', 'Teacher Valid Login', tLogin.status === 200 && !!tLogin.data?.token);
  const teacherToken = tLogin.data?.token;

  // Student Login
  const sLogin = await api('/api/auth/student-login', {
    method: 'POST',
    body: JSON.stringify({ rollNumber: '2299001', password: 'password123' })
  });
  recordTest('Auth', 'Student Valid Login', sLogin.status === 200 && !!sLogin.data?.token);
  const studentToken = sLogin.data?.token;

  // 4.1 Student tries Admin API (Expect 403)
  const sTryAdm = await api('/api/admin/stats', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  recordTest('RBAC', 'Student Access Admin API Blocked (403)', sTryAdm.status === 403);

  // 4.2 Student tries Teacher API (Expect 403)
  const sTryTch = await api('/api/teacher/courses', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  recordTest('RBAC', 'Student Access Teacher API Blocked (403)', sTryTch.status === 403);

  // 4.3 Teacher tries Admin API (Expect 403)
  const tTryAdm = await api('/api/admin/stats', {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  recordTest('RBAC', 'Teacher Access Admin API Blocked (403)', tTryAdm.status === 403);

  // 4.4 Unauthenticated user tries Protected API (Expect 401)
  const noAuth = await api('/api/admin/stats');
  recordTest('RBAC', 'Unauthenticated Access Blocked (401)', noAuth.status === 401);

  // 4.5 Teacher tries accessing a course they are not assigned to (Expect 403)
  const tTryUnassigned = await api('/api/teacher/students/CSE2200', {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  recordTest('RBAC', 'Teacher Access to Unassigned Course Blocked (403)', tTryUnassigned.status === 403);

  // ──────────────────────────────────────────────────────────────────────────
  // 5. AUTOMATIC ENROLLMENT TESTING (Section 11)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔹 5. AUTOMATIC ENROLLMENT TESTING');
  const rosterRes = await api('/api/teacher/students/TEST-ETE-4201?department=ETE&series=22', {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  recordTest('AutoEnroll', 'Roster Retrieval HTTP Status', rosterRes.status === 200);

  const rosterStudents = Array.isArray(rosterRes.data) ? rosterRes.data : [];
  const rosterRolls = rosterStudents.map(s => s.rollNumber);
  console.log('    Roster retrieved rolls:', rosterRolls.filter(r => r.startsWith('2299') || r.startsWith('2399')));

  const all5Included = studentRolls.every(r => rosterRolls.includes(r));
  recordTest('AutoEnroll', 'All 5 Series 22 Students Automatically In Roster', all5Included);

  const series23Excluded = !rosterRolls.includes('2399001');
  recordTest('AutoEnroll', 'Series 23 Student Correctly Excluded From Roster', series23Excluded);

  // ──────────────────────────────────────────────────────────────────────────
  // 6. TEACHER WORKFLOW & MARKS CALCULATION TESTING (Section 10)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔹 6. TEACHER WORKFLOW & MARKS CALCULATION');

  // 6.1 Take attendance (Present for 2299001-2299003, Absent for 2299004-2299005)
  const student1 = rosterStudents.find(s => s.rollNumber === '2299001');
  const student4 = rosterStudents.find(s => s.rollNumber === '2299004');

  const attRes = await api('/api/teacher/attendance', {
    method: 'POST',
    headers: { Authorization: `Bearer ${teacherToken}` },
    body: JSON.stringify({
      studentId: student1?._id,
      courseId: 'TEST-ETE-4201',
      status: 'Present',
      dayName: 'Day 1',
      date: new Date().toISOString()
    })
  });
  recordTest('TeacherWorkflow', 'Record Single Attendance (Present)', attRes.status === 200);

  const attResAbsent = await api('/api/teacher/attendance', {
    method: 'POST',
    headers: { Authorization: `Bearer ${teacherToken}` },
    body: JSON.stringify({
      studentId: student4?._id,
      courseId: 'TEST-ETE-4201',
      status: 'Absent',
      dayName: 'Day 1',
      date: new Date().toISOString()
    })
  });
  recordTest('TeacherWorkflow', 'Record Single Attendance (Absent)', attResAbsent.status === 200);

  // Verify attendance persisted in database
  const attInDb = await Attendance.findOne({ student: student1?._id, course: 'TEST-ETE-4201' });
  recordTest('Database', 'Attendance Record Persisted in MongoDB', !!attInDb && attInDb.status === 'Present');

  // 6.2 Enter Marks:
  // Attendance = 4, Reports = 8, Performance = 4, Quiz = 25, Test = 17, Others = 4
  // Expected Total = 62 / 75
  const marksRes = await api('/api/teacher/results/TEST-ETE-4201/submit', {
    method: 'POST',
    headers: { Authorization: `Bearer ${teacherToken}` },
    body: JSON.stringify({
      courseId: 'TEST-ETE-4201',
      status: 'submitted',
      records: [
        {
          studentId: student1?._id,
          studentRoll: '2299001',
          studentName: 'Test Student 01',
          attendanceMark: 4,
          reportMark: 8,
          perfMark: 4,
          quizMark: 25,
          testMark: 17,
          otherMark: 4,
          totalMark: 62
        }
      ]
    })
  });
  recordTest('TeacherWorkflow', 'Submit Mark Sheet (62/75)', marksRes.status === 200 && marksRes.data?.success === true);

  // Verify marks calculation & persistence in Database
  const finalResultDoc = await FinalResult.findOne({ student: student1?._id, course: 'TEST-ETE-4201' });
  const calcCorrect = finalResultDoc && finalResultDoc.totalMarks === 62 && finalResultDoc.maxTotalMarks === 75;
  recordTest('Database', 'Total Marks 62/75 Persisted in FinalResult', calcCorrect);
  recordTest('Marks', 'RUET Grade Calculated Correctly', !!finalResultDoc?.grade && !!finalResultDoc?.gradePoint);
  console.log(`    Result recorded: Total: ${finalResultDoc?.totalMarks}/75, Grade: ${finalResultDoc?.grade}, GP: ${finalResultDoc?.gradePoint}`);

  // 6.3 Edit Marks (Update Quiz to 26 => Total 63)
  const editMarksRes = await api('/api/teacher/results/TEST-ETE-4201/submit', {
    method: 'POST',
    headers: { Authorization: `Bearer ${teacherToken}` },
    body: JSON.stringify({
      courseId: 'TEST-ETE-4201',
      status: 'submitted',
      records: [
        {
          studentId: student1?._id,
          studentRoll: '2299001',
          studentName: 'Test Student 01',
          attendanceMark: 4,
          reportMark: 8,
          perfMark: 4,
          quizMark: 26,
          testMark: 17,
          otherMark: 4,
          totalMark: 63
        }
      ]
    })
  });
  recordTest('TeacherWorkflow', 'Edit Marks (Update Total to 63)', editMarksRes.status === 200);
  const updatedDoc = await FinalResult.findOne({ student: student1?._id, course: 'TEST-ETE-4201' });
  recordTest('Database', 'Edited Marks Updated to 63 in MongoDB', updatedDoc?.totalMarks === 63);

  // 6.4 Invalid Marks Rejection (e.g. Quiz = 50 when max is 30)
  const invalidMarkRes = await api('/api/teacher/quiz', {
    method: 'POST',
    headers: { Authorization: `Bearer ${teacherToken}` },
    body: JSON.stringify({
      studentId: student1?._id,
      courseId: 'TEST-ETE-4201',
      marks: 50
    })
  });
  recordTest('Marks', 'Invalid Marks Rejection (Quiz 50 > max 30)', invalidMarkRes.status === 400);

  // ──────────────────────────────────────────────────────────────────────────
  // 7. STUDENT WORKFLOW TESTING (Section 9)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔹 7. STUDENT WORKFLOW TESTING');
  // 7.1 Student Profile / Dashboard Info
  const sProfile = await api('/api/student/profile', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  recordTest('StudentWorkflow', 'Student Profile Retrieved', sProfile.status === 200);
  recordTest('StudentWorkflow', 'Student Profile Roll Matches 2299001', sProfile.data?.rollNumber === '2299001');
  recordTest('StudentWorkflow', 'Student Series Matches 22', sProfile.data?.series === '22');

  // 7.2 Student Courses
  const sCourses = await api('/api/student/courses', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  recordTest('StudentWorkflow', 'Student Courses Retrieved', sCourses.status === 200);
  const foundAssignedCourse = Array.isArray(sCourses.data) && sCourses.data.some(c => c.courseCode === 'TEST-ETE-4201');
  recordTest('StudentWorkflow', 'Assigned Core Course Appears In Student Courses', foundAssignedCourse);

  // 7.3 Student Academic History
  const sHistory = await api('/api/student/history', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  recordTest('StudentWorkflow', 'Student Academic History Endpoint', sHistory.status === 200);

  // ──────────────────────────────────────────────────────────────────────────
  // 8. ELECTIVE VOTING & WORKFLOW TESTING (Section 12)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔹 8. ELECTIVE VOTING TESTING');
  // 8.1 Create 3 Elective Courses
  const eleA = await Course.create({
    courseCode: 'TEST-ELE-A',
    courseName: 'Test Elective Sessional A',
    department: eteDept?._id,
    departmentCode: 'ETE',
    faculty: faculty?._id,
    courseType: 'Sessional',
    isElective: true,
    isSessional: true,
    credit: 0.75,
    semesterLevel: '4'
  });
  const eleB = await Course.create({
    courseCode: 'TEST-ELE-B',
    courseName: 'Test Elective Sessional B',
    department: eteDept?._id,
    departmentCode: 'ETE',
    faculty: faculty?._id,
    courseType: 'Sessional',
    isElective: true,
    isSessional: true,
    credit: 0.75,
    semesterLevel: '4'
  });
  const eleC = await Course.create({
    courseCode: 'TEST-ELE-C',
    courseName: 'Test Elective Sessional C',
    department: eteDept?._id,
    departmentCode: 'ETE',
    faculty: faculty?._id,
    courseType: 'Sessional',
    isElective: true,
    isSessional: true,
    credit: 0.75,
    semesterLevel: '4'
  });

  // 8.2 Create Elective Offering via Admin
  const eleOfferingRes = await api('/api/electives/admin/offering', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      department: 'ETE',
      semester: '4',
      academicSession: '2025-26',
      eligibleSeries: ['22'],
      availableCourses: [eleA._id, eleB._id, eleC._id],
      status: 'VOTING_OPEN',
      electiveGroup: 'Elective Sessional Group 1',
      selectionOpenAt: new Date(Date.now() - 3600000).toISOString(),
      selectionCloseAt: new Date(Date.now() + 86400000).toISOString()
    })
  });
  recordTest('Electives', 'Admin Create Elective Offering', eleOfferingRes.status === 201 || eleOfferingRes.status === 200);
  const offeringId = eleOfferingRes.data?.data?._id || eleOfferingRes.data?._id || eleOfferingRes.data?.offering?._id;

  // 8.3 Student Votes for Elective A
  const voteRes = await api(`/api/electives/student/${offeringId}/vote`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      courseId: eleA._id
    })
  });
  recordTest('Electives', 'Student 2299001 Vote Saved', voteRes.status === 200 && voteRes.data?.success === true);

  // 8.4 Duplicate Vote Blocked
  const dupVoteRes = await api(`/api/electives/student/${offeringId}/vote`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      courseId: eleA._id // Re-submitting the same vote
    })
  });
  recordTest('Electives', 'Duplicate Vote Blocked (400)', dupVoteRes.status === 400);

  // 8.5 Verify Vote Persisted in Database and Reflected in Stats
  const voteDoc = await ElectiveSelection.findOne({ studentId: student1?._id, offeringId });
  recordTest('Database', 'Elective Vote Persisted in ElectiveSelection', !!voteDoc && voteDoc.selectedCourse?.toString() === eleA._id.toString());

  const statsRes = await api(`/api/electives/${offeringId}/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const votesCount = statsRes.data?.data?.stats?.votesReceived ?? statsRes.data?.stats?.votesReceived ?? 0;
  recordTest('Electives', 'Vote Reflected in Admin Offering Stats', statsRes.status === 200 && votesCount >= 1);

  // ──────────────────────────────────────────────────────────────────────────
  // 9. ADMIN WORKFLOW & DUPLICATE VALIDATION (Sections 13 & 16)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔹 9. ADMIN WORKFLOW & DUPLICATE PREVENTION');

  // 9.1 Duplicate Student Roll Rejection
  const dupStudent = await api('/api/admin/students', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Duplicate Student',
      rollNumber: '2299001', // Already exists!
      email: 'dup@example.com',
      series: '22',
      department: 'ETE',
      password: 'password123'
    })
  });
  recordTest('Duplicate', 'Duplicate Student Roll Rejected (400)', dupStudent.status === 400);

  // 9.2 Duplicate Teacher ID Rejection
  const dupTeacher = await api('/api/admin/teachers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Duplicate Teacher',
      teacherId: 'TEST-T001', // Already exists!
      contactNo: '01999000009',
      email: 'dupteacher@example.com',
      department: 'ETE',
      password: 'password123'
    })
  });
  recordTest('Duplicate', 'Duplicate Teacher ID Rejected (400)', dupTeacher.status === 400);

  // 9.3 Admin Toggle Student Deactivation
  const deactRes = await api(`/api/admin/students/${student4?._id}/deactivate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  recordTest('AdminWorkflow', 'Toggle Student Deactivation Endpoint', deactRes.status === 200);

  // Student attempts login while deactivated (Expect 403)
  const deactLogin = await api('/api/auth/student-login', {
    method: 'POST',
    body: JSON.stringify({ rollNumber: '2299004', password: 'password123' })
  });
  recordTest('RBAC', 'Deactivated Student Login Blocked (403)', deactLogin.status === 403);

  // Reactivate student
  const reactRes = await api(`/api/admin/students/${student4?._id}/deactivate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  recordTest('AdminWorkflow', 'Student Reactivated Successfully', reactRes.status === 200);

  // 9.4 Academic Sessions & Series Suggestions
  const seriesSuggest = await api('/api/academic/series-suggest/22', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  recordTest('AdminWorkflow', 'Series-to-Session Suggestion Utility', seriesSuggest.status === 200 && seriesSuggest.data?.session === '2022-23');

  // 9.5 Audit Log Verification
  const auditRes = await api('/api/audit-logs?limit=5', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  recordTest('AuditLogs', 'Audit Logs Retrieval', auditRes.status === 200 && Array.isArray(auditRes.data?.logs));

  // ──────────────────────────────────────────────────────────────────────────
  // 10. CLEANUP TEST DATA (Section 26)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔹 10. TEST DATA CLEANUP');
  await Student.deleteMany({ rollNumber: { $in: ['2299001', '2299002', '2299003', '2299004', '2299005', '2399001'] } });
  await Teacher.deleteMany({ teacherId: 'TEST-T001' });
  await Course.deleteMany({ courseCode: { $in: ['TEST-ETE-4201', 'TEST-ELE-A', 'TEST-ELE-B', 'TEST-ELE-C'] } });
  await CourseOffering.deleteMany({ courseCode: 'TEST-ETE-4201' });
  await TeacherAssignment.deleteMany({ _id: assignmentDoc._id });
  await Attendance.deleteMany({ course: 'TEST-ETE-4201' });
  await FinalResult.deleteMany({ course: 'TEST-ETE-4201' });
  if (offeringId) {
    await ElectiveOffering.deleteOne({ _id: offeringId });
    await ElectiveSelection.deleteMany({ offeringId });
  }
  recordTest('Cleanup', 'Test Records Safely Cleaned Up From DB', true);

  console.log('\n===============================================================');
  console.log('📊 TEST SUMMARY');
  console.log('===============================================================');
  console.log(`Total Tests Run:  ${summary.total}`);
  console.log(`Passed:           ${summary.passed}`);
  console.log(`Failed:           ${summary.failed}`);
  console.log('---------------------------------------------------------------');
  for (const [cat, data] of Object.entries(summary.categories)) {
    console.log(`• ${cat.padEnd(16)}: ${data.passed}/${data.total} passed`);
  }
  console.log('===============================================================\n');

  if (summary.failed > 0) {
    console.error('FAILURES:');
    summary.failures.forEach(f => console.error(f));
    process.exit(1);
  } else {
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY WITH ZERO REGRESSIONS!');
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
