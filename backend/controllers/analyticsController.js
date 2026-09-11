const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Course = require('../models/Course');
const CourseOffering = require('../models/CourseOffering');
const TeacherAssignment = require('../models/TeacherAssignment');
const LeaveRequest = require('../models/LeaveRequest');
const Request = require('../models/Request');
const Attendance = require('../models/Attendance');
const FinalResult = require('../models/FinalResult');
const Performance = require('../models/Performance');
const Quiz = require('../models/Quiz');
const Test = require('../models/Test');
const Report = require('../models/Report');

// @desc Get comprehensive admin-level analytics
// @route GET /api/analytics/admin
const getAdminAnalytics = async (req, res) => {
  try {
    const [
      totalTeachers,
      teachersOnDuty,
      teachersOnLeave,
      teachersUnavailable,
      teachersInactive,
      totalFaculties,
      totalDepartments,
      totalMasterCourses,
      activeOfferings,
      totalStudents,
      pendingLeaves,
      pendingRequests,
      publishedResultsCount
    ] = await Promise.all([
      Teacher.countDocuments(),
      Teacher.countDocuments({ dutyStatus: 'ON_DUTY' }),
      Teacher.countDocuments({ dutyStatus: 'ON_LEAVE' }),
      Teacher.countDocuments({ dutyStatus: 'UNAVAILABLE' }),
      Teacher.countDocuments({ dutyStatus: 'INACTIVE' }),
      Faculty.countDocuments({ status: 'active' }),
      Department.countDocuments({ status: 'active' }),
      Course.countDocuments({ status: 'active' }),
      CourseOffering.countDocuments({ status: 'active' }),
      Student.countDocuments({ status: 'active' }),
      LeaveRequest.countDocuments({ status: 'pending' }),
      Request.countDocuments({ status: 'pending' }),
      FinalResult.countDocuments({ isPublished: true })
    ]);

    // Faculty distribution
    const faculties = await Faculty.find({ status: 'active' });
    const facultyStats = await Promise.all(faculties.map(async (f) => {
      const departments = await Department.find({ faculty: f._id, status: 'active' });
      const deptCodes = departments.map(d => d.code);
      const [tCount, sCount, oCount] = await Promise.all([
        Teacher.countDocuments({ department: { $in: deptCodes } }),
        Student.countDocuments({ department: { $in: deptCodes } }),
        CourseOffering.countDocuments({ departmentCode: { $in: deptCodes }, status: 'active' })
      ]);
      return {
        facultyName: f.name,
        facultyCode: f.code,
        departmentsCount: departments.length,
        teachersCount: tCount,
        studentsCount: sCount,
        activeOfferingsCount: oCount
      };
    }));

    // Department-wise distribution
    const departments = await Department.find({ status: 'active' });
    const departmentStats = await Promise.all(departments.map(async (d) => {
      const [tCount, sCount, cCount, oCount] = await Promise.all([
        Teacher.countDocuments({ department: d.code }),
        Student.countDocuments({ department: d.code, status: 'active' }),
        Course.countDocuments({ departmentCode: d.code, status: 'active' }),
        CourseOffering.countDocuments({ departmentCode: d.code, status: 'active' })
      ]);
      return {
        departmentName: d.name,
        departmentCode: d.code,
        teachers: tCount,
        students: sCount,
        courses: cCount,
        offerings: oCount
      };
    }));

    // Teacher Workload distribution
    const allTeachers = await Teacher.find({ status: 'active' }).select('name teacherId department dutyStatus designation');
    const teacherWorkloads = await Promise.all(allTeachers.map(async (t) => {
      const assignments = await TeacherAssignment.find({ teacherId: t.teacherId, status: 'active' });
      const offeringIds = assignments.map(a => a.courseOffering);
      const offerings = await CourseOffering.find({ _id: { $in: offeringIds } });

      let totalAssignedStudents = 0;
      for (const off of offerings) {
        const count = await Student.countDocuments({ department: off.departmentCode, series: off.seriesName, status: 'active' });
        totalAssignedStudents += count;
      }

      let workloadLevel = 'Normal';
      if (offerings.length >= 5 || totalAssignedStudents >= 150) {
        workloadLevel = 'Overloaded';
      } else if (offerings.length >= 3 || totalAssignedStudents >= 90) {
        workloadLevel = 'High';
      }

      return {
        _id: t._id,
        name: t.name,
        teacherId: t.teacherId,
        department: t.department,
        designation: t.designation,
        dutyStatus: t.dutyStatus,
        assignedOfferingsCount: offerings.length,
        assignedStudentsCount: totalAssignedStudents,
        workloadLevel
      };
    }));

    res.json({
      summary: {
        totalTeachers,
        teachersOnDuty,
        teachersOnLeave,
        teachersUnavailable,
        teachersInactive,
        totalFaculties,
        totalDepartments,
        totalMasterCourses,
        activeOfferings,
        totalStudents,
        pendingLeaves,
        pendingRequests,
        publishedResultsCount
      },
      facultyStats,
      departmentStats,
      teacherWorkloads
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get teacher-specific performance analytics
// @route GET /api/analytics/teacher
const getTeacherAnalytics = async (req, res) => {
  try {
    const teacherId = req.user.teacherId;
    const assignments = await TeacherAssignment.find({ teacherId, status: 'active' });
    const offeringIds = assignments.map(a => a.courseOffering);

    const offerings = await CourseOffering.find({ _id: { $in: offeringIds } })
      .populate('course', 'credit courseType');

    const courseStats = await Promise.all(offerings.map(async (off) => {
      const students = await Student.find({ department: off.departmentCode, series: off.seriesName, status: 'active' });
      const studentIds = students.map(s => s._id);

      const [attendanceCount, results] = await Promise.all([
        Attendance.countDocuments({ course: off.courseCode }),
        FinalResult.find({ course: off.courseCode })
      ]);

      const avgMarks = results.length > 0 
        ? Math.round((results.reduce((acc, r) => acc + (r.totalMarks || 0), 0) / results.length) * 10) / 10 
        : 0;

      const highestMarks = results.length > 0 ? Math.max(...results.map(r => r.totalMarks || 0)) : 0;
      const lowestMarks = results.length > 0 ? Math.min(...results.map(r => r.totalMarks || 0)) : 0;

      return {
        offeringId: off._id,
        courseCode: off.courseCode,
        courseName: off.courseName,
        seriesName: off.seriesName,
        sessionName: off.sessionName,
        studentCount: students.length,
        isMarksPublished: off.isMarksPublished,
        avgMarks,
        highestMarks,
        lowestMarks,
        attendanceCount
      };
    }));

    res.json({
      totalCourses: offerings.length,
      courses: courseStats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAdminAnalytics,
  getTeacherAnalytics
};
