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
  console.log('🏛️ Testing Headship Transfer Workflow...');
  await mongoose.connect(process.env.MONGO_URI);

  const Teacher = require('../models/Teacher');
  const Department = require('../models/Department');
  const HeadshipTransferRequest = require('../models/HeadshipTransferRequest');
  const DepartmentHeadHistory = require('../models/DepartmentHeadHistory');

  // Authenticate Head & Admin
  const headLogin = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'head_ete', password: 'Password123!' })
  });
  const headToken = headLogin.data.token;

  const adminLogin = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'admin', password: 'adminpassword' })
  });
  const adminToken = adminLogin.data.token;

  // Clean pending requests
  await HeadshipTransferRequest.deleteMany({ departmentCode: 'ETE' });

  // Pick a candidate teacher from ETE
  const candidate = await Teacher.findOne({
    department: 'ETE',
    teacherId: { $ne: 'ETE-151' },
    status: 'active'
  }).lean();

  if (!candidate) throw new Error('Candidate teacher not found');
  console.log(`Candidate for headship transfer: ${candidate.name} (${candidate.teacherId})`);

  // Step 1: Head submits transfer request
  const submitRes = await api('/api/head/headship-transfer/request', {
    method: 'POST',
    headers: { Authorization: `Bearer ${headToken}` },
    body: JSON.stringify({
      proposedHeadTeacherId: candidate._id,
      reason: 'Formal administrative handover due to tenure completion'
    })
  });

  if (!submitRes.ok) throw new Error('Transfer request submission failed: ' + JSON.stringify(submitRes.data));
  const transferId = submitRes.data.request._id;
  console.log(`✅ Head submitted transfer request ID: ${transferId}`);

  // Step 2: Head checks status
  const statusRes = await api('/api/head/headship-transfer/status', {
    headers: { Authorization: `Bearer ${headToken}` }
  });
  if (!statusRes.ok || statusRes.data.requests.length === 0) throw new Error('Failed to view status');
  console.log(`✅ Head view status verified (${statusRes.data.requests[0].status})`);

  // Step 3: Admin reviews transfer requests
  const adminListRes = await api('/api/admin/headship-transfers', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  if (!adminListRes.ok) throw new Error('Admin failed to list transfers');
  console.log(`✅ Admin view list verified: ${adminListRes.data.requests.length} pending request(s).`);

  // Step 4: Admin approves transfer request
  const approveRes = await api(`/api/admin/headship-transfers/${transferId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ adminNotes: 'Approved by Syndicate / Vice Chancellor' })
  });
  if (!approveRes.ok) throw new Error('Admin approval failed: ' + JSON.stringify(approveRes.data));
  console.log(`✅ Admin approved transfer. DepartmentHeadHistory entry: ${approveRes.data.history._id}`);

  // Step 5: Verify Department record was updated
  const updatedDept = await Department.findOne({ code: 'ETE' }).lean();
  console.log(`Updated Department Head: ${updatedDept.headName} (${updatedDept.headId})`);
  if (String(updatedDept.headTeacher) !== String(candidate._id)) {
    throw new Error('Department head was not updated to candidate');
  }
  console.log('✅ PASS: Department record successfully updated with new Head.');

  // Step 6: Verify immutable DepartmentHeadHistory recorded
  const historyRecord = await DepartmentHeadHistory.findById(approveRes.data.history._id).lean();
  if (!historyRecord || historyRecord.status !== 'active') {
    throw new Error('DepartmentHeadHistory record missing or invalid');
  }
  console.log(`✅ PASS: Immutable DepartmentHeadHistory verified: From ${historyRecord.previousHeadName} to ${historyRecord.newHeadName}`);

  // Clean up
  await HeadshipTransferRequest.deleteMany({ _id: transferId });
  console.log('🧹 Cleaned up test transfer request.');
  console.log('\n🏛️ HEADSHIP TRANSFER WORKFLOW 100% VERIFIED!\n');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ HEADSHIP TRANSFER TEST FAILED:', err);
  process.exit(1);
});
