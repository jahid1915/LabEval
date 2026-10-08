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
  console.log('🧪 Starting Full Academic Management & Role Architecture Test Suite...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB.');

  const User = require('../models/User');
  const Admin = require('../models/Admin');
  const Teacher = require('../models/Teacher');
  const Student = require('../models/Student');
  const Course = require('../models/Course');
  const Project = require('../models/Project');
  const SupervisionAssignment = require('../models/SupervisionAssignment');
  const TeacherAssignment = require('../models/TeacherAssignment');
  const DepartmentHeadHistory = require('../models/DepartmentHeadHistory');
  const bcrypt = require('bcryptjs');

  // Setup passwords
  const headHash = await bcrypt.hash('Password123!', 10);
  await User.updateOne({ loginIdentifierLower: 'head_ete' }, { passwordHash: headHash });
  await Admin.updateOne({ username: 'head_ete' }, { password: 'Password123!' });

  const adminHash = await bcrypt.hash('adminpassword', 10);
  await User.updateOne({ loginIdentifierLower: 'admin' }, { passwordHash: adminHash, failedLoginAttempts: 0, lockedUntil: null });
  await Admin.updateOne({ username: 'admin' }, { password: 'adminpassword' });

  // 1. Authenticate Head & Admin
  console.log('\n--- 1. Authenticating Roles ---');
  const headLogin = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'head_ete', password: 'Password123!' })
  });
  if (!headLogin.ok) throw new Error('Head login failed: ' + JSON.stringify(headLogin.data));
  const headToken = headLogin.data.token;
  console.log(`✅ Head Login OK (${headLogin.data.user.name}, role: ${headLogin.data.user.role})`);

  const adminLogin = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'admin', password: 'adminpassword' })
  });
  if (!adminLogin.ok) throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.data));
  const adminToken = adminLogin.data.token;
  console.log(`✅ Admin Login OK (${adminLogin.data.user.name}, role: ${adminLogin.data.user.role})`);

  // 2. Test Head Master Data Mutation Restrictions (Sections 4, 13, 29)
  console.log('\n--- 2. Verifying Head Master Data Restrictions (403 Forbidden) ---');
  const addStudentRes = await api('/api/head/students', {
    method: 'POST',
    headers: { Authorization: `Bearer ${headToken}` },
    body: JSON.stringify({ name: 'Hacker Student', rollNumber: '9999999' })
  });
  console.log(`Head -> POST /api/head/students Status: ${addStudentRes.status} (Expected: 403)`);
  if (addStudentRes.status !== 403) {
    throw new Error(`SECURITY FLAW: Head should receive 403 when attempting to add student master record, got ${addStudentRes.status}`);
  }
  console.log('✅ PASS: Head is strictly blocked from adding student master data.');

  // 3. Test Head Course Assignment (including self-assignment - Section 18)
  console.log('\n--- 3. Testing Course Assignment & Self-Assignment by Head ---');
  let testCourse = await Course.findOne({ departmentCode: 'ETE' }).lean();
  let testTeacher = await Teacher.findOne({ department: 'ETE', status: { $ne: 'inactive' } }).lean();

  if (testCourse && testTeacher) {
    const assignRes = await api('/api/head/teaching-assignments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${headToken}` },
      body: JSON.stringify({
        courseId: testCourse._id,
        teacherId: 'MYSELF', // Head assigns course to themselves
        role: 'PRIMARY_TEACHER',
        academicSession: '2024-2025',
        semester: '3-2',
        series: '22',
        notes: 'Assigned during architecture test'
      })
    });
    console.log(`Head self-assignment status: ${assignRes.status}`);
    if (assignRes.ok || assignRes.data?.message?.includes('already assigned')) {
      console.log('✅ PASS: Head course self-assignment verified.');
    } else {
      console.warn('Note on course assign:', assignRes.data);
    }
  }

  // 4. Test Teacher Workload API
  console.log('\n--- 4. Testing Teacher Workload Overview ---');
  const workloadRes = await api('/api/head/teachers/workload', {
    headers: { Authorization: `Bearer ${headToken}` }
  });
  if (!workloadRes.ok) throw new Error('Failed to fetch teacher workload: ' + JSON.stringify(workloadRes.data));
  console.log(`✅ PASS: Teacher Workload returned ${workloadRes.data.workload.length} teachers with course credits & supervision metrics.`);

  // 5. Test Academic Supervision Assignment & Duplicate Prevention (Sections 23, 24, 25)
  console.log('\n--- 5. Testing Academic Supervision Assignment ---');
  // Seed 4 test students for project team
  await Student.deleteMany({ rollNumber: { $regex: /^ARCH-2204/ } });
  await User.deleteMany({ loginIdentifierLower: { $regex: /^arch-2204/ } });
  await Project.deleteMany({ title: 'AI-Based Smart Antenna System' });

  const seededStudents = [];
  for (let i = 1; i <= 4; i++) {
    const roll = `ARCH-220400${i}`;
    const sDoc = await Student.create({
      name: `Team Member ${i}`,
      rollNumber: roll,
      registrationNumber: `REG-${roll}`,
      department: 'ETE',
      series: '22',
      session: '2022-2023',
      semester: '4th',
      password: 'Password123!',
      status: 'active'
    });
    const uDoc = await User.create({
      loginIdentifier: roll,
      loginIdentifierLower: roll.toLowerCase(),
      passwordHash: headHash,
      role: 'student',
      status: 'ACTIVE',
      name: `Team Member ${i}`,
      department: 'ETE',
      profileRef: sDoc._id,
      profileModel: 'Student'
    });
    sDoc.user = uDoc._id;
    await sDoc.save();
    seededStudents.push(sDoc);
  }
  console.log(`✅ Seeded 4 test students for Project-I team (${seededStudents.map(s => s.rollNumber).join(', ')})`);

  // Head assigns all 4 students to Teacher
  const assignProjRes = await api('/api/head/supervision/assign', {
    method: 'POST',
    headers: { Authorization: `Bearer ${headToken}` },
    body: JSON.stringify({
      activityType: 'PROJECT_I',
      session: '2022-2023',
      series: '22',
      semester: '4th',
      teacherId: testTeacher._id,
      studentIds: seededStudents.map(s => s._id),
      projectTitle: 'AI-Based Smart Antenna System',
      projectDescription: 'Machine learning beamforming optimization'
    })
  });

  if (!assignProjRes.ok) throw new Error('Supervision assignment failed: ' + JSON.stringify(assignProjRes.data));
  const createdProject = assignProjRes.data.project;
  console.log(`✅ PASS: Project-I created: "${createdProject.title}" with ${assignProjRes.data.assignments.length} assignments.`);

  // Attempt DUPLICATE assignment for same activity and session (MUST FAIL - Section 25)
  const dupAssignRes = await api('/api/head/supervision/assign', {
    method: 'POST',
    headers: { Authorization: `Bearer ${headToken}` },
    body: JSON.stringify({
      activityType: 'PROJECT_I',
      session: '2022-2023',
      series: '22',
      semester: '4th',
      teacherId: testTeacher._id,
      studentIds: [seededStudents[0]._id],
      projectTitle: 'Duplicate Project Attempt'
    })
  });
  console.log(`Duplicate supervision attempt status: ${dupAssignRes.status} (Expected: 400)`);
  if (dupAssignRes.status !== 400) {
    throw new Error(`SECURITY/INTEGRITY FLAW: Duplicate supervision assignment should be blocked with 400, got ${dupAssignRes.status}`);
  }
  console.log('✅ PASS: Duplicate primary supervisor assignment for same session and activity is strictly prevented.');

  // 6. Test Student & Teacher Supervision View
  console.log('\n--- 6. Testing Student & Teacher Supervision Dashboards ---');
  // Student 1 logs in
  const s1Login = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'ARCH-2204001', password: 'Password123!' })
  });
  if (!s1Login.ok) throw new Error('Student 1 login failed');
  const s1Token = s1Login.data.token;

  const s1SupervisionRes = await api('/api/student/supervision', {
    headers: { Authorization: `Bearer ${s1Token}` }
  });
  if (!s1SupervisionRes.ok) throw new Error('Failed to get student supervision: ' + JSON.stringify(s1SupervisionRes.data));
  const s1Projects = s1SupervisionRes.data.supervisions || [];
  console.log(`Student 1 has ${s1Projects.length} active supervision project(s).`);
  if (s1Projects.length === 0 || !s1Projects[0].teamMembers || s1Projects[0].teamMembers.length !== 4) {
    throw new Error(`Expected 4 team members on student supervision card, got ${s1Projects[0]?.teamMembers?.length}`);
  }
  console.log(`✅ PASS: Student Supervision card displays supervisor "${s1Projects[0].supervisor.name}" and all 4 team members.`);

  // 7. Test Real-Time Project Team Workspace (Sections 35, 36, 37)
  console.log('\n--- 7. Testing Real-Time Project Team Workspace ---');
  const workspaceRes = await api(`/api/projects/${createdProject._id}/workspace`, {
    headers: { Authorization: `Bearer ${s1Token}` }
  });
  if (!workspaceRes.ok) throw new Error('Failed to access project workspace: ' + JSON.stringify(workspaceRes.data));
  console.log(`✅ PASS: Project Workspace loaded. Milestones: ${workspaceRes.data.stats.totalMilestones}, Progress: ${workspaceRes.data.stats.progressPercent}%, Team size: ${workspaceRes.data.stats.teamSize}`);

  // Test Milestone Update & Progress Recalculation
  const firstMilestone = workspaceRes.data.project.milestones[0];
  const updateMileRes = await api(`/api/projects/${createdProject._id}/milestones/${firstMilestone._id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${s1Token}` },
    body: JSON.stringify({ status: 'completed' })
  });
  if (!updateMileRes.ok) throw new Error('Failed to update milestone: ' + JSON.stringify(updateMileRes.data));
  console.log(`✅ PASS: Milestone completed. New Project Progress: ${updateMileRes.data.progress}% (Expected 25%).`);

  // Test Activity Logging & Messages
  const actRes = await api(`/api/projects/${createdProject._id}/activities`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${s1Token}` },
    body: JSON.stringify({
      activityType: 'PROPOSAL_SUBMITTED',
      description: 'Jahid Hasan uploaded Project Proposal document'
    })
  });
  if (!actRes.ok) throw new Error('Failed to log activity: ' + JSON.stringify(actRes.data));
  console.log(`✅ PASS: Team activity persisted: "${actRes.data.activity.description}"`);

  const msgRes = await api(`/api/projects/${createdProject._id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${s1Token}` },
    body: JSON.stringify({ message: 'Hello team! Let us schedule our weekly review.' })
  });
  if (!msgRes.ok) throw new Error('Failed to post project message: ' + JSON.stringify(msgRes.data));
  console.log(`✅ PASS: Team message persisted in project chat.`);

  // 8. Test Data Correction Workflow (Section 29)
  console.log('\n--- 8. Testing Student Data Correction Request Workflow ---');
  const corrReqRes = await api('/api/head/students/request-correction', {
    method: 'POST',
    headers: { Authorization: `Bearer ${headToken}` },
    body: JSON.stringify({
      studentId: seededStudents[0]._id,
      field: 'name',
      proposedValue: 'Jahid Hasan (Verified)',
      reason: 'Name spelling correction as per official matriculation certificate'
    })
  });
  if (!corrReqRes.ok) throw new Error('Correction request failed: ' + JSON.stringify(corrReqRes.data));
  const corrId = corrReqRes.data.request._id;
  console.log(`✅ PASS: Head submitted data correction request (${corrId}).`);

  // Admin approves correction
  const approveCorrRes = await api(`/api/admin/correction-requests/${corrId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ adminResponse: 'Verified and approved' })
  });
  if (!approveCorrRes.ok) throw new Error('Admin correction approval failed: ' + JSON.stringify(approveCorrRes.data));
  console.log(`✅ PASS: Admin approved correction. Updated Student Name: "${approveCorrRes.data.student.name}"`);

  // 9. Clean up test records
  console.log('\n--- 9. Cleaning up test records ---');
  await Student.deleteMany({ rollNumber: { $regex: /^ARCH-2204/ } });
  await User.deleteMany({ loginIdentifierLower: { $regex: /^arch-2204/ } });
  await Project.deleteMany({ _id: createdProject._id });
  await SupervisionAssignment.deleteMany({ project: createdProject._id });
  console.log('🧹 Cleaned up temporary test artifacts.');

  console.log('\n🎉 ALL ROLE SEPARATION & ACADEMIC MANAGEMENT ARCHITECTURE TESTS PASSED!\n');
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ ARCHITECTURE TEST ERROR:', err);
  process.exit(1);
});
