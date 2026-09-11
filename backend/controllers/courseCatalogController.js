const Course = require('../models/Course');
const Department = require('../models/Department');
const Faculty = require('../models/Faculty');
const CourseOffering = require('../models/CourseOffering');
const { logAudit } = require('../middleware/auditMiddleware');

// @desc Get all master courses
// @route GET /api/courses
const getMasterCourses = async (req, res) => {
  try {
    const { departmentCode, departmentId, search, courseType } = req.query;
    let query = { status: { $ne: 'archived' } };

    if (departmentId) query.department = departmentId;
    if (departmentCode) query.departmentCode = departmentCode.toUpperCase();
    if (courseType) query.courseType = courseType;
    if (search) {
      query.$or = [
        { courseCode: { $regex: search, $options: 'i' } },
        { courseName: { $regex: search, $options: 'i' } }
      ];
    }

    const courses = await Course.find(query)
      .populate('department', 'name code')
      .populate('faculty', 'name code')
      .sort({ courseCode: 1 });

    const enriched = await Promise.all(courses.map(async (c) => {
      const activeOfferings = await CourseOffering.countDocuments({
        $or: [{ course: c._id }, { courseCode: c.courseCode }],
        status: 'active'
      });
      return {
        ...c.toObject(),
        activeOfferings
      };
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create new master course
// @route POST /api/courses
const createMasterCourse = async (req, res) => {
  try {
    const { courseCode, courseName, credit, department, courseType, semesterLevel, description, defaultAssessmentConfig } = req.body;
    if (!courseCode || !courseName || !department) {
      return res.status(400).json({ message: 'Course Code, Course Name, and Department are required' });
    }

    const cleanCode = courseCode.trim().toUpperCase();
    const existing = await Course.findOne({ courseCode: cleanCode });
    if (existing) {
      return res.status(400).json({ message: `Course with code ${cleanCode} already exists` });
    }

    const deptDoc = await Department.findById(department);
    if (!deptDoc) return res.status(400).json({ message: 'Invalid department ID' });

    const course = await Course.create({
      courseCode: cleanCode,
      courseName: courseName.trim(),
      credit: Number(credit) || 1.5,
      department: deptDoc._id,
      departmentCode: deptDoc.code,
      faculty: deptDoc.faculty,
      courseType: courseType || 'Lab',
      semesterLevel: semesterLevel?.trim() || '',
      description: description?.trim() || '',
      defaultAssessmentConfig: defaultAssessmentConfig || {
        performance: 5,
        quiz: 30,
        report: 10,
        attendance: 5,
        test: 20,
        others: 5
      }
    });

    await logAudit({
      req,
      action: 'CREATE_MASTER_COURSE',
      entity: 'Course',
      entityId: course._id,
      details: `Created course ${course.courseCode} (${course.courseName})`,
      newValues: course
    });

    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update master course
// @route PUT /api/courses/:id
const updateMasterCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const oldValues = { ...course.toObject() };
    const { courseCode, courseName, credit, department, courseType, semesterLevel, description, defaultAssessmentConfig, status } = req.body;

    if (courseCode) course.courseCode = courseCode.trim().toUpperCase();
    if (courseName) course.courseName = courseName.trim();
    if (credit !== undefined) course.credit = Number(credit);
    if (courseType) course.courseType = courseType;
    if (semesterLevel !== undefined) course.semesterLevel = semesterLevel.trim();
    if (description !== undefined) course.description = description.trim();
    if (defaultAssessmentConfig) course.defaultAssessmentConfig = defaultAssessmentConfig;
    if (status) course.status = status;

    if (department && department !== String(course.department)) {
      const deptDoc = await Department.findById(department);
      if (deptDoc) {
        course.department = deptDoc._id;
        course.departmentCode = deptDoc.code;
        course.faculty = deptDoc.faculty;
      }
    }

    await course.save();

    await logAudit({
      req,
      action: 'UPDATE_MASTER_COURSE',
      entity: 'Course',
      entityId: course._id,
      details: `Updated course ${course.courseCode}`,
      oldValues,
      newValues: course
    });

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Delete master course
// @route DELETE /api/courses/:id
const deleteMasterCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const offeringsCount = await CourseOffering.countDocuments({
      $or: [{ course: course._id }, { courseCode: course.courseCode }]
    });

    if (offeringsCount > 0) {
      course.status = 'archived';
      await course.save();
      return res.json({ message: `Course archived (${offeringsCount} historical offerings preserved)` });
    }

    await course.deleteOne();
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMasterCourses,
  createMasterCourse,
  updateMasterCourse,
  deleteMasterCourse
};
