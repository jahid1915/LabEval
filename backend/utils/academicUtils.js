/**
 * Academic Utility Functions
 * Shared utilities for series→session conversion and academic date calculations
 */

/**
 * Convert a series code to academic session string.
 * Rule: XX Series → 20XX-20(XX+1) → formatted as "20XX-YY"
 * 
 * Examples:
 *   22 → "2022-23"
 *   23 → "2023-24"
 *   24 → "2024-25"
 *   25 → "2025-26"
 * 
 * @param {string|number} series - Series code (e.g. "22", "23", 24)
 * @returns {string|null} - Session string like "2022-23", or null if invalid
 */
const getSessionFromSeries = (series) => {
  if (series === null || series === undefined || series === '') return null;
  
  const num = parseInt(String(series).trim(), 10);
  if (isNaN(num) || num < 0 || num > 99) return null;
  
  const fullYear = 2000 + num;
  const nextYear = fullYear + 1;
  // Format next year as 2-digit suffix
  const nextSuffix = String(nextYear).slice(-2);
  return `${fullYear}-${nextSuffix}`;
};

/**
 * Parse a series from a session string.
 * Inverse of getSessionFromSeries.
 * 
 * Examples:
 *   "2022-23" → "22"
 *   "2023-24" → "23"
 * 
 * @param {string} session - Session string like "2022-23"
 * @returns {string|null} - Series code like "22", or null if invalid
 */
const getSeriesFromSession = (session) => {
  if (!session || typeof session !== 'string') return null;
  
  const match = session.trim().match(/^20(\d{2})-\d{2}$/);
  if (!match) return null;
  
  return match[1]; // The 2-digit year part
};

/**
 * Validate that a session string matches the expected format.
 * 
 * @param {string} session - Session string to validate
 * @returns {boolean}
 */
const isValidSession = (session) => {
  if (!session || typeof session !== 'string') return false;
  return /^20\d{2}-\d{2}$/.test(session.trim());
};

/**
 * Validate that a series string is a valid 2-digit year code.
 * 
 * @param {string|number} series - Series to validate
 * @returns {boolean}
 */
const isValidSeries = (series) => {
  if (series === null || series === undefined) return false;
  const str = String(series).trim();
  if (!/^\d{2}$/.test(str)) return false;
  const num = parseInt(str, 10);
  // Reasonable range: 00 to 99, but realistically 15-50
  return num >= 0 && num <= 99;
};

/**
 * Generate a list of upcoming series codes starting from a given series.
 * 
 * @param {string|number} startSeries - Starting series
 * @param {number} count - How many to generate
 * @returns {Array<{series: string, session: string}>}
 */
const generateSeriesRange = (startSeries, count = 5) => {
  const start = parseInt(String(startSeries).trim(), 10);
  if (isNaN(start)) return [];
  
  return Array.from({ length: count }, (_, i) => {
    const seriesNum = start + i;
    const seriesCode = String(seriesNum).padStart(2, '0');
    return {
      series: seriesCode,
      session: getSessionFromSeries(seriesCode)
    };
  });
};

/**
 * Get current academic year/series based on current date.
 * Assumes academic year starts in ~January.
 * 
 * @returns {{series: string, session: string}}
 */
const getCurrentAcademicInfo = () => {
  const now = new Date();
  const year = now.getFullYear();
  const seriesNum = year - 2000;
  const series = String(seriesNum).padStart(2, '0');
  return {
    series,
    session: getSessionFromSeries(series)
  };
};

module.exports = {
  getSessionFromSeries,
  getSeriesFromSession,
  isValidSession,
  isValidSeries,
  generateSeriesRange,
  getCurrentAcademicInfo
};
