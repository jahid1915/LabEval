const Course = require('../models/Course');
const Department = require('../models/Department');
const Faculty = require('../models/Faculty');
const CourseOffering = require('../models/CourseOffering');
const { logAudit } = require('../middleware/auditMiddleware');

// @desc Get all master courses (Department isolated)
// @route GET /api/courses
const getMasterCourses = async (req, res) => {
  try {
    const { departmentCode, departmentId, search, courseType, semesterLevel, isElective } = req.query;
    let query = { status: { $ne: 'archived' } };

    // Enforce Department Head isolation
    if (req.user && req.user.departmentCode && req.user.role !== 'super_admin') {
      query.departmentCode = req.user.departmentCode.toUpperCase();
    } else if (departmentCode) {
      query.departmentCode = departmentCode.toUpperCase();
    } else if (departmentId) {
      query.department = departmentId;
    }

    if (courseType) query.courseType = courseType;
    if (semesterLevel) query.semesterLevel = semesterLevel;
    if (isElective !== undefined) query.isElective = isElective === 'true';

    if (search) {
      query.$or = [
        { courseCode: { $regex: search, $options: 'i' } },
        { courseName: { $regex: search, $options: 'i' } }
      ];
    }

    const courses = await Course.find(query)
      .populate('department', 'name code')
      .populate('faculty', 'name code')
      .sort({ semesterLevel: 1, courseCode: 1 });

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
    const { 
      courseCode, 
      courseName, 
      credit, 
      creditHours,
      department, 
      courseType, 
      semesterLevel, 
      description, 
      syllabus,
      isElective,
      isSessional,
      pairedCourseCode,
      defaultAssessmentConfig 
    } = req.body;

    if (!courseCode || !courseName) {
      return res.status(400).json({ message: 'Course Code and Course Name are required' });
    }

    const cleanCode = courseCode.trim().toUpperCase();
    const existing = await Course.findOne({ courseCode: cleanCode });
    if (existing) {
      return res.status(400).json({ message: `Course with code ${cleanCode} already exists` });
    }

    // Resolve department
    let targetDeptId = department;
    let deptDoc = null;
    if (req.user && req.user.departmentCode && req.user.role !== 'super_admin') {
      deptDoc = await Department.findOne({ code: req.user.departmentCode });
    } else if (department) {
      deptDoc = await Department.findById(department);
    }

    if (!deptDoc) return res.status(400).json({ message: 'Valid department is required' });

    const course = await Course.create({
      courseCode: cleanCode,
      courseName: courseName.trim(),
      credit: Number(credit) || 3.0,
      creditHours: Number(creditHours) || 3.0,
      department: deptDoc._id,
      departmentCode: deptDoc.code,
      faculty: deptDoc.faculty,
      courseType: courseType || (isSessional ? 'Sessional' : 'Theory'),
      isElective: isElective !== undefined ? !!isElective : true,
      isSessional: !!isSessional,
      pairedCourseCode: pairedCourseCode ? pairedCourseCode.trim().toUpperCase() : null,
      semesterLevel: semesterLevel?.trim() || '3-2',
      syllabus: syllabus?.trim() || '',
      description: description?.trim() || '',
      defaultAssessmentConfig: defaultAssessmentConfig || {
        quiz: 20,
        labReport: 15,
        labViva: 10,
        labTest: 20,
        openEnded: 0,
        attendance: 10,
        others: 0
      }
    });

    await logAudit({
      req,
      action: 'CREATE_MASTER_COURSE',
      entity: 'Course',
      entityId: course._id,
      details: `Created elective course ${course.courseCode} (${course.courseName})`,
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

    // Isolation check
    if (req.user && req.user.departmentCode && req.user.role !== 'super_admin') {
      if (course.departmentCode !== req.user.departmentCode) {
        return res.status(403).json({ message: 'Unauthorized: Cannot modify course from another department' });
      }
    }

    const oldValues = { ...course.toObject() };
    const { 
      courseCode, 
      courseName, 
      credit, 
      creditHours,
      department, 
      courseType, 
      semesterLevel, 
      description, 
      syllabus,
      isElective,
      isSessional,
      pairedCourseCode,
      defaultAssessmentConfig, 
      status 
    } = req.body;

    if (courseCode) course.courseCode = courseCode.trim().toUpperCase();
    if (courseName) course.courseName = courseName.trim();
    if (credit !== undefined) course.credit = Number(credit);
    if (creditHours !== undefined) course.creditHours = Number(creditHours);
    if (courseType) course.courseType = courseType;
    if (semesterLevel !== undefined) course.semesterLevel = semesterLevel.trim();
    if (syllabus !== undefined) course.syllabus = syllabus.trim();
    if (description !== undefined) course.description = description.trim();
    if (isElective !== undefined) course.isElective = !!isElective;
    if (isSessional !== undefined) course.isSessional = !!isSessional;
    if (pairedCourseCode !== undefined) course.pairedCourseCode = pairedCourseCode ? pairedCourseCode.trim().toUpperCase() : null;
    if (defaultAssessmentConfig) course.defaultAssessmentConfig = defaultAssessmentConfig;
    if (status) course.status = status;

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

    // Isolation check
    if (req.user && req.user.departmentCode && req.user.role !== 'super_admin') {
      if (course.departmentCode !== req.user.departmentCode) {
        return res.status(403).json({ message: 'Unauthorized: Cannot delete course from another department' });
      }
    }

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
