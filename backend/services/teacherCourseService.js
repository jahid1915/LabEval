/**
 * Teacher Course Service
 * Automatically resolves teacher's assigned courses and historical workload.
 * Zero manual selection required from the teacher.
 */

const TeacherAssignment = require('../models/TeacherAssignment');
const CourseOffering = require('../models/CourseOffering');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Teacher = require('../models/Teacher');

/**
 * Returns all active courses assigned to a teacher, grouped by session/semester/series
 */
async function getTeacherCurrentCourses(teacherIdOrDoc) {
  const teacherIdStr = typeof teacherIdOrDoc === 'object' 
    ? (teacherIdOrDoc.teacherId || teacherIdOrDoc._id?.toString()) 
    : String(teacherIdOrDoc).trim().toUpperCase();

  const teacher = await Teacher.findOne({
    $or: [
      { teacherId: teacherIdStr },
      ...(teacherIdStr.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: teacherIdStr }] : [])
    ]
  }).lean();

  if (!teacher) return [];

  const assignments = await TeacherAssignment.find({
    $or: [{ teacher: teacher._id }, { teacherId: teacher.teacherId }],
    status: 'active'
  })
    .populate({
      path: 'courseOffering',
      populate: { path: 'course' }
    })
    .sort({ academicSession: -1, semester: 1, courseCode: 1 })
    .lean();

  // For each assignment, resolve actual enrolled student count from Enrollment collection
  const offeringIds = assignments.map(a => a.courseOffering?._id).filter(Boolean);
  const enrollmentCounts = await Enrollment.aggregate([
    { $match: { courseOfferingId: { $in: offeringIds }, status: 'ENROLLED' } },
    { $group: { _id: '$courseOfferingId', count: { $sum: 1 } } }
  ]);

  const countMap = new Map();
  enrollmentCounts.forEach(item => {
    countMap.set(item._id.toString(), item.count);
  });

  return assignments.map(a => {
    const offering = a.courseOffering;
    const course = offering?.course;
    const enrolledCount = offering ? (countMap.get(offering._id.toString()) || 0) : 0;

    return {
      assignmentId: a._id,
      courseOfferingId: offering?._id,
      courseId: course?._id || a.courseId,
      courseCode: a.courseCode || offering?.courseCode,
      courseName: a.courseName || offering?.courseName || course?.courseName,
      credits: course?.credit || course?.creditHours || 3.0,
      courseType: course?.courseType || 'Theory',
      academicSession: a.academicSession || offering?.sessionName,
      semester: a.semester || offering?.semesterName,
      series: a.series || offering?.seriesName,
      department: a.departmentCode || offering?.departmentCode,
      role: a.role,
      studentCount: enrolledCount,
      startDate: a.startDate,
      status: a.status
    };
  });
}

/**
 * Returns teacher's historical course assignments with pagination
 */
async function getTeacherCourseHistory(teacherIdOrDoc, { page = 1, limit = 20 } = {}) {
  const teacherIdStr = typeof teacherIdOrDoc === 'object' 
    ? (teacherIdOrDoc.teacherId || teacherIdOrDoc._id?.toString()) 
    : String(teacherIdOrDoc).trim().toUpperCase();

  const teacher = await Teacher.findOne({
    $or: [
      { teacherId: teacherIdStr },
      ...(teacherIdStr.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: teacherIdStr }] : [])
    ]
  }).lean();

  if (!teacher) return { total: 0, history: [] };

  const query = {
    $or: [{ teacher: teacher._id }, { teacherId: teacher.teacherId }],
    status: { $in: ['revoked', 'expired', 'completed'] }
  };

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, assignments] = await Promise.all([
    TeacherAssignment.countDocuments(query),
    TeacherAssignment.find(query)
      .populate('courseOffering')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  return {
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    history: assignments.map(a => ({
      assignmentId: a._id,
      courseCode: a.courseCode,
      courseName: a.courseName,
      academicSession: a.academicSession,
      semester: a.semester,
      series: a.series,
      role: a.role,
      status: a.status,
      startDate: a.startDate,
      endDate: a.endDate || a.updatedAt
    }))
  };
}

/**
 * Returns single offering detail and student roster strictly for assigned teacher
 */
async function getTeacherCourseOfferingDetail(teacherIdOrDoc, courseOfferingId) {
  const teacherIdStr = typeof teacherIdOrDoc === 'object' 
    ? (teacherIdOrDoc.teacherId || teacherIdOrDoc._id?.toString()) 
    : String(teacherIdOrDoc).trim().toUpperCase();

  const teacher = await Teacher.findOne({
    $or: [
      { teacherId: teacherIdStr },
      ...(teacherIdStr.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: teacherIdStr }] : [])
    ]
  }).lean();

  if (!teacher) throw new Error('Teacher not found');

  // Verify teacher has active assignment to this offering
  const assignment = await TeacherAssignment.findOne({
    courseOffering: courseOfferingId,
    $or: [{ teacher: teacher._id }, { teacherId: teacher.teacherId }]
  }).lean();

  if (!assignment) {
    throw new Error('Forbidden: You are not assigned to this course offering');
  }

  const offering = await CourseOffering.findById(courseOfferingId).populate('course').lean();
  if (!offering) throw new Error('Course offering not found');

  // Fetch enrolled students strictly from Enrollment collection
  const enrollments = await Enrollment.find({
    courseOfferingId: offering._id,
    status: 'ENROLLED'
  })
    .populate('studentId', 'rollNumber registrationNumber name email contactNo status')
    .sort({ studentRoll: 1 })
    .lean();

  const students = enrollments.map(e => ({
    enrollmentId: e._id,
    studentId: e.studentId?._id || e.studentId,
    rollNumber: e.studentRoll || e.studentId?.rollNumber,
    registrationNumber: e.studentId?.registrationNumber || '',
    name: e.studentName || e.studentId?.name,
    email: e.studentId?.email || '',
    contactNo: e.studentId?.contactNo || '',
    status: e.status
  }));

  return {
    offering,
    assignment,
    totalStudents: students.length,
    students
  };
}

module.exports = {
  getTeacherCurrentCourses,
  getTeacherCourseHistory,
  getTeacherCourseOfferingDetail
};
