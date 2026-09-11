const CourseOffering = require('../models/CourseOffering');
const Course = require('../models/Course');
const Department = require('../models/Department');
const Series = require('../models/Series');
const AcademicSession = require('../models/AcademicSession');
const Semester = require('../models/Semester');
const TeacherAssignment = require('../models/TeacherAssignment');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const FinalResult = require('../models/FinalResult');
const { logAudit } = require('../middleware/auditMiddleware');

// @desc Get all course offerings with extensive filtering
// @route GET /api/course-offerings
const getCourseOfferings = async (req, res) => {
  try {
    const { departmentCode, seriesName, sessionName, semesterName, teacherId, search, status } = req.query;
    let query = {};

    if (status) query.status = status;
    if (departmentCode) query.departmentCode = departmentCode.toUpperCase();
    if (seriesName) query.seriesName = seriesName;
    if (sessionName) query.sessionName = sessionName;
    if (semesterName) query.semesterName = semesterName;
    if (search) {
      query.$or = [
        { courseCode: { $regex: search, $options: 'i' } },
        { courseName: { $regex: search, $options: 'i' } }
      ];
    }

    // If teacher is logged in or filtered by teacherId
    if (teacherId || (req.user && req.user.role === 'teacher')) {
      const targetTeacherId = teacherId || req.user.teacherId;
      const assignments = await TeacherAssignment.find({
        teacherId: targetTeacherId.toUpperCase(),
        status: 'active'
      });
      const offeringIds = assignments.map(a => a.courseOffering);
      query._id = { $in: offeringIds };
    }

    const offerings = await CourseOffering.find(query)
      .populate('course', 'credit courseType defaultAssessmentConfig')
      .populate('department', 'name code')
      .populate('series', 'name currentSemester')
      .populate('academicSession', 'name year isCurrent')
      .populate('semester', 'name code')
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(offerings.map(async (offering) => {
      const assignments = await TeacherAssignment.find({ courseOffering: offering._id, status: 'active' })
        .populate('teacher', 'name teacherId designation department contactNo avatarUrl dutyStatus');
      
      const studentCount = await Student.countDocuments({
        department: offering.departmentCode,
        series: offering.seriesName,
        status: 'active'
      });

      return {
        ...offering.toObject(),
        teachers: assignments,
        studentCount
      };
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get single course offering by ID
// @route GET /api/course-offerings/:id
const getCourseOfferingById = async (req, res) => {
  try {
    const offering = await CourseOffering.findById(req.params.id)
      .populate('course')
      .populate('department')
      .populate('series')
      .populate('academicSession')
      .populate('semester');

    if (!offering) return res.status(404).json({ message: 'Course offering not found' });

    const assignments = await TeacherAssignment.find({ courseOffering: offering._id, status: 'active' })
      .populate('teacher', 'name teacherId designation department contactNo avatarUrl dutyStatus');

    const students = await Student.find({
      department: offering.departmentCode,
      series: offering.seriesName,
      status: 'active'
    }).sort({ rollNumber: 1 });

    res.json({
      ...offering.toObject(),
      teachers: assignments,
      students,
      studentCount: students.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create new Course Offering & optionally assign teacher
// @route POST /api/course-offerings
const createCourseOffering = async (req, res) => {
  try {
    const {
      courseId,
      departmentId,
      seriesId,
      academicSessionId,
      semesterId,
      teacherId,
      isTemporary,
      reassignedFrom
    } = req.body;

    if (!courseId || !departmentId || !seriesId || !academicSessionId || !semesterId) {
      return res.status(400).json({
        message: 'All fields are required (Course, Department, Series, Academic Session, Semester)'
      });
    }

    const [courseDoc, deptDoc, seriesDoc, sessionDoc, semesterDoc] = await Promise.all([
      Course.findById(courseId),
      Department.findById(departmentId),
      Series.findById(seriesId),
      AcademicSession.findById(academicSessionId),
      Semester.findById(semesterId)
    ]);

    if (!courseDoc || !deptDoc || !seriesDoc || !sessionDoc || !semesterDoc) {
      return res.status(400).json({ message: 'Invalid entity reference provided' });
    }

    // Check duplicate offering
    const existing = await CourseOffering.findOne({
      courseCode: courseDoc.courseCode,
      seriesName: seriesDoc.name,
      sessionName: sessionDoc.name,
      semesterName: semesterDoc.name
    });

    if (existing) {
      return res.status(400).json({
        message: `Course offering for ${courseDoc.courseCode} (${seriesDoc.name} Series, ${sessionDoc.name} Session) already exists.`
      });
    }

    const offering = await CourseOffering.create({
      course: courseDoc._id,
      courseCode: courseDoc.courseCode,
      courseName: courseDoc.courseName,
      department: deptDoc._id,
      departmentCode: deptDoc.code,
      series: seriesDoc._id,
      seriesName: seriesDoc.name,
      academicSession: sessionDoc._id,
      sessionName: sessionDoc.name,
      semester: semesterDoc._id,
      semesterName: semesterDoc.name,
      assessmentConfig: courseDoc.defaultAssessmentConfig || {
        performance: 5,
        quiz: 30,
        report: 10,
        attendance: 5,
        test: 20,
        others: 5
      }
    });

    // If teacher selected, create TeacherAssignment
    if (teacherId) {
      const teacherDoc = await Teacher.findOne({
        $or: [{ _id: teacherId.match(/^[0-9a-fA-F]{24}$/) ? teacherId : null }, { teacherId: teacherId.toUpperCase() }]
      });

      if (teacherDoc) {
        await TeacherAssignment.create({
          courseOffering: offering._id,
          teacher: teacherDoc._id,
          teacherId: teacherDoc.teacherId,
          role: 'PRIMARY',
          isTemporary: !!isTemporary,
          reassignedFrom: reassignedFrom || null,
          status: 'active'
        });
      }
    }

    await logAudit({
      req,
      action: 'CREATE_COURSE_OFFERING',
      entity: 'CourseOffering',
      entityId: offering._id,
      details: `Created offering for ${offering.courseCode} (${offering.seriesName} Series, ${offering.sessionName})`,
      newValues: offering
    });

    res.status(201).json(offering);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Assign / Reassign Teacher to Offering
// @route POST /api/course-offerings/:id/assign
const assignTeacher = async (req, res) => {
  try {
    const { teacherId, role, isTemporary, startDate, endDate, reassignedFrom, notes } = req.body;
    const offering = await CourseOffering.findById(req.params.id);
    if (!offering) return res.status(404).json({ message: 'Course offering not found' });

    const teacherDoc = await Teacher.findOne({
      $or: [{ _id: teacherId.match(/^[0-9a-fA-F]{24}$/) ? teacherId : null }, { teacherId: teacherId.toUpperCase() }]
    });

    if (!teacherDoc) return res.status(400).json({ message: 'Teacher not found' });
    if (teacherDoc.dutyStatus === 'INACTIVE') {
      return res.status(400).json({ message: 'Cannot assign an inactive teacher' });
    }

    const assignment = await TeacherAssignment.findOneAndUpdate(
      { courseOffering: offering._id, teacher: teacherDoc._id },
      {
        courseOffering: offering._id,
        teacher: teacherDoc._id,
        teacherId: teacherDoc.teacherId,
        role: role || 'PRIMARY',
        isTemporary: !!isTemporary,
        reassignedFrom: reassignedFrom || null,
        startDate: startDate || new Date(),
        endDate: endDate || null,
        status: 'active',
        notes: notes || ''
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Also update teacher's legacy allocatedCourses array
    await Teacher.findByIdAndUpdate(teacherDoc._id, {
      $addToSet: {
        allocatedCourses: {
          courseCode: offering.courseCode,
          courseName: offering.courseName,
          series: offering.seriesName
        }
      }
    });

    await logAudit({
      req,
      action: 'ASSIGN_TEACHER',
      entity: 'TeacherAssignment',
      entityId: assignment._id,
      details: `Assigned Teacher ${teacherDoc.name} (${teacherDoc.teacherId}) to ${offering.courseCode} [${role || 'PRIMARY'}]`,
      newValues: assignment
    });

    res.json({ message: 'Teacher assigned successfully', assignment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Revoke Teacher Assignment
// @route DELETE /api/course-offerings/:id/assign/:assignmentId
const revokeAssignment = async (req, res) => {
  try {
    const assignment = await TeacherAssignment.findById(req.params.assignmentId).populate('teacher');
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    assignment.status = 'revoked';
    await assignment.save();

    const offering = await CourseOffering.findById(assignment.courseOffering);
    if (offering && assignment.teacher) {
      await Teacher.findByIdAndUpdate(assignment.teacher._id, {
        $pull: { allocatedCourses: { courseCode: offering.courseCode, series: offering.seriesName } }
      });
    }

    await logAudit({
      req,
      action: 'REVOKE_TEACHER_ASSIGNMENT',
      entity: 'TeacherAssignment',
      entityId: assignment._id,
      details: `Revoked assignment for Teacher ${assignment.teacherId}`
    });

    res.json({ message: 'Teacher assignment revoked successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Publish or Unpublish Final Marks for Offering
// @route PATCH /api/course-offerings/:id/publish-marks
const togglePublishMarks = async (req, res) => {
  try {
    const { publish } = req.body;
    const offering = await CourseOffering.findById(req.params.id);
    if (!offering) return res.status(404).json({ message: 'Course offering not found' });

    offering.isMarksPublished = !!publish;
    offering.publishedAt = publish ? new Date() : null;
    await offering.save();

    // Update all FinalResult records for this course
    await FinalResult.updateMany(
      { course: offering.courseCode },
      {
        status: publish ? 'published' : 'draft',
        isPublished: !!publish,
        publishedAt: publish ? new Date() : null,
        courseOffering: offering._id
      }
    );

    await logAudit({
      req,
      action: publish ? 'PUBLISH_MARKS' : 'UNPUBLISH_MARKS',
      entity: 'CourseOffering',
      entityId: offering._id,
      details: `${publish ? 'Published' : 'Unpublished'} marks for ${offering.courseCode} (${offering.seriesName} Series)`
    });

    res.json({
      message: publish ? 'Marks published successfully! Students can now view their final results.' : 'Marks unpublished to draft mode.',
      isMarksPublished: offering.isMarksPublished
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Delete / Archive Offering
// @route DELETE /api/course-offerings/:id
const deleteCourseOffering = async (req, res) => {
  try {
    const offering = await CourseOffering.findById(req.params.id);
    if (!offering) return res.status(404).json({ message: 'Course offering not found' });

    offering.status = 'archived';
    await offering.save();

    await TeacherAssignment.updateMany({ courseOffering: offering._id }, { status: 'expired' });

    await logAudit({
      req,
      action: 'ARCHIVE_COURSE_OFFERING',
      entity: 'CourseOffering',
      entityId: offering._id,
      details: `Archived offering for ${offering.courseCode} (${offering.seriesName})`
    });

    res.json({ message: 'Course offering archived successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCourseOfferings,
  getCourseOfferingById,
  createCourseOffering,
  assignTeacher,
  revokeAssignment,
  togglePublishMarks,
  deleteCourseOffering
};
