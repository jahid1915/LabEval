/**
 * RUET Course Code Parser & Academic Level Classifier
 * 
 * RUET Standard: Course code contains a 4-digit numeric pattern (e.g. "ETE 3221", "CSE 2112", "3111").
 * - First digit (1-4)  = Academic Year / Level (e.g. 3 = 3rd Year)
 * - Second digit (1-2) = Academic Term / Semester (e.g. 2 = 2nd Term)
 * Derived Semester Level: e.g. "3-2"
 */

/**
 * Extracts and parses semester information from a course code string.
 * @param {string} courseCode - e.g. "ETE 3221", "CSE 2112", "3221", "ME-4110"
 * @returns {object} Parsed semester metadata and validity status
 */
function parseCourseCode(courseCode) {
  if (!courseCode || typeof courseCode !== 'string') {
    return {
      isValid: false,
      error: 'Course code must be a non-empty string',
      prefix: '',
      numericCode: '',
      fullCode: '',
      year: null,
      term: null,
      semesterNumber: null,
      semesterTerm: null,
      semesterLevel: null,
      semesterLabel: null
    };
  }

  const clean = courseCode.trim().toUpperCase();

  // Match optional prefix + separator + 4 digits + optional suffix (e.g. "ETE 3221", "CSE-2112", "3221")
  const match = clean.match(/^([A-Z]+)?[\s-_]*([1-4])([1-2])(\d{2})([A-Z])?$/);

  if (!match) {
    // Check if it's 4 digits but out of valid bounds (e.g. Year 5 or Term 3)
    const outOfBounds = clean.match(/^([A-Z]+)?[\s-_]*(\d)(\d)(\d{2})/);
    let errorMsg = 'Invalid course code format. Expected RUET convention (e.g., "ETE 3221" or "2111").';
    if (outOfBounds) {
      const y = parseInt(outOfBounds[2], 10);
      const t = parseInt(outOfBounds[3], 10);
      if (y < 1 || y > 4) errorMsg = `Invalid academic year level (${y}). Must be between 1 and 4.`;
      else if (t < 1 || t > 2) errorMsg = `Invalid academic term (${t}). Must be either 1 or 2.`;
    }

    return {
      isValid: false,
      error: errorMsg,
      prefix: clean.replace(/[^A-Z]/g, ''),
      numericCode: clean.replace(/\D/g, ''),
      fullCode: clean,
      year: null,
      term: null,
      semesterNumber: null,
      semesterTerm: null,
      semesterLevel: null,
      semesterLabel: null
    };
  }

  const prefix = match[1] || '';
  const yearDigit = parseInt(match[2], 10);
  const termDigit = parseInt(match[3], 10);
  const suffixDigits = match[4];
  const trailingChar = match[5] || '';
  const numericCode = `${yearDigit}${termDigit}${suffixDigits}${trailingChar}`;
  const fullCode = prefix ? `${prefix} ${numericCode}` : numericCode;
  const semesterLevel = `${yearDigit}-${termDigit}`;

  const yearSuffix = ['st', 'nd', 'rd', 'th'][yearDigit - 1] || 'th';
  const termSuffix = termDigit === 1 ? '1st' : '2nd';
  const semesterLabel = `${yearDigit}${yearSuffix} Year ${termSuffix} Term (${semesterLevel})`;

  // In RUET convention: Even last digit indicates Sessional/Lab (e.g., ETE 3222 is sessional for ETE 3221)
  const lastNumericDigit = parseInt(suffixDigits.slice(-1), 10);
  const isLikelySessional = lastNumericDigit % 2 === 0;

  return {
    isValid: true,
    error: null,
    prefix,
    numericCode,
    fullCode,
    year: yearDigit,
    term: termDigit,
    semesterNumber: yearDigit,
    semesterTerm: termDigit,
    semesterLevel,
    semesterLabel,
    isLikelySessional
  };
}

/**
 * Normalizes semester representation into canonical "X-Y" format.
 * Accepts: "3-2", "3rd", "3rd Year 2nd Term", "2-1", "1st Semester", etc.
 */
function normalizeSemesterLevel(semesterStr) {
  if (!semesterStr || typeof semesterStr !== 'string') return '';
  const clean = semesterStr.trim();

  // Already standard "3-2"
  const directMatch = clean.match(/^([1-4])\s*[-/.]\s*([1-2])$/);
  if (directMatch) return `${directMatch[1]}-${directMatch[2]}`;

  // "3rd Year 2nd Term" or "3rd Year 1st Semester"
  const wordMatch = clean.match(/([1-4])(?:st|nd|rd|th)?\s*(?:year)?\s*[,/]?\s*([1-2])(?:st|nd|rd|th)?\s*(?:term|sem|semester)?/i);
  if (wordMatch) return `${wordMatch[1]}-${wordMatch[2]}`;

  // Single semester format "1st Semester" -> 1-1, "2nd Semester" -> 1-2, etc. (Legacy RUET format)
  const legacySemesters = {
    '1st semester': '1-1',
    '2nd semester': '1-2',
    '3rd semester': '2-1',
    '4th semester': '2-2',
    '5th semester': '3-1',
    '6th semester': '3-2',
    '7th semester': '4-1',
    '8th semester': '4-2'
  };
  const lower = clean.toLowerCase();
  if (legacySemesters[lower]) return legacySemesters[lower];

  return clean;
}

/**
 * Checks whether a course code is compatible with a given cohort semester.
 * @param {string} courseCode - e.g. "ETE 3221"
 * @param {string} targetSemester - e.g. "3-2" or "6th Semester"
 * @returns {boolean}
 */
function isCourseCompatibleWithSemester(courseCode, targetSemester) {
  const parsed = parseCourseCode(courseCode);
  if (!parsed.isValid) return false;

  const normalizedTarget = normalizeSemesterLevel(targetSemester);
  return parsed.semesterLevel === normalizedTarget;
}

module.exports = {
  parseCourseCode,
  normalizeSemesterLevel,
  isCourseCompatibleWithSemester
};
