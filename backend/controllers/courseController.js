const Course = require('../models/Course');
const CourseOffering = require('../models/CourseOffering');
const TeacherAssignment = require('../models/TeacherAssignment');
const Student = require('../models/Student');
const { getDefaultConfig, resolveConfig, TOTAL_MARKS } = require('../config/assessmentConfig');

// GET /api/teacher/courses — get all assigned courses for the logged-in teacher (Assigned by Department Head only)
const getCourses = async (req, res) => {
  try {
    const teacherId = req.user.teacherId || req.user.teacherProfile?.teacherId || '';
    const teacherRef = req.user.teacherRef || req.user.teacherProfile?._id || req.user._id;

    const queryOr = [];
    if (teacherId) queryOr.push({ teacherId: teacherId.toUpperCase() });
    if (teacherRef) queryOr.push({ teacher: teacherRef });
    if (req.user._id && String(req.user._id) !== String(teacherRef)) queryOr.push({ teacher: req.user._id });

    if (queryOr.length === 0) {
      return res.json([]);
    }

    // 1. Fetch active TeacherAssignments for this teacher
    const assignments = await TeacherAssignment.find({
      $or: queryOr,
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
      // Use canonical resolver — never fall back to old wrong defaults
      const cfg = resolveConfig(off);

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
        assessmentConfig: cfg,
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

    const offering = await CourseOffering.findById(id);
    if (offering) {
      const cfg = resolveConfig(offering);
      return res.json({ config: cfg, totalMarks: TOTAL_MARKS });
    }

    const course = await Course.findOne({ _id: id });
    if (course) {
      const cfg = resolveConfig(course);
      return res.json({ config: cfg, totalMarks: TOTAL_MARKS });
    }

    // No offering or course found — return canonical defaults
    res.json({ config: getDefaultConfig(), totalMarks: TOTAL_MARKS });
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
