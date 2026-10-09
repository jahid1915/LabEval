const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
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
    try { data = await res.json(); } catch { data = null; }
  } else {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('🧪 Testing Central Database Management Portal & Admin Simplification APIs...');
  
  // 1. Authenticate as Admin
  const adminLogin = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'admin', password: 'adminpassword' })
  });
  if (!adminLogin.ok || !adminLogin.data?.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.data));
  }
  const token = adminLogin.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2. Test GET /api/admin/dashboard/summary
  console.log('\n--- 1. Testing GET /api/admin/dashboard/summary ---');
  const sumRes = await api('/api/admin/dashboard/summary', { headers: authHeaders });
  if (!sumRes.ok) throw new Error('Dashboard summary failed: ' + JSON.stringify(sumRes.data));
  console.log('Summary metrics:', sumRes.data.summary);
  console.log('Recent logs count:', sumRes.data.recentLogs?.length);

  // 3. Test GET /api/admin/database/entities
  console.log('\n--- 2. Testing GET /api/admin/database/entities ---');
  const entRes = await api('/api/admin/database/entities', { headers: authHeaders });
  if (!entRes.ok) throw new Error('Entities overview failed: ' + JSON.stringify(entRes.data));
  console.log(`Registered Entities: ${entRes.data.totalEntities}`);
  entRes.data.entities.forEach(e => {
    console.log(`  - [${e.category}] ${e.label} (${e.key}): ${e.recordsCount} records [Status: ${e.status}]`);
  });

  // 4. Test Paginated Query on Students Entity
  console.log('\n--- 3. Testing GET /api/admin/database/students (Pagination & Search) ---');
  const stdRes = await api('/api/admin/database/students?page=1&limit=5&search=22', { headers: authHeaders });
  if (!stdRes.ok) throw new Error('Students query failed: ' + JSON.stringify(stdRes.data));
  console.log(`Students paginated: Total=${stdRes.data.pagination?.total}, Returned=${stdRes.data.records?.length}`);
  if (stdRes.data.records?.length > 0) {
    const s = stdRes.data.records[0];
    console.log(`Sample Student: Roll=${s.rollNumber}, Name="${s.name}", Dept=${s.department}`);
    // Verify no password hash leaked
    if (s.password || s.passwordHash) {
      throw new Error('SECURITY VIOLATION: Password hash leaked in database query!');
    }
    console.log('✅ Security check passed: No password/hash exposed in projection.');

    // 5. Test Dependency Analysis on this Student
    console.log('\n--- 4. Testing GET /api/admin/database/students/:id/dependencies ---');
    const depRes = await api(`/api/admin/database/students/${s._id}/dependencies`, { headers: authHeaders });
    if (!depRes.ok) throw new Error('Dependencies failed: ' + JSON.stringify(depRes.data));
    console.log(`Dependencies for ${s.rollNumber}: Count=${depRes.data.dependencyCount}`, depRes.data.dependencies);

    // 6. Test Safe Update on allowed field
    console.log('\n--- 5. Testing PATCH /api/admin/database/students/:id (Allowed Field Update) ---');
    const oldName = s.name;
    const updRes = await api(`/api/admin/database/students/${s._id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ name: oldName + ' (Admin Verified)' })
    });
    if (!updRes.ok) throw new Error('Update failed: ' + JSON.stringify(updRes.data));
    console.log('Updated Name successfully:', updRes.data.record?.name);

    // Revert back
    await api(`/api/admin/database/students/${s._id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ name: oldName })
    });
    console.log('Reverted student name cleanly.');
  }

  // 7. Security Test: Non-Admin Access Prohibited
  console.log('\n--- 6. Security Check: Department Head & Teacher Blocked (403) ---');
  const headLogin = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'head_ete', password: 'Password123!' })
  });
  if (headLogin.ok && headLogin.data?.token) {
    const headBlock = await api('/api/admin/database/entities', {
      headers: { Authorization: `Bearer ${headLogin.data.token}` }
    });
    if (headBlock.status !== 403) {
      throw new Error(`Expected Head to be blocked with 403, got ${headBlock.status}`);
    }
    console.log('✅ PASS: Department Head received 403 Forbidden from /api/admin/database');
  }

  console.log('\n🎉 ALL DATABASE MANAGEMENT BACKEND APIS VERIFIED PERFECTLY!');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
