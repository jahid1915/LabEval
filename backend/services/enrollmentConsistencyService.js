/**
 * Automatic Enrollment Consistency Service
 * Guarantees database-level academic consistency for CourseOfferings and Student Enrollments:
 * - Idempotent syncEnrollmentsForOffering()
 * - Reconcile on student academic changes reconcileStudentEnrollments()
 * - Historical preservation on cancellation (no hard deletes)
 * - Concurrency protection & bulk upsert
 */

const mongoose = require('mongoose');
const Enrollment = require('../models/Enrollment');
const CourseOffering = require('../models/CourseOffering');
const Course = require('../models/Course');
const Student = require('../models/Student');
const { getEligibleStudentsForOffering } = require('./academicEligibilityService');

/**
 * Synchronizes enrollments for a CourseOffering idempotently.
 * Running this 1 time or 10 times yields the exact same correct database state.
 * @param {string|mongoose.Types.ObjectId} courseOfferingId
 * @returns {Promise<Object>} Summary of synchronization
 */
async function syncEnrollmentsForOffering(courseOfferingId) {
  const offering = await CourseOffering.findById(courseOfferingId);
  if (!offering) {
    throw new Error(`CourseOffering ${courseOfferingId} not found`);
  }

  // Mark status as SYNCING
  offering.enrollmentSyncStatus = 'SYNCING';
  await offering.save();

  try {
    const course = await Course.findById(offering.course).lean();

    // 1. Fetch all academically eligible students
    const { total: eligibleCount, students: eligibleStudents } = await getEligibleStudentsForOffering({
      departmentCode: offering.departmentCode,
      series: offering.seriesName,
      academicSession: offering.sessionName,
      semester: offering.semesterName
    });

    if (eligibleStudents.length === 0) {
      offering.eligibleStudentCount = 0;
      offering.enrollmentCount = 0;
      offering.enrollmentSyncStatus = 'COMPLETED';
      offering.status = 'active';
      await offering.save();
      return {
        eligible: 0,
        existing: 0,
        created: 0,
        finalEnrollmentCount: 0,
        consistent: true
      };
    }

    // 2. Build idempotent bulk upsert operations
    const bulkOps = eligibleStudents.map(student => ({
      updateOne: {
        filter: {
          studentId: student._id,
          courseOfferingId: offering._id
        },
        update: {
          $setOnInsert: {
            studentId: student._id,
            courseOfferingId: offering._id,
            courseId: offering.course,
            courseCode: offering.courseCode,
            courseName: offering.courseName || course?.courseName || '',
            studentRoll: student.rollNumber,
            studentName: student.name,
            departmentId: offering.department,
            departmentCode: offering.departmentCode,
            academicSessionId: offering.academicSession,
            sessionName: offering.sessionName,
            semesterId: offering.semester,
            semesterName: offering.semesterName,
            series: offering.seriesName,
            enrollmentType: course?.isElective ? 'ELECTIVE' : 'COMPULSORY',
            status: 'ENROLLED',
            enrolledAt: new Date()
          }
        },
        upsert: true
      }
    }));

    // Execute in chunks of 500 for high scalability
    const CHUNK_SIZE = 500;
    let createdCount = 0;
    for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
      const chunk = bulkOps.slice(i, i + CHUNK_SIZE);
      const res = await Enrollment.bulkWrite(chunk, { ordered: false });
      createdCount += (res.upsertedCount || 0);
    }

    // 3. Count final active enrollments
    const finalEnrollmentCount = await Enrollment.countDocuments({
      courseOfferingId: offering._id,
      status: 'ENROLLED'
    });

    // 4. Backward-compatible student model enrolledCourses sync
    const studentIds = eligibleStudents.map(s => s._id);
    await Student.updateMany(
      { _id: { $in: studentIds }, 'enrolledCourses.courseOffering': { $ne: offering._id } },
      { $addToSet: { enrolledCourses: { courseCode: offering.courseCode, courseOffering: offering._id } } }
    );

    // 5. Finalize offering state
    offering.eligibleStudentCount = eligibleCount;
    offering.enrollmentCount = finalEnrollmentCount;
    offering.enrollmentSyncStatus = 'COMPLETED';
    offering.status = 'active';
    await offering.save();

    return {
      eligible: eligibleCount,
      created: createdCount,
      existing: eligibleCount - createdCount,
      finalEnrollmentCount,
      consistent: finalEnrollmentCount === eligibleCount
    };
  } catch (error) {
    offering.enrollmentSyncStatus = 'FAILED';
    await offering.save();
    throw error;
  }
}

/**
 * Reconciles enrollments for a specific student when protected academic fields change
 * (department, series, session, semester, status).
 * Preserves historical records by transitioning stale enrollments to CANCELLED instead of hard-deleting.
 * @param {string|mongoose.Types.ObjectId} studentId
 */
async function reconcileStudentEnrollments(studentId) {
  const student = await Student.findById(studentId);
  if (!student) return;

  const activeOfferings = await CourseOffering.find({
    departmentCode: student.department,
    status: 'active'
  }).lean();

  for (const offering of activeOfferings) {
    // Check if student belongs to this offering's cohort
    const isEligible = (
      student.status === 'active' &&
      student.department.toUpperCase() === offering.departmentCode.toUpperCase() &&
      student.series === offering.seriesName
    );

    const existingEnrollment = await Enrollment.findOne({
      studentId: student._id,
      courseOfferingId: offering._id
    });

    if (isEligible) {
      if (!existingEnrollment || existingEnrollment.status !== 'ENROLLED') {
        await Enrollment.updateOne(
          { studentId: student._id, courseOfferingId: offering._id },
          {
            $set: {
              status: 'ENROLLED',
              cancellationReason: '',
              studentRoll: student.rollNumber,
              studentName: student.name,
              series: student.series,
              sessionName: student.session
            },
            $setOnInsert: {
              enrolledAt: new Date()
            }
          },
          { upsert: true }
        );
      }
    } else {
      // Ineligible now: if they had an active enrollment, preserve it as CANCELLED (never hard-delete)
      if (existingEnrollment && existingEnrollment.status === 'ENROLLED') {
        existingEnrollment.status = 'CANCELLED';
        existingEnrollment.cancellationReason = 'ACADEMIC_ELIGIBILITY_CHANGED';
        existingEnrollment.droppedAt = new Date();
        await existingEnrollment.save();
      }
    }
  }
}

/**
 * Safely cancels a CourseOffering and transitions its enrollments to CANCELLED
 * Preserves all historical academic attendance & marks.
 * @param {string|mongoose.Types.ObjectId} courseOfferingId
 * @param {string} reason
 */
async function cancelOfferingEnrollments(courseOfferingId, reason = 'COURSE_OFFERING_CANCELLED') {
  const offering = await CourseOffering.findById(courseOfferingId);
  if (!offering) throw new Error('CourseOffering not found');

  offering.status = 'cancelled';
  offering.cancellationReason = reason;
  await offering.save();

  await Enrollment.updateMany(
    { courseOfferingId: offering._id, status: 'ENROLLED' },
    { $set: { status: 'CANCELLED', cancellationReason: reason, droppedAt: new Date() } }
  );

  return { success: true, message: `Course offering ${offering.courseCode} cancelled.` };
}

/**
 * Checks integrity of an offering: compares expected eligible count against active enrollment count.
 */
async function getOfferingIntegrity(courseOfferingId) {
  const offering = await CourseOffering.findById(courseOfferingId).lean();
  if (!offering) return null;

  const { total: expectedCount, students: eligibleStudents } = await getEligibleStudentsForOffering({
    departmentCode: offering.departmentCode,
    series: offering.seriesName,
    academicSession: offering.sessionName,
    semester: offering.semesterName
  });

  const actualCount = await Enrollment.countDocuments({
    courseOfferingId: offering._id,
    status: 'ENROLLED'
  });

  return {
    courseOfferingId: offering._id,
    courseCode: offering.courseCode,
    seriesName: offering.seriesName,
    sessionName: offering.sessionName,
    semesterName: offering.semesterName,
    expectedCount,
    actualCount,
    isConsistent: expectedCount === actualCount
  };
}

module.exports = {
  syncEnrollmentsForOffering,
  reconcileStudentEnrollments,
  cancelOfferingEnrollments,
  getOfferingIntegrity
};
