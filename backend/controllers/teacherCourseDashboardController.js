/**
 * Teacher Course Dashboard Controller
 * Implements:
 * - Automatic current course retrieval (zero manual course/series/semester selection by teacher)
 * - Grouped courses by academic session, semester, series
 * - Enrolled student counts derived strictly from Enrollment collection
 * - Teaching History with server-side pagination
 * - Single course offering detail and student roster
 */

const {
  getTeacherCurrentCourses,
  getTeacherCourseHistory,
  getTeacherCourseOfferingDetail
} = require('../services/teacherCourseService');

const getTeacherId = (req) => {
  return req.user.teacherId || req.user.teacherProfile?.teacherId || req.user.teacherRef || req.user._id;
};

// GET /api/teacher/courses/current
const getCurrentCourses = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const courses = await getTeacherCurrentCourses(teacherId);
    return res.json({ success: true, courses });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/teacher/courses/history
const getCourseHistory = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const result = await getTeacherCourseHistory(teacherId, req.query);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/teacher/courses/:courseOfferingId
const getCourseOfferingDetail = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const detail = await getTeacherCourseOfferingDetail(teacherId, req.params.courseOfferingId);
    return res.json({ success: true, ...detail });
  } catch (error) {
    const status = error.message.includes('Forbidden') ? 403 : (error.message.includes('not found') ? 404 : 500);
    return res.status(status).json({ success: false, message: error.message });
  }
};

// GET /api/teacher/dashboard/summary
const getDashboardSummary = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const currentCourses = await getTeacherCurrentCourses(teacherId);
    const historyData = await getTeacherCourseHistory(teacherId, { limit: 1 });

    const totalStudents = currentCourses.reduce((acc, c) => acc + (c.studentCount || 0), 0);

    return res.json({
      success: true,
      currentCourseCount: currentCourses.length,
      totalStudents,
      historyCount: historyData.total,
      currentCourses
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCurrentCourses,
  getCourseHistory,
  getCourseOfferingDetail,
  getDashboardSummary
};
