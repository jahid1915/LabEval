const Course   = require('../models/Course');
const Teacher  = require('../models/Teacher');

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

module.exports = { getCourses, addCourse, deleteCourse };
