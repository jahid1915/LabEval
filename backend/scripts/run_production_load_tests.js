/**
 * Production Load Testing & Concurrency Benchmark Suite for LabEval
 * Tests real endpoints against running server (http://127.0.0.1:5000)
 * Scenarios:
 *   A. Concurrent Authentication (Login)
 *   B. Student Dashboard Throughput (/api/student/courses, /api/student/profile)
 *   C. Teacher Workload & Grade Operations
 *   D. Super Admin Hierarchical Navigation (/api/admin/faculties-summary, /api/admin/departments/ETE/overview)
 *   E. Multi-tier Progressive Concurrency (100, 250, 500, 1000, 2000, 3000, 4000)
 */

const http = require('http');

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 5000,
  maxFreeSockets: 1000,
  timeout: 30000
});

function httpRequest(options, body) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request({ ...options, agent }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - start;
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (_) { parsed = data; }
        resolve({
          status: res.statusCode,
          duration,
          data: parsed,
          headers: res.headers,
          error: null
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        status: 0,
        duration: Date.now() - start,
        data: null,
        error: err.message
      });
    });

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function calculatePercentiles(latencies) {
  if (latencies.length === 0) return { mean: 0, p50: 0, p95: 0, p99: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = Math.round(sum / sorted.length);
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];
  return { mean, p50, p95, p99 };
}

async function runBenchmark(name, totalRequests, concurrency, requestGenerator) {
  console.log(`\n===============================================================`);
  console.log(`🚀 Benchmarking: ${name}`);
  console.log(`   Requests: ${totalRequests} | Concurrency: ${concurrency}`);
  console.log(`===============================================================`);

  const latencies = [];
  let successful = 0;
  let failed = 0;
  let inFlight = 0;
  let sent = 0;
  let completed = 0;

  const startTime = Date.now();

  return new Promise((resolve) => {
    function launchNext() {
      while (inFlight < concurrency && sent < totalRequests) {
        sent++;
        inFlight++;
        const currentReq = sent;

        const { options, body } = requestGenerator(currentReq);

        httpRequest(options, body).then(res => {
          inFlight--;
          completed++;
          latencies.push(res.duration);

          if (res.status >= 200 && res.status < 400) {
            successful++;
          } else {
            failed++;
          }

          if (completed === totalRequests) {
            const totalDurationSec = (Date.now() - startTime) / 1000;
            const rps = Math.round(totalRequests / (totalDurationSec || 1));
            const metrics = calculatePercentiles(latencies);
            const mem = process.memoryUsage();

            console.log(`📊 Results for ${name}:`);
            console.log(`   Completed:   ${completed}/${totalRequests} (${successful} succeeded, ${failed} failed)`);
            console.log(`   Throughput:  ${rps} req/sec`);
            console.log(`   Duration:    ${totalDurationSec.toFixed(2)}s`);
            console.log(`   Latency:     mean=${metrics.mean}ms | p50=${metrics.p50}ms | p95=${metrics.p95}ms | p99=${metrics.p99}ms`);
            console.log(`   Heap Used:   ${Math.round(mem.heapUsed / 1024 / 1024)} MB | RSS: ${Math.round(mem.rss / 1024 / 1024)} MB`);

            resolve({
              name,
              totalRequests,
              concurrency,
              successful,
              failed,
              errorRate: ((failed / totalRequests) * 100).toFixed(2) + '%',
              rps,
              totalDurationSec: totalDurationSec.toFixed(2),
              ...metrics,
              heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024)
            });
          } else {
            launchNext();
          }
        });
      }
    }

    launchNext();
  });
}

async function run() {
  console.log('🏁 Starting LabEval Production Load & Concurrency Benchmark Suite');
  const results = [];

  // 1. Authenticate Admin and Teachers for token reuse
  console.log('\n[Setup] Authenticating test accounts for benchmark authorization tokens...');
  const adminLogin = await httpRequest({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: 'ADMIN', password: 'admin123' });

  const adminToken = adminLogin.data?.token;
  if (!adminToken) {
    console.error('❌ Failed to obtain admin token for load test');
    process.exit(1);
  }

  // Pre-login a sample of students for token pool
  const studentTokens = [];
  const seriesList = ['20', '21', '22', '23'];
  for (let i = 1; i <= 20; i++) {
    const series = seriesList[i % seriesList.length];
    const roll = `${series}${String(i).padStart(5, '0')}`;
    const sLogin = await httpRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { identifier: roll, password: 'Student@123' });

    if (sLogin.data?.token) studentTokens.push(sLogin.data.token);
  }
  console.log(`✓ Obtained ${studentTokens.length} active authenticated student tokens for high-concurrency simulation`);

  // ── SCENARIO A: Concurrent Authentication (Login Burst) ──────────────────────
  const resA = await runBenchmark('Scenario A: Concurrent Login Burst', 500, 100, (i) => {
    const idx = (i % 100) + 1;
    const series = seriesList[idx % seriesList.length];
    const roll = `${series}${String(idx).padStart(5, '0')}`;
    return {
      options: {
        hostname: '127.0.0.1',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      body: { identifier: roll, password: 'Student@123' }
    };
  });
  results.push(resA);

  // ── SCENARIO B: Student Dashboard Throughput ─────────────────────────────────
  const resB = await runBenchmark('Scenario B: Student Dashboard Courses & Profile', 1000, 250, (i) => {
    const token = studentTokens[i % studentTokens.length] || adminToken;
    const path = i % 2 === 0 ? '/api/student/courses' : '/api/auth/me';
    return {
      options: {
        hostname: '127.0.0.1',
        port: 5000,
        path,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    };
  });
  results.push(resB);

  // ── SCENARIO C: Super Admin Hierarchical Navigation ──────────────────────────
  const resC = await runBenchmark('Scenario C: Super Admin Hierarchy Navigation', 1000, 250, (i) => {
    const endpoints = [
      '/api/admin/faculties-summary',
      '/api/admin/departments/ETE/overview',
      '/api/admin/teaching-assignments/current?page=1&limit=20',
      '/api/admin/system-settings'
    ];
    return {
      options: {
        hostname: '127.0.0.1',
        port: 5000,
        path: endpoints[i % endpoints.length],
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      }
    };
  });
  results.push(resC);

  // Pre-login a teacher for teacher workload scenarios
  let teacherToken = null;
  const tLogin = await httpRequest({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: 'T-BENCH-999', password: 'Teacher@123' });

  if (tLogin.data?.token) {
    teacherToken = tLogin.data.token;
  } else {
    await httpRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/admin/teachers',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
    }, {
      name: 'Benchmark Teacher',
      teacherId: 'T-BENCH-999',
      department: 'ETE',
      designation: 'Associate Professor',
      contactNo: '01700999999',
      password: 'Teacher@123'
    });
    const tRetry = await httpRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { identifier: 'T-BENCH-999', password: 'Teacher@123' });
    teacherToken = tRetry.data?.token;
  }
  console.log('✓ Obtained authenticated teacher token for teacher workload scenarios');

  // ── SCENARIO D: Teacher Workload & Roster Lookups ─────────────────────────────
  const resD = await runBenchmark('Scenario D: Teacher Course Rosters & Workload', 1000, 250, (i) => {
    const path = i % 2 === 0 ? '/api/teacher/courses' : '/api/teacher/students/any?department=ETE&series=22';
    return {
      options: {
        hostname: '127.0.0.1',
        port: 5000,
        path,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      }
    };
  });
  results.push(resD);

  // ── SCENARIO E: Multi-tier Progressive Concurrency (100 -> 500 -> 1000 -> 2000 -> 3000 -> 4000)
  const concurrencyLevels = [100, 500, 1000, 2000, 3000, 4000];
  for (const c of concurrencyLevels) {
    const total = Math.max(c, 1000);
    const resProg = await runBenchmark(`Scenario E: Mixed Traffic at Concurrency ${c}`, total, c, (i) => {
      const requestConfigs = [
        { path: '/api/student/courses', token: studentTokens[i % studentTokens.length] },
        { path: '/api/auth/me', token: studentTokens[i % studentTokens.length] },
        { path: '/api/teacher/courses', token: teacherToken },
        { path: '/api/admin/faculties-summary', token: adminToken },
        { path: '/api/admin/teaching-assignments/current?page=1&limit=20', token: adminToken },
        { path: '/api/health', token: null }
      ];
      const cfg = requestConfigs[i % requestConfigs.length];
      const headers = {};
      if (cfg.token) headers['Authorization'] = `Bearer ${cfg.token}`;
      return {
        options: {
          hostname: '127.0.0.1',
          port: 5000,
          path: cfg.path,
          method: 'GET',
          headers
        }
      };
    });
    results.push(resProg);
  }

  // ── FINAL SUMMARY REPORT ─────────────────────────────────────────────────────
  console.log('\n========================================================================================');
  console.log('🏆 LABEVAL HIGH-CONCURRENCY PRODUCTION PERFORMANCE BENCHMARK REPORT');
  console.log('========================================================================================');
  console.table(results.map(r => ({
    'Test Scenario': r.name,
    'Reqs': r.totalRequests,
    'Concurrency': r.concurrency,
    'Throughput (req/s)': r.rps,
    'Mean Latency': `${r.mean}ms`,
    'p50': `${r.p50}ms`,
    'p95': `${r.p95}ms`,
    'p99': `${r.p99}ms`,
    'Error Rate': r.errorRate
  })));

  console.log('\n✅ All load test scenarios completed.');
  process.exit(0);
}

run().catch(err => {
  console.error('Load testing error:', err);
  process.exit(1);
});
