const Course   = require('../models/Course');
const Teacher  = require('../models/Teacher');

// Default assessment config (must sum to 75)
const DEFAULT_CONFIG = {
  performance: 5,
  quiz:        30,
  report:      10,
  attendance:  5,
  test:        20,
  others:      5,
};

const TOTAL_MARKS = 75;

// GET /api/teacher/courses — get all courses for the logged-in teacher
const getCourses = async (req, res) => {
  try {
    const courses = await Course.find({ teacherId: req.user.teacherId }).sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/teacher/courses — add a new course
const addCourse = async (req, res) => {
  try {
    const { courseCode, courseName, series, department } = req.body;
    if (!courseCode || !courseName || !series || !department) {
      return res.status(400).json({ message: 'All fields are required (courseCode, courseName, series, department)' });
    }

    const course = await Course.create({
      teacherId:  req.user.teacherId,
      courseCode: courseCode.trim().toUpperCase(),
      courseName: courseName.trim(),
      series:     series.trim(),
      department: department.trim().toUpperCase(),
      assessmentConfig: DEFAULT_CONFIG,
    });

    // Also add to teacher's embedded allocatedCourses for quick lookup
    await Teacher.findByIdAndUpdate(req.user._id, {
      $addToSet: {
        allocatedCourses: {
          courseCode: course.courseCode,
          courseName: course.courseName,
          series:     course.series
        }
      }
    });

    res.status(201).json(course);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You already have this course + series combination.' });
    }
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/teacher/courses/:id — remove a course
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, teacherId: req.user.teacherId });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    await course.deleteOne();

    // Also remove from teacher's embedded allocatedCourses
    await Teacher.findByIdAndUpdate(req.user._id, {
      $pull: { allocatedCourses: { courseCode: course.courseCode, series: course.series } }
    });

    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/teacher/courses/:id/config — get assessment config for a course
const getAssessmentConfig = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, teacherId: req.user.teacherId });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Return config, falling back to defaults for any missing fields
    const config = {
      performance: course.assessmentConfig?.performance ?? DEFAULT_CONFIG.performance,
      quiz:        course.assessmentConfig?.quiz        ?? DEFAULT_CONFIG.quiz,
      report:      course.assessmentConfig?.report      ?? DEFAULT_CONFIG.report,
      attendance:  course.assessmentConfig?.attendance  ?? DEFAULT_CONFIG.attendance,
      test:        course.assessmentConfig?.test        ?? DEFAULT_CONFIG.test,
      others:      course.assessmentConfig?.others      ?? DEFAULT_CONFIG.others,
    };

    res.json({ config, totalMarks: TOTAL_MARKS });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/teacher/courses/:id/config — update assessment config
const updateAssessmentConfig = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, teacherId: req.user.teacherId });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const { performance, quiz, report, attendance, test, others } = req.body;

    // Validate all are non-negative numbers
    const fields = { performance, quiz, report, attendance, test, others };
    for (const [key, val] of Object.entries(fields)) {
      if (val === undefined || val === null) {
        return res.status(400).json({ message: `Missing field: ${key}` });
      }
      if (typeof val !== 'number' || val < 0) {
        return res.status(400).json({ message: `${key} must be a non-negative number` });
      }
    }

    // Validate total equals 75
    const total = performance + quiz + report + attendance + test + others;
    if (Math.round(total * 100) / 100 !== TOTAL_MARKS) {
      return res.status(400).json({
        message: `Total configured marks must equal ${TOTAL_MARKS}. Current total: ${total}`
      });
    }

    course.assessmentConfig = { performance, quiz, report, attendance, test, others };
    await course.save();

    res.json({ message: 'Assessment configuration saved successfully', config: course.assessmentConfig });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCourses, addCourse, deleteCourse, getAssessmentConfig, updateAssessmentConfig };
