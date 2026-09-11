const Course = require('../models/Course');
const CourseOffering = require('../models/CourseOffering');
const TeacherAssignment = require('../models/TeacherAssignment');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

const DEFAULT_CONFIG = {
  performance: 5,
  quiz:        30,
  report:      10,
  attendance:  5,
  test:        20,
  others:      5,
};

const TOTAL_MARKS = 75;

// GET /api/teacher/courses — get all assigned courses/offerings for the logged-in teacher
const getCourses = async (req, res) => {
  try {
    const teacherId = req.user.teacherId;

    // 1. Fetch active TeacherAssignments
    const assignments = await TeacherAssignment.find({ teacherId, status: 'active' });
    const offeringIds = assignments.map(a => a.courseOffering);

    const offerings = await CourseOffering.find({ _id: { $in: offeringIds }, status: 'active' })
      .populate('course', 'credit courseType')
      .sort({ createdAt: -1 });

    const formattedOfferings = await Promise.all(offerings.map(async (off) => {
      const studentCount = await Student.countDocuments({
        department: off.departmentCode,
        series: off.seriesName,
        status: 'active'
      });

      return {
        _id: off._id,
        offeringId: off._id,
        courseCode: off.courseCode,
        courseName: off.courseName,
        series: off.seriesName,
        department: off.departmentCode,
        sessionName: off.sessionName,
        semesterName: off.semesterName,
        assessmentConfig: off.assessmentConfig || DEFAULT_CONFIG,
        isMarksPublished: off.isMarksPublished,
        studentCount,
        isOffering: true
      };
    }));

    // 2. Fallback: check legacy courses in Course collection for this teacher
    const legacyCourses = await Course.find({ teacherId: req.user.teacherId }).sort({ createdAt: -1 });
    const formattedLegacy = legacyCourses
      .filter(lc => !formattedOfferings.some(fo => fo.courseCode === lc.courseCode && fo.series === lc.series))
      .map(lc => ({
        _id: lc._id,
        courseCode: lc.courseCode,
        courseName: lc.courseName,
        series: lc.series,
        department: lc.departmentCode || lc.department,
        assessmentConfig: lc.assessmentConfig || DEFAULT_CONFIG,
        studentCount: 0,
        isOffering: false
      }));

    res.json([...formattedOfferings, ...formattedLegacy]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/teacher/courses — add a new course offering / course
const addCourse = async (req, res) => {
  try {
    const { courseCode, courseName, series, department } = req.body;
    if (!courseCode || !courseName || !series || !department) {
      return res.status(400).json({ message: 'All fields are required (courseCode, courseName, series, department)' });
    }

    const cleanCode = courseCode.trim().toUpperCase();
    const cleanDept = department.trim().toUpperCase();
    const cleanSeries = series.trim();

    // Find or create Master Course
    let masterCourse = await Course.findOne({ courseCode: cleanCode });
    if (!masterCourse) {
      masterCourse = await Course.create({
        courseCode: cleanCode,
        courseName: courseName.trim(),
        departmentCode: cleanDept,
        credit: 1.5,
        defaultAssessmentConfig: DEFAULT_CONFIG
      });
    }

    // Find or create CourseOffering
    let offering = await CourseOffering.findOne({
      courseCode: cleanCode,
      seriesName: cleanSeries,
      departmentCode: cleanDept
    });

    if (!offering) {
      offering = await CourseOffering.create({
        course: masterCourse._id,
        courseCode: cleanCode,
        courseName: courseName.trim(),
        departmentCode: cleanDept,
        seriesName: cleanSeries,
        assessmentConfig: DEFAULT_CONFIG
      });
    }

    // Assign Teacher
    await TeacherAssignment.findOneAndUpdate(
      { courseOffering: offering._id, teacher: req.user._id },
      {
        courseOffering: offering._id,
        teacher: req.user._id,
        teacherId: req.user.teacherId,
        role: 'PRIMARY',
        status: 'active'
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Also update teacher's legacy allocatedCourses
    await Teacher.findByIdAndUpdate(req.user._id, {
      $addToSet: {
        allocatedCourses: {
          courseCode: cleanCode,
          courseName: courseName.trim(),
          series: cleanSeries
        }
      }
    });

    res.status(201).json(offering);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/teacher/courses/:id — remove a course assignment
const deleteCourse = async (req, res) => {
  try {
    const offering = await CourseOffering.findById(req.params.id);
    if (offering) {
      await TeacherAssignment.findOneAndUpdate(
        { courseOffering: offering._id, teacher: req.user._id },
        { status: 'revoked' }
      );
      await Teacher.findByIdAndUpdate(req.user._id, {
        $pull: { allocatedCourses: { courseCode: offering.courseCode, series: offering.seriesName } }
      });
      return res.json({ message: 'Course unassigned successfully' });
    }

    const legacy = await Course.findOne({ _id: req.params.id, teacherId: req.user.teacherId });
    if (legacy) {
      await legacy.deleteOne();
      return res.json({ message: 'Course deleted successfully' });
    }

    res.status(404).json({ message: 'Course not found' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/teacher/courses/:id/config — get assessment config for a course/offering
const getAssessmentConfig = async (req, res) => {
  try {
    const id = req.params.id;
    let config = DEFAULT_CONFIG;

    const offering = await CourseOffering.findById(id);
    if (offering && offering.assessmentConfig) {
      config = {
        performance: offering.assessmentConfig.performance ?? DEFAULT_CONFIG.performance,
        quiz:        offering.assessmentConfig.quiz        ?? DEFAULT_CONFIG.quiz,
        report:      offering.assessmentConfig.report      ?? DEFAULT_CONFIG.report,
        attendance:  offering.assessmentConfig.attendance  ?? DEFAULT_CONFIG.attendance,
        test:        offering.assessmentConfig.test        ?? DEFAULT_CONFIG.test,
        others:      offering.assessmentConfig.others      ?? DEFAULT_CONFIG.others,
      };
      return res.json({ config, totalMarks: TOTAL_MARKS });
    }

    const course = await Course.findOne({ _id: id });
    if (course && course.assessmentConfig) {
      config = {
        performance: course.assessmentConfig.performance ?? DEFAULT_CONFIG.performance,
        quiz:        course.assessmentConfig.quiz        ?? DEFAULT_CONFIG.quiz,
        report:      course.assessmentConfig.report      ?? DEFAULT_CONFIG.report,
        attendance:  course.assessmentConfig.attendance  ?? DEFAULT_CONFIG.attendance,
        test:        course.assessmentConfig.test        ?? DEFAULT_CONFIG.test,
        others:      course.assessmentConfig.others      ?? DEFAULT_CONFIG.others,
      };
    }

    res.json({ config, totalMarks: TOTAL_MARKS });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/teacher/courses/:id/config — update assessment config
const updateAssessmentConfig = async (req, res) => {
  try {
    const id = req.params.id;
    const { performance, quiz, report, attendance, test, others } = req.body;

    const fields = { performance, quiz, report, attendance, test, others };
    for (const [key, val] of Object.entries(fields)) {
      if (val === undefined || val === null || typeof val !== 'number' || val < 0) {
        return res.status(400).json({ message: `${key} must be a non-negative number` });
      }
    }

    const total = performance + quiz + report + attendance + test + others;
    if (Math.round(total * 100) / 100 !== TOTAL_MARKS) {
      return res.status(400).json({
        message: `Total configured marks must equal ${TOTAL_MARKS}. Current total: ${total}`
      });
    }

    const newConfig = { performance, quiz, report, attendance, test, others };

    const offering = await CourseOffering.findById(id);
    if (offering) {
      offering.assessmentConfig = newConfig;
      await offering.save();
      return res.json({ message: 'Assessment configuration saved successfully', config: offering.assessmentConfig });
    }

    const course = await Course.findById(id);
    if (course) {
      course.assessmentConfig = newConfig;
      await course.save();
      return res.json({ message: 'Assessment configuration saved successfully', config: course.assessmentConfig });
    }

    res.status(404).json({ message: 'Course offering not found' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getCourses,
  addCourse,
  deleteCourse,
  getAssessmentConfig,
  updateAssessmentConfig
};
