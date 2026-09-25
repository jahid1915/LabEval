const Request = require('../models/Request');
const FinalResult = require('../models/FinalResult');
const CourseOffering = require('../models/CourseOffering');
const TeacherAssignment = require('../models/TeacherAssignment');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const { calculateRUETGrade } = require('../utils/gradeCalculator');

// POST /api/student/request — student sends request for detailed marks
const createRequest = async (req, res) => {
  try {
    const { courseCode, teacherId, semester, academicSession } = req.body;
    if (!courseCode) {
      return res.status(400).json({ message: 'courseCode is required' });
    }

    const student = req.user;
    const cleanCourseCode = courseCode.trim().toUpperCase();
    const cleanSemester = semester ? semester.trim() : '3-2';
    const cleanSession = academicSession ? academicSession.trim() : '2024-2025';

    // 1. Resolve Course details
    const courseDoc = await Course.findOne({ courseCode: cleanCourseCode });
    const courseName = courseDoc?.courseName || cleanCourseCode;

    // 2. Resolve Teacher assigned to this course
    let targetTeacherId = teacherId ? teacherId.trim().toUpperCase() : '';
    let targetTeacherName = '';
    let targetTeacherRef = null;

    if (!targetTeacherId) {
      // Find offering and teacher assignment
      const offering = await CourseOffering.findOne({
        courseCode: cleanCourseCode,
        seriesName: student.series,
        departmentCode: student.department
      });

      if (offering) {
        const assignment = await TeacherAssignment.findOne({
          courseOffering: offering._id,
          status: 'active'
        }).populate('teacher');

        if (assignment && assignment.teacher) {
          targetTeacherRef = assignment.teacher._id;
          targetTeacherId = assignment.teacher.teacherId;
          targetTeacherName = assignment.teacher.name;
        }
      }
    }

    if (targetTeacherId && !targetTeacherName) {
      const tDoc = await Teacher.findOne({ teacherId: targetTeacherId });
      if (tDoc) {
        targetTeacherRef = tDoc._id;
        targetTeacherName = tDoc.name;
      }
    }

    if (!targetTeacherId) {
      return res.status(400).json({
        message: 'Could not resolve the assigned teacher for this course. Please contact the department head.'
      });
    }

    // 3. Upsert / check duplicate
    let existing = await Request.findOne({
      student: student._id,
      course: cleanCourseCode,
      semester: cleanSemester
    });

    if (existing) {
      if (existing.status === 'Pending') {
        return res.status(400).json({ message: 'A pending request already exists for this course.' });
      }
      if (existing.status === 'Accepted' || existing.status === 'Completed') {
        return res.status(400).json({ message: 'Your request for this course is already approved.' });
      }
      // If Rejected → re-request
      existing.status = 'Pending';
      existing.teacher = targetTeacherId;
      existing.teacherRef = targetTeacherRef;
      existing.teacherName = targetTeacherName;
      existing.requestDate = new Date();
      await existing.save();
      return res.json(existing);
    }

    const request = await Request.create({
      student: student._id,
      studentRoll: student.rollNumber,
      studentName: student.name,
      series: student.series,
      department: student.department,
      semester: cleanSemester,
      academicSession: cleanSession,
      course: cleanCourseCode,
      courseName,
      teacher: targetTeacherId,
      teacherRef: targetTeacherRef,
      teacherName: targetTeacherName,
      requestDate: new Date(),
      status: 'Pending'
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/student/requests — student checks status of their requests
const getStudentRequests = async (req, res) => {
  try {
    const requests = await Request.find({ student: req.user._id })
      .populate('teacherRef', 'name teacherId designation email')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/teacher/requests — teacher sees requests (with filters)
const getTeacherRequests = async (req, res) => {
  try {
    const teacherId = req.user.teacherId;
    const query = {
      $or: [
        { teacher: teacherId },
        { teacherRef: req.user._id }
      ]
    };

    if (req.query.course) {
      query.course = req.query.course.trim().toUpperCase();
    }
    if (req.query.semester) {
      query.semester = req.query.semester.trim();
    }
    if (req.query.series) {
      query.series = req.query.series.trim();
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    const requests = await Request.find(query)
      .populate('student', 'name rollNumber series department contactNo')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/teacher/requests/:id — teacher accepts, provides detailed marks, or rejects
const updateRequest = async (req, res) => {
  try {
    const { status, detailedMarks, remarks } = req.body;
    if (!['Accepted', 'Rejected', 'Completed', 'Pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status provided' });
    }

    const request = await Request.findById(req.params.id).populate('student');
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Authorization check
    if (request.teacher !== req.user.teacherId && String(request.teacherRef) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized: This request is directed to another teacher' });
    }

    request.status = status;
    if (remarks !== undefined) request.remarks = remarks;
    request.processedAt = new Date();

    if (detailedMarks && typeof detailedMarks === 'object') {
      const sanitize = (val, max = 100) => {
        if (val === undefined || val === null || val === '') return 0;
        const num = parseFloat(val);
        if (isNaN(num) || !isFinite(num) || num < 0) return 0;
        return Math.min(max, Math.round(num * 100) / 100);
      };

      const maxMarks = sanitize(detailedMarks.maxMarks, 300) || 65;
      const q = sanitize(detailedMarks.quiz, 30);
      const r = sanitize(detailedMarks.labReport, 30);
      const v = sanitize(detailedMarks.labViva, 30);
      const t = sanitize(detailedMarks.labTest, 40);
      const oe = detailedMarks.openEnded === 'A' ? 'A' : sanitize(detailedMarks.openEnded, 40);
      const a = sanitize(detailedMarks.attendance, 20);
      const as = sanitize(detailedMarks.assignment, 40);
      const m = sanitize(detailedMarks.midterm, 60);
      const f = sanitize(detailedMarks.final, 100);
      const p = sanitize(detailedMarks.presentation, 30);
      const o = sanitize(detailedMarks.others, 30);

      const numOE = oe === 'A' ? 0 : oe;
      const rawTotal = q + r + v + t + numOE + a + as + m + f + p + o;
      const total = sanitize(rawTotal, maxMarks);
      const { grade, gradePoint } = calculateRUETGrade(total, maxMarks);

      request.detailedMarks = {
        quiz: q,
        labReport: r,
        labViva: v,
        labTest: t,
        openEnded: oe,
        attendance: a,
        assignment: as,
        midterm: m,
        final: f,
        presentation: p,
        others: o,
        total,
        grade,
        gradePoint
      };

      // Also sync to FinalResult collection
      await FinalResult.findOneAndUpdate(
        {
          student: request.student._id || request.student,
          course: request.course,
          semester: request.semester
        },
        {
          student: request.student._id || request.student,
          rollNumber: request.studentRoll,
          studentName: request.studentName,
          department: request.department,
          series: request.series,
          semester: request.semester,
          academicSession: request.academicSession,
          course: request.course,
          courseName: request.courseName,
          teacher: req.user._id,
          teacherId: req.user.teacherId,
          teacherName: req.user.name,
          quizMarks: q,
          reportMarks: r,
          vivaMarks: v,
          testMarks: t,
          openEndedMarks: oe,
          attendanceMarks: a,
          othersMarks: o,
          totalMarks: total,
          maxTotalMarks: maxMarks,
          grade,
          gradePoint,
          detailedMarks: request.detailedMarks,
          status: 'published',
          isPublished: true,
          publishedAt: new Date()
        },
        { upsert: true, returnDocument: 'after' }
      );
    }

    await request.save();
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createRequest,
  getStudentRequests,
  getTeacherRequests,
  updateRequest
};
