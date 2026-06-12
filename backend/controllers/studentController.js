const Attendance = require('../models/Attendance');
const Report = require('../models/Report');
const Performance = require('../models/Performance');
const Quiz = require('../models/Quiz');
const Test = require('../models/Test');
const Others = require('../models/Others');
const Request = require('../models/Request');

// @desc    Get Student Dashboard Summary
// @route   GET /api/student/dashboard/:courseId
const getDashboardSummary = async (req, res) => {
  try {
    const studentId = req.user._id;
    const courseId = req.params.courseId;

    const attendances = await Attendance.find({ student: studentId, course: courseId });
    const totalClasses = attendances.length;
    const presentClasses = attendances.filter(a => a.status === 'Present').length;
    const attendancePercentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;

    res.json({
      attendancePercentage,
      totalClasses,
      presentClasses
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request Detailed Marks
// @route   POST /api/student/request
const requestMarks = async (req, res) => {
  try {
    const { courseId, teacherId } = req.body;
    let request = await Request.findOne({ student: req.user._id, course: courseId });

    if (request) {
      if (request.status === 'Rejected') {
        request.status = 'Pending';
        await request.save();
      }
    } else {
      request = await Request.create({
        student: req.user._id,
        course: courseId,
        teacher: teacherId
      });
    }
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Detailed Marks
// @route   GET /api/student/detailed-marks/:courseId
const getDetailedMarks = async (req, res) => {
  try {
    const request = await Request.findOne({ student: req.user._id, course: req.params.courseId });
    if (!request || request.status !== 'Accepted') {
      return res.status(403).json({ message: 'Detailed marks access not granted by teacher yet.' });
    }

    const studentId = req.user._id;
    const courseId = req.params.courseId;

    const attendances  = await Attendance.find({ student: studentId, course: courseId });
    const reports      = await Report.find({ student: studentId, course: courseId });
    const performances = await Performance.find({ student: studentId, course: courseId });
    const quizzes      = await Quiz.find({ student: studentId, course: courseId });
    const tests        = await Test.find({ student: studentId, course: courseId });
    const others       = await Others.find({ student: studentId, course: courseId });

    res.json({
      attendances,
      reports,
      performances,
      quizzes,
      tests,
      others
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboardSummary,
  requestMarks,
  getDetailedMarks
};
