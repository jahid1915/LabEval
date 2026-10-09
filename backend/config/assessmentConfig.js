/**
 * LabEval — Canonical Assessment Configuration
 *
 * This is the single authoritative source of truth for the RUET lab
 * assessment grading structure. Every controller, model, validator,
 * export, and dashboard MUST derive its limits and defaults from here.
 *
 * Official totals (per LabEval specification):
 *   Attendance   5
 *   Reports     10
 *   Performance  5
 *   Quizzes     30
 *   Tests       20
 *   Others       5
 *   ─────────────
 *   Total       75
 *
 * Board viva is EXCLUDED from the grading structure.
 */

'use strict';

/**
 * Canonical marks limits for each assessment component.
 * All controllers, routes, and models must use these values.
 * @type {Readonly<Record<string, number>>}
 */
const ASSESSMENT_LIMITS = Object.freeze({
  attendance:  5,
  report:      10,
  performance: 5,
  quiz:        30,
  test:        20,
  others:      5,
  // Excluded components — kept at 0 for backward compatibility with
  // legacy FinalResult documents that may store these fields.
  vivaMarks:   0,
  labViva:     0,
  openEnded:   0,
});

/**
 * The sum of all active assessment components.
 * This is the authoritative total for grade scaling.
 */
const TOTAL_MARKS = 75;

/**
 * Returns the canonical default config object used when a CourseOffering
 * or Course does not have a custom assessmentConfig set.
 *
 * Callers should always use this function to retrieve defaults rather than
 * hard-coding numeric values.
 *
 * @returns {{ attendance: number, report: number, performance: number, quiz: number, test: number, others: number }}
 */
function getDefaultConfig() {
  return {
    attendance:  ASSESSMENT_LIMITS.attendance,
    report:      ASSESSMENT_LIMITS.report,
    performance: ASSESSMENT_LIMITS.performance,
    quiz:        ASSESSMENT_LIMITS.quiz,
    test:        ASSESSMENT_LIMITS.test,
    others:      ASSESSMENT_LIMITS.others,
  };
}

/**
 * Resolves the assessment configuration from a CourseOffering or Course document,
 * falling back to canonical defaults for any missing field.
 *
 * Handles legacy field aliases (labReport → report, labTest → test).
 *
 * @param {object|null} sourceDoc - CourseOffering or Course Mongoose document / plain object.
 * @returns {{ attendance: number, report: number, performance: number, quiz: number, test: number, others: number }}
 */
function resolveConfig(sourceDoc) {
  const ac = sourceDoc?.assessmentConfig || sourceDoc?.defaultAssessmentConfig || {};
  return {
    attendance:  safeNum(ac.attendance,  ASSESSMENT_LIMITS.attendance),
    report:      safeNum(ac.report  ?? ac.labReport, ASSESSMENT_LIMITS.report),
    performance: safeNum(ac.performance, ASSESSMENT_LIMITS.performance),
    quiz:        safeNum(ac.quiz,        ASSESSMENT_LIMITS.quiz),
    test:        safeNum(ac.test   ?? ac.labTest,    ASSESSMENT_LIMITS.test),
    others:      safeNum(ac.others,      ASSESSMENT_LIMITS.others),
  };
}

/**
 * Validates a submitted mark value against the allowed range for a component.
 * Returns the error string on failure, or null on success.
 *
 * Does NOT silently clamp — callers must reject when this returns a non-null error.
 *
 * @param {*}      value     - Submitted value (may be string, number, null, undefined).
 * @param {string} component - Component name key (e.g. 'quiz').
 * @param {object} [cfg]     - Resolved config object (from resolveConfig). Defaults to canonical limits.
 * @returns {string|null}    - Error message, or null if valid.
 */
function validateMark(value, component, cfg = getDefaultConfig()) {
  if (value === undefined || value === null || value === '') {
    return null; // Absent/not entered — not the same as invalid.
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return `Invalid marks value for ${component}: "${value}" is not a finite number.`;
  }
  if (num < 0) {
    return `Marks for ${component} cannot be negative (received ${num}).`;
  }
  const max = cfg[component] ?? ASSESSMENT_LIMITS[component];
  if (max !== undefined && num > max) {
    return `Marks for ${component} exceed the maximum allowed (${num} > ${max}).`;
  }
  return null;
}

/**
 * Sanitizes a mark to a safe number, capping it at the configured maximum.
 * This is used ONLY when applying server-calculated values (e.g. percentage-derived
 * attendance marks), NOT when processing raw teacher input.
 * For raw input, use validateMark() and reject rather than clamp.
 *
 * @param {*}      value - Raw value.
 * @param {number} max   - Maximum allowed.
 * @returns {number}
 */
function sanitizeMark(value, max) {
  if (value === undefined || value === null || value === '') return 0;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(max, Math.round(num * 100) / 100);
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function safeNum(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

module.exports = {
  ASSESSMENT_LIMITS,
  TOTAL_MARKS,
  getDefaultConfig,
  resolveConfig,
  validateMark,
  sanitizeMark,
};
