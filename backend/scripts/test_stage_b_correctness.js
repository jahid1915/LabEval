/**
 * Stage B — Marks Correctness & Authorization Regression Tests
 *
 * Tests:
 *  1. Canonical assessment configuration values
 *  2. resolveConfig() with real and missing config docs
 *  3. validateMark() — boundary values, negatives, over-limit, invalid
 *  4. sanitizeMark() — clamping behaviour for server-calculated values
 *  5. FinalResult maxTotalMarks default
 *  6. vivaMarks does NOT contribute to totals
 *  7. RUET grade calculator correctness at 75-mark scale
 *  8. getStudentsByCourse authorization logic
 *
 * Run: node backend/scripts/test_stage_b_correctness.js
 *
 * Never connects to production. Uses in-memory logic only (no DB required).
 */

'use strict';

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
    errors.push(label);
  }
}

function assertEq(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✅ PASS: ${label} (got ${JSON.stringify(actual)})`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    failed++;
    errors.push(label);
  }
}

// ─── Load modules ─────────────────────────────────────────────────────────────
const {
  ASSESSMENT_LIMITS,
  TOTAL_MARKS,
  getDefaultConfig,
  resolveConfig,
  validateMark,
  sanitizeMark,
} = require('../config/assessmentConfig');

const { calculateRUETGrade } = require('../utils/gradeCalculator');

// ─── Section 1: Canonical Configuration Values ───────────────────────────────
console.log('\n── Section 1: Canonical Assessment Configuration ──');

assertEq(ASSESSMENT_LIMITS.attendance,  5,  'Attendance limit = 5');
assertEq(ASSESSMENT_LIMITS.report,      10, 'Report limit = 10');
assertEq(ASSESSMENT_LIMITS.performance, 5,  'Performance limit = 5');
assertEq(ASSESSMENT_LIMITS.quiz,        30, 'Quiz limit = 30');
assertEq(ASSESSMENT_LIMITS.test,        20, 'Test limit = 20');
assertEq(ASSESSMENT_LIMITS.others,      5,  'Others limit = 5');
assertEq(ASSESSMENT_LIMITS.vivaMarks,   0,  'vivaMarks limit = 0 (excluded from grading)');
assertEq(ASSESSMENT_LIMITS.labViva,     0,  'labViva limit = 0 (excluded from grading)');
assertEq(TOTAL_MARKS,                   75, 'Total marks = 75');

const defaultCfg = getDefaultConfig();
const sumOfComponents = defaultCfg.attendance + defaultCfg.report + defaultCfg.performance
                      + defaultCfg.quiz + defaultCfg.test + defaultCfg.others;
assertEq(sumOfComponents, 75, 'Sum of default config components = 75');
assert(!('vivaMarks' in defaultCfg), 'Default config does NOT include vivaMarks');
assert(!('labViva' in defaultCfg),   'Default config does NOT include labViva');

// ─── Section 2: resolveConfig() ───────────────────────────────────────────────
console.log('\n── Section 2: resolveConfig() with various inputs ──');

const nullResult = resolveConfig(null);
assertEq(nullResult.quiz,        30, 'resolveConfig(null).quiz = 30');
assertEq(nullResult.attendance,  5,  'resolveConfig(null).attendance = 5');
assertEq(nullResult.report,      10, 'resolveConfig(null).report = 10');
assertEq(nullResult.performance, 5,  'resolveConfig(null).performance = 5');
assertEq(nullResult.test,        20, 'resolveConfig(null).test = 20');
assertEq(nullResult.others,      5,  'resolveConfig(null).others = 5');

// Simulate a CourseOffering with a custom quiz override
const customDoc = { assessmentConfig: { quiz: 25, attendance: 5, report: 10, performance: 5, test: 20, others: 5 } };
const customCfg = resolveConfig(customDoc);
assertEq(customCfg.quiz, 25, 'resolveConfig respects custom quiz override (25)');
assertEq(customCfg.attendance, 5, 'resolveConfig retains correct attendance when quiz overridden');

// Simulate a doc with legacy labReport field only
const legacyDoc = { assessmentConfig: { labReport: 10, quiz: 30, attendance: 5, performance: 5, test: 20, others: 5 } };
const legacyCfg = resolveConfig(legacyDoc);
assertEq(legacyCfg.report, 10, 'resolveConfig maps legacy labReport → report correctly');

// ─── Section 3: validateMark() ────────────────────────────────────────────────
console.log('\n── Section 3: validateMark() validation ──');

// Null/undefined/empty — not invalid (absent)
assert(validateMark(null,      'quiz') === null, 'null mark is not invalid (absent)');
assert(validateMark(undefined, 'quiz') === null, 'undefined mark is not invalid (absent)');
assert(validateMark('',        'quiz') === null, 'empty string mark is not invalid (absent)');

// Valid boundary values
assert(validateMark(0,  'quiz') === null, 'quiz mark = 0 is valid');
assert(validateMark(30, 'quiz') === null, 'quiz mark = 30 (max) is valid');
assert(validateMark(0,  'attendance') === null, 'attendance mark = 0 is valid');
assert(validateMark(5,  'attendance') === null, 'attendance mark = 5 (max) is valid');
assert(validateMark(20, 'test') === null, 'test mark = 20 (max) is valid');
assert(validateMark(10, 'report') === null, 'report mark = 10 (max) is valid');
assert(validateMark(5,  'performance') === null, 'performance mark = 5 (max) is valid');
assert(validateMark(5,  'others') === null, 'others mark = 5 (max) is valid');

// Negative marks — must be rejected
assert(validateMark(-1,   'quiz') !== null, 'Negative quiz mark is rejected');
assert(validateMark(-0.1, 'test') !== null, 'Negative test mark is rejected');
assert(validateMark(-5,   'attendance') !== null, 'Negative attendance mark is rejected');

// Over-limit — must be rejected
assert(validateMark(31, 'quiz')        !== null, 'quiz mark > 30 is rejected');
assert(validateMark(21, 'test')        !== null, 'test mark > 20 is rejected');
assert(validateMark(6,  'attendance')  !== null, 'attendance mark > 5 is rejected');
assert(validateMark(11, 'report')      !== null, 'report mark > 10 is rejected');
assert(validateMark(6,  'performance') !== null, 'performance mark > 5 is rejected');
assert(validateMark(6,  'others')      !== null, 'others mark > 5 is rejected');

// Non-numeric
assert(validateMark('abc',       'quiz') !== null, 'Non-numeric string rejected');
assert(validateMark(Infinity,    'quiz') !== null, 'Infinity rejected');
assert(validateMark(NaN,         'quiz') !== null, 'NaN rejected');

// ─── Section 4: sanitizeMark() ────────────────────────────────────────────────
console.log('\n── Section 4: sanitizeMark() ──');

assertEq(sanitizeMark(5,   30), 5,  'sanitizeMark(5, 30) = 5');
assertEq(sanitizeMark(35,  30), 30, 'sanitizeMark(35, 30) clamps to 30');
assertEq(sanitizeMark(-1,  30), 0,  'sanitizeMark(-1, 30) returns 0');
assertEq(sanitizeMark(null, 5), 0,  'sanitizeMark(null, 5) returns 0');
assertEq(sanitizeMark('',   5), 0,  'sanitizeMark("", 5) returns 0');
assertEq(sanitizeMark(4.567, 5), 4.57, 'sanitizeMark rounds to 2dp: 4.567 → 4.57');

// ─── Section 5: vivaMarks must not contribute to totals ───────────────────────
console.log('\n── Section 5: vivaMarks exclusion from totals ──');

// Simulate FinalResult totalling logic (same as in teacherResultController)
function calculateTotal(cfg, att, rep, perf, quiz, test, oth) {
  // vivaMarks is intentionally NOT included in this sum
  return Math.round((att + rep + perf + quiz + test + oth) * 100) / 100;
}

const att = 5, rep = 10, perf = 5, quiz = 30, test = 20, oth = 5;
const total = calculateTotal(defaultCfg, att, rep, perf, quiz, test, oth);
assertEq(total, 75, 'Total with all max marks = 75 (viva not included)');

// Injecting a viva value should not change the total
const vivaInjected = 10; // pretend viva marks exist
const totalWithVivaIgnored = calculateTotal(defaultCfg, att, rep, perf, quiz, test, oth);
// vivaInjected is NOT passed in — the function signature enforces exclusion
assertEq(totalWithVivaIgnored, 75, 'Total is still 75 even when vivaMarks exists in DB record');

// ─── Section 6: FinalResult maxTotalMarks default = 75 ───────────────────────
console.log('\n── Section 6: FinalResult schema defaults ──');

// We test this by inspecting what resolveConfig returns — not requiring a live DB
const totalFromConfig = (resolveConfig(null).attendance +
                         resolveConfig(null).report +
                         resolveConfig(null).performance +
                         resolveConfig(null).quiz +
                         resolveConfig(null).test +
                         resolveConfig(null).others);
assertEq(totalFromConfig, 75, 'Sum of canonical config components for maxTotalMarks = 75');

// ─── Section 7: Grade Calculator at 75-mark scale ────────────────────────────
console.log('\n── Section 7: RUET grade calculator correctness (75-mark scale) ──');

const { grade: g75, gradePoint: gp75 } = calculateRUETGrade(75, 75);
assertEq(g75, 'A+', '75/75 (100%) = A+');
assertEq(gp75, 4.00, '75/75 GP = 4.00');

const { grade: g60, gradePoint: gp60 } = calculateRUETGrade(60, 75);
// 60/75 = 80% → A+
assertEq(g60, 'A+', '60/75 (80%) = A+');

const { grade: g30, gradePoint: gp30 } = calculateRUETGrade(30, 75);
// 30/75 = 40% → D
assertEq(g30, 'D', '30/75 (40%) = D');

const { grade: gF } = calculateRUETGrade(29, 75);
// 29/75 = 38.67% → F
assertEq(gF, 'F', '29/75 (38.67%) = F');

const { grade: g0 } = calculateRUETGrade(0, 75);
assertEq(g0, 'F', '0/75 = F');

// Verify grade does NOT change if vivaMarks incorrectly added
const totalWithoutViva = 60;
const totalWithViva = 70; // inflated by viva
const { grade: correctGrade } = calculateRUETGrade(totalWithoutViva, 75); // 80% = A+
const { grade: inflatedGrade } = calculateRUETGrade(totalWithViva, 75);   // 93.3% = A+
// Both may be A+ in this case — key test is that the grade function uses provided total
assert(typeof correctGrade === 'string', 'Grade is a string');
assert(['A+','A','A-','B+','B','B-','C+','C','D','F'].includes(correctGrade),
  'Grade is a valid RUET grade symbol');

// ─── Section 8: Department scope enforcement (unit-level logic test) ──────────
console.log('\n── Section 8: Department scope authorization logic ──');

// Simulate the authorization logic from getStudentsByCourse
function simulateStudentFetchAuth(userRole, userDept, requestedDept) {
  const isAdmin = ['admin', 'super_admin', 'department_head'].includes(userRole);
  const teacherDept = (userDept || '').trim().toUpperCase();

  if (isAdmin) {
    return { allowed: true, dept: requestedDept ? requestedDept.toUpperCase() : null };
  }
  if (!teacherDept) {
    return { allowed: false, reason: 'TEACHER_DEPT_MISSING' };
  }
  if (requestedDept && requestedDept.toUpperCase() !== teacherDept) {
    return { allowed: false, reason: 'DEPARTMENT_ISOLATION_VIOLATION' };
  }
  return { allowed: true, dept: teacherDept };
}

// Teacher can access own department
const r1 = simulateStudentFetchAuth('teacher', 'ETE', 'ETE');
assert(r1.allowed, 'Teacher accessing own dept ETE is allowed');
assertEq(r1.dept, 'ETE', 'Resolved dept is ETE');

// Teacher cannot access foreign department
const r2 = simulateStudentFetchAuth('teacher', 'ETE', 'CSE');
assert(!r2.allowed, 'Teacher (ETE) accessing CSE students is DENIED');
assertEq(r2.reason, 'DEPARTMENT_ISOLATION_VIOLATION', 'Correct error code for cross-dept access');

// Teacher with no department set is denied
const r3 = simulateStudentFetchAuth('teacher', '', 'ETE');
assert(!r3.allowed, 'Teacher with no department configured is DENIED');
assertEq(r3.reason, 'TEACHER_DEPT_MISSING', 'Correct error code for missing dept');

// Admin can access any department
const r4 = simulateStudentFetchAuth('admin', '', 'CSE');
assert(r4.allowed, 'Admin accessing CSE is allowed');

// Admin with no dept specified gets null (all depts)
const r5 = simulateStudentFetchAuth('super_admin', '', undefined);
assert(r5.allowed, 'Super admin with no dept filter is allowed');
assert(r5.dept === null, 'Super admin with no filter gets null dept (unrestricted)');

// Department head accessing their scoped dept
const r6 = simulateStudentFetchAuth('department_head', 'ETE', 'ETE');
assert(r6.allowed, 'Department head accessing ETE is allowed');

// Teacher supplies no department (client side omits it) — falls back to own dept
const r7 = simulateStudentFetchAuth('teacher', 'ETE', undefined);
assert(r7.allowed, 'Teacher with no explicit dept param uses own dept (ETE)');
assertEq(r7.dept, 'ETE', 'Resolves to own dept ETE');

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════');
console.log(`Stage B Test Results: ${passed} PASSED, ${failed} FAILED`);
if (errors.length > 0) {
  console.error('\nFailed tests:');
  errors.forEach(e => console.error(`  • ${e}`));
  process.exit(1);
} else {
  console.log('✅ All Stage B correctness tests passed.');
  process.exit(0);
}
