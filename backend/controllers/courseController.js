const Course = require('../models/Course');
const CourseOffering = require('../models/CourseOffering');
const TeacherAssignment = require('../models/TeacherAssignment');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

const DEFAULT_CONFIG = {
  quiz:        20,
  labReport:   15,
  labViva:     10,
  labTest:     20,
  openEnded:   0,
  attendance:  10,
  others:      0,
  // legacy keys
  performance: 5,
  report:      10,
  test:        20,
};

const TOTAL_MARKS = 75;

// GET /api/teacher/courses — get all assigned courses for the logged-in teacher (Assigned by Department Head only)
const getCourses = async (req, res) => {
  try {
    const teacherId = req.user.teacherId;
    const teacherDoc = req.user;

    // 1. Fetch active TeacherAssignments for this teacher
    const assignments = await TeacherAssignment.find({
      $or: [
        { teacherId: teacherId.toUpperCase() },
        { teacher: teacherDoc._id }
      ],
      status: 'active'
    }).populate('courseOffering');

    const offeringIds = assignments.map(a => a.courseOffering?._id).filter(Boolean);

    const offerings = await CourseOffering.find({ _id: { $in: offeringIds }, status: 'active' })
      .populate('course', 'credit creditHours courseType isElective isSessional pairedCourseCode defaultAssessmentConfig syllabus semesterLevel')
      .populate('department', 'name code')
      .sort({ createdAt: -1 });

    const formattedOfferings = await Promise.all(offerings.map(async (off) => {
      const studentCount = await Student.countDocuments({
        department: off.departmentCode,
        series: off.seriesName,
        status: 'active'
      });

      const assignDoc = assignments.find(a => String(a.courseOffering?._id) === String(off._id));

      return {
        _id: off._id,
        offeringId: off._id,
        courseCode: off.courseCode,
        courseName: off.courseName,
        series: off.seriesName,
        department: off.departmentCode,
        sessionName: off.sessionName,
        semesterName: off.semesterName,
        semesterLevel: off.course?.semesterLevel || off.semesterName,
        credit: off.course?.credit || 3.0,
        creditHours: off.course?.creditHours || 3.0,
        courseType: off.course?.courseType || (off.course?.isSessional ? 'Sessional' : 'Theory'),
        isElective: off.course?.isElective !== undefined ? off.course.isElective : true,
        isSessional: !!off.course?.isSessional,
        assessmentConfig: off.assessmentConfig || DEFAULT_CONFIG,
        isMarksPublished: off.isMarksPublished,
        studentCount,
        role: assignDoc?.role || 'PRIMARY',
        assignedAt: assignDoc?.createdAt
      };
    }));

    res.json(formattedOfferings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/teacher/courses — Disabled: Teachers cannot manually add courses!
const addCourse = async (req, res) => {
  return res.status(403).json({
    message: 'Operation Denied: Teachers cannot add or select courses. Courses are assigned strictly by the Department Head / Administrator.'
  });
};

// DELETE /api/teacher/courses/:id — Disabled: Teachers cannot self-unassign!
const deleteCourse = async (req, res) => {
  return res.status(403).json({
    message: 'Operation Denied: Only Department Head / Administrator can modify or revoke course assignments.'
  });
};

// GET /api/teacher/courses/:id/config — get assessment config for a course/offering
const getAssessmentConfig = async (req, res) => {
  try {
    const id = req.params.id;
    let config = DEFAULT_CONFIG;

    const offering = await CourseOffering.findById(id);
    if (offering && offering.assessmentConfig) {
      config = {
        quiz:        offering.assessmentConfig.quiz        ?? DEFAULT_CONFIG.quiz,
        labReport:   offering.assessmentConfig.labReport   ?? DEFAULT_CONFIG.labReport,
        labViva:     offering.assessmentConfig.labViva     ?? DEFAULT_CONFIG.labViva,
        labTest:     offering.assessmentConfig.labTest     ?? DEFAULT_CONFIG.labTest,
        openEnded:   offering.assessmentConfig.openEnded   ?? DEFAULT_CONFIG.openEnded,
        attendance:  offering.assessmentConfig.attendance  ?? DEFAULT_CONFIG.attendance,
        others:      offering.assessmentConfig.others      ?? DEFAULT_CONFIG.others,
      };
      return res.json({ config, totalMarks: TOTAL_MARKS });
    }

    const course = await Course.findOne({ _id: id });
    if (course && course.defaultAssessmentConfig) {
      config = course.defaultAssessmentConfig;
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
    const body = req.body;

    const offering = await CourseOffering.findById(id);
    if (offering) {
      offering.assessmentConfig = { ...offering.assessmentConfig, ...body };
      await offering.save();
      return res.json({ message: 'Assessment configuration saved successfully', config: offering.assessmentConfig });
    }

    const course = await Course.findById(id);
    if (course) {
      course.defaultAssessmentConfig = { ...course.defaultAssessmentConfig, ...body };
      await course.save();
      return res.json({ message: 'Assessment configuration saved successfully', config: course.defaultAssessmentConfig });
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
