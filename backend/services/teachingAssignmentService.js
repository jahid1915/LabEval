/**
 * Teaching Assignment Service
 * Manages teacher allocation to CourseOfferings.
 * Enforces:
 * - Department isolation
 * - Role conflict prevention
 * - Teacher reassignment without touching student enrollments
 */

const mongoose = require('mongoose');
const TeacherAssignment = require('../models/TeacherAssignment');
const CourseOffering = require('../models/CourseOffering');
const Teacher = require('../models/Teacher');
const { logAudit } = require('../middleware/auditMiddleware');

/**
 * Assigns or reassigns a Teacher to a CourseOffering
 */
async function assignTeacherToOffering({
  courseOfferingId,
  teacherId, // String ID or ObjectId
  role = 'PRIMARY_TEACHER',
  assignedBy,
  assignedByName = '',
  req = null
}) {
  const offering = await CourseOffering.findById(courseOfferingId);
  if (!offering) throw new Error('CourseOffering not found');

  // Find teacher by teacherId string or _id
  const teacher = await Teacher.findOne({
    $or: [
      { teacherId: String(teacherId).trim().toUpperCase() },
      ...(teacherId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: teacherId }] : [])
    ]
  });

  if (!teacher) throw new Error(`Teacher "${teacherId}" not found`);

  // Verify teacher belongs to the offering's department
  if (teacher.department.toUpperCase() !== offering.departmentCode.toUpperCase()) {
    throw new Error(`Teacher ${teacher.name} belongs to ${teacher.department}, but offering is in ${offering.departmentCode}`);
  }

  // Check if this teacher is already assigned with the same role
  let assignment = await TeacherAssignment.findOne({
    courseOffering: offering._id,
    teacher: teacher._id,
    role
  });

  if (assignment) {
    assignment.status = 'active';
    assignment.updatedAt = new Date();
    await assignment.save();
  } else {
    // If assigning PRIMARY_TEACHER, revoke previous primary teacher if exists
    if (role === 'PRIMARY_TEACHER') {
      await TeacherAssignment.updateMany(
        { courseOffering: offering._id, role: 'PRIMARY_TEACHER', status: 'active' },
        { $set: { status: 'revoked', endDate: new Date() } }
      );
    }

    assignment = await TeacherAssignment.create({
      courseOffering: offering._id,
      courseId: offering.course,
      courseCode: offering.courseCode,
      courseName: offering.courseName,
      teacher: teacher._id,
      teacherId: teacher.teacherId,
      teacherName: teacher.name,
      faculty: teacher.facultyRef,
      department: offering.department,
      departmentCode: offering.departmentCode,
      academicSession: offering.sessionName,
      semester: offering.semesterName,
      series: offering.seriesName,
      role,
      assignedBy: mongoose.Types.ObjectId.isValid(assignedBy?._id || assignedBy)
        ? (assignedBy?._id || assignedBy)
        : null,
      assignedByName: assignedByName || assignedBy?.name || 'Department Head'
    });
  }

  if (req) {
    await logAudit({
      req,
      action: 'TEACHER_ASSIGNED_TO_COURSE',
      entity: 'TeacherAssignment',
      entityId: assignment._id,
      details: `Assigned ${teacher.name} (${teacher.teacherId}) to ${offering.courseCode} (${offering.seriesName} Series)`
    });
  }

  return assignment;
}

/**
 * Search active teachers in a department
 */
async function searchDepartmentTeachers(departmentCode, queryStr = '', limit = 15) {
  const filter = {
    dutyStatus: { $ne: 'RESIGNED' }
  };

  if (departmentCode && departmentCode !== 'ALL') {
    filter.department = departmentCode.toUpperCase();
  }

  if (queryStr && queryStr.trim()) {
    const s = queryStr.trim();
    filter.$or = [
      { name: { $regex: s, $options: 'i' } },
      { teacherId: { $regex: s, $options: 'i' } },
      { email: { $regex: s, $options: 'i' } }
    ];
  }

  return await Teacher.find(filter)
    .select('_id teacherId name designation department email avatarUrl')
    .sort({ designation: 1, name: 1 })
    .limit(limit)
    .lean();
}

module.exports = {
  assignTeacherToOffering,
  searchDepartmentTeachers
};
