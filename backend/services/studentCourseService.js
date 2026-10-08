/**
 * Student Course Service
 * Drives automatic student course visibility based on canonical Enrollment & CourseOffering.
 * Never trusts client-supplied student parameters for authorization.
 */

const Student = require('../models/Student');
const Enrollment = require('../models/Enrollment');
const CourseOffering = require('../models/CourseOffering');
const Course = require('../models/Course');
const TeacherAssignment = require('../models/TeacherAssignment');
const FinalResult = require('../models/FinalResult');
const Attendance = require('../models/Attendance');

/**
 * Returns student's enrolled courses for the selected semester
 */
async function getStudentCourses({ studentUserOrId, semester = null }) {
  const student = typeof studentUserOrId === 'object' && studentUserOrId._id 
    ? studentUserOrId 
    : await Student.findById(studentUserOrId).lean();

  if (!student) throw new Error('Student not found');

  const enrollmentQuery = {
    studentId: student._id,
    status: { $in: ['ENROLLED', 'COMPLETED'] }
  };

  if (semester && semester !== 'ALL') {
    const semClean = String(semester).trim();
    const semBase = semClean.replace(/semester/i, '').trim();
    // Map code like '3-2' to '6th' / '3rd Year 2nd Semester'
    const codeMap = {
      '1-1': '1st', '1-2': '2nd', '2-1': '3rd', '2-2': '4th',
      '3-1': '5th', '3-2': '6th', '4-1': '7th', '4-2': '8th'
    };
    const reverseMap = {
      '1st': '1-1', '2nd': '1-2', '3rd': '2-1', '4th': '2-2',
      '5th': '3-1', '6th': '3-2', '7th': '4-1', '8th': '4-2'
    };
    const mapped = codeMap[semClean] || reverseMap[semBase] || null;

    const matchConditions = [
      { semesterName: semClean },
      { semesterName: { $regex: semBase, $options: 'i' } }
    ];
    if (mapped) {
      matchConditions.push({ semesterName: { $regex: mapped, $options: 'i' } });
    }
    enrollmentQuery.$or = matchConditions;
  }

  const enrollments = await Enrollment.find(enrollmentQuery)
    .populate({
      path: 'courseOfferingId',
      populate: { path: 'course' }
    })
    .sort({ courseCode: 1 })
    .lean();

  // If enrollments exist, resolve teacher assignments and results for them
  const offeringIds = enrollments.map(e => e.courseOfferingId?._id).filter(Boolean);

  const [assignments, finalResults, attendances] = await Promise.all([
    TeacherAssignment.find({ courseOffering: { $in: offeringIds }, status: 'active' }).populate('teacher', 'name designation email avatarUrl').lean(),
    FinalResult.find({ student: student._id }).lean(),
    Attendance.find({ $or: [{ student: student._id }, { studentId: student.rollNumber }] }).lean()
  ]);

  const assignmentMap = new Map();
  assignments.forEach(a => {
    const key = a.courseOffering.toString();
    assignmentMap.set(key, a);
  });

  const resultMap = new Map();
  finalResults.forEach(r => {
    resultMap.set(r.courseCode, r);
  });

  const attendanceCountMap = new Map();
  attendances.forEach(att => {
    const key = att.courseCode;
    const current = attendanceCountMap.get(key) || { total: 0, present: 0 };
    current.total += 1;
    if (att.status === 'Present') current.present += 1;
    attendanceCountMap.set(key, current);
  });

  // Construct clean DTO
  const courseList = enrollments.map(enr => {
    const offering = enr.courseOfferingId;
    const courseDoc = offering?.course;
    const assignDoc = offering ? assignmentMap.get(offering._id.toString()) : null;
    const resultDoc = resultMap.get(enr.courseCode);
    const attData = attendanceCountMap.get(enr.courseCode) || { total: 0, present: 0 };

    return {
      enrollmentId: enr._id,
      courseOfferingId: offering?._id,
      courseId: courseDoc?._id || enr.courseId,
      courseCode: enr.courseCode,
      courseTitle: enr.courseName || courseDoc?.courseName || 'Course',
      courseName: enr.courseName || courseDoc?.courseName || 'Course',
      credits: courseDoc?.credit || courseDoc?.creditHours || 3.0,
      credit: courseDoc?.credit || 3.0,
      courseType: courseDoc?.courseType || 'Theory',
      isElective: enr.enrollmentType === 'ELECTIVE' || Boolean(courseDoc?.isElective),
      semester: enr.semesterName || offering?.semesterName || '1st Semester',
      session: enr.sessionName || offering?.sessionName || student.session,
      series: enr.series || offering?.seriesName || student.series,
      department: enr.departmentCode || student.department,
      status: enr.status,
      // Teacher details
      teacherId: assignDoc?.teacherId || 'Unassigned',
      teacherName: assignDoc?.teacherName || assignDoc?.teacher?.name || 'TBA',
      teacherDesignation: assignDoc?.teacher?.designation || '',
      teacherEmail: assignDoc?.teacher?.email || '',
      // Academic performance
      attendancePercentage: attData.total > 0 ? Math.round((attData.present / attData.total) * 100) : null,
      gradePoint: resultDoc?.gradePoint ?? null,
      letterGrade: resultDoc?.letterGrade ?? null,
      isMarksPublished: offering?.isMarksPublished || false
    };
  });

  return courseList;
}

/**
 * Returns student's historical courses grouped semester-wise
 */
async function getStudentCourseHistory({ studentUserOrId }) {
  const student = typeof studentUserOrId === 'object' && studentUserOrId._id 
    ? studentUserOrId 
    : await Student.findById(studentUserOrId).lean();

  if (!student) throw new Error('Student not found');

  const enrollments = await Enrollment.find({
    studentId: student._id
  })
    .populate('courseOfferingId courseId')
    .sort({ semesterName: 1, courseCode: 1 })
    .lean();

  // Group by semesterName
  const grouped = {};
  enrollments.forEach(enr => {
    const sem = enr.semesterName || 'General';
    if (!grouped[sem]) grouped[sem] = [];
    grouped[sem].push({
      enrollmentId: enr._id,
      courseCode: enr.courseCode,
      courseName: enr.courseName,
      session: enr.sessionName,
      status: enr.status,
      enrolledAt: enr.enrolledAt
    });
  });

  return Object.keys(grouped).map(semester => ({
    semester,
    courses: grouped[semester]
  }));
}

module.exports = {
  getStudentCourses,
  getStudentCourseHistory
};
