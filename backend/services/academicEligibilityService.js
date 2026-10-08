/**
 * Academic Eligibility Service
 * Canonical business logic for determining student academic eligibility for course offerings.
 * Enforces strict department, series, academic session, and status isolation.
 */

const Student = require('../models/Student');

/**
 * Normalizes semester string for flexible matching
 * e.g., "5th", "5th Semester", "3-2"
 */
function buildSemesterFilter(semesterStr) {
  if (!semesterStr) return null;
  const clean = semesterStr.trim();
  const base = clean.replace(/semester/i, '').trim();
  return {
    $or: [
      { semester: clean },
      { semester: { $regex: `^${base}`, $options: 'i' } }
    ]
  };
}

/**
 * Retrieves all active, academically eligible students for a Course Offering
 * @param {Object} criteria
 * @param {string} criteria.departmentCode - e.g. "ETE"
 * @param {string} criteria.series - e.g. "22"
 * @param {string} [criteria.academicSession] - e.g. "2022-2023"
 * @param {string} [criteria.semester] - e.g. "5th Semester"
 * @param {Object} [options]
 * @param {number} [options.skip]
 * @param {number} [options.limit]
 */
async function getEligibleStudentsForOffering(criteria, options = {}) {
  const { departmentCode, series, academicSession, semester } = criteria;
  if (!departmentCode || !series) {
    throw new Error('departmentCode and series are required to determine student eligibility');
  }

  const query = {
    status: 'active',
    department: departmentCode.toUpperCase(),
    series: String(series).trim()
  };

  // If session is specified, match session or series standard
  if (academicSession && academicSession !== 'ALL') {
    query.$or = [
      { session: academicSession },
      { session: academicSession.replace('-20', '-') },
      { session: academicSession.replace('-', '-20') }
    ];
  }

  const queryBuilder = Student.find(query)
    .select('_id name rollNumber registrationNumber series session semester department status email contactNo')
    .sort({ rollNumber: 1 })
    .lean();

  if (options.skip !== undefined && options.limit !== undefined) {
    queryBuilder.skip(options.skip).limit(options.limit);
  }

  const [total, students] = await Promise.all([
    Student.countDocuments(query),
    queryBuilder
  ]);

  return {
    total,
    students
  };
}

module.exports = {
  getEligibleStudentsForOffering,
  buildSemesterFilter
};
