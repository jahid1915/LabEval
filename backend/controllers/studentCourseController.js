const Course = require('../models/Course');
const CourseOffering = require('../models/CourseOffering');
const TeacherAssignment = require('../models/TeacherAssignment');
const Teacher = require('../models/Teacher');
const Request = require('../models/Request');
const FinalResult = require('../models/FinalResult');
const Attendance = require('../models/Attendance');
const Report = require('../models/Report');
const Performance = require('../models/Performance');
const Quiz = require('../models/Quiz');
const Test = require('../models/Test');
const Others = require('../models/Others');
const FinalEnrollment = require('../models/FinalEnrollment');

const Enrollment = require('../models/Enrollment');
const { getStudentCourses: getStudentCoursesCanonical, getStudentCourseHistory: getStudentCourseHistoryCanonical } = require('../services/studentCourseService');

// 30s TTL in-memory cache for department course offerings & teacher assignments
const deptCoursesStructureCache = new Map();
const DEPT_COURSES_TTL = 30 * 1000;

// @desc Get student courses organized semester-wise, with real assigned teachers and grades
// @route GET /api/student/courses
const getStudentCourses = async (req, res) => {
  try {
    const student = req.user;
    const { department, series } = student;
    const cleanDept = (department || 'ETE').toUpperCase();
    const filterSemester = req.query.semester ? req.query.semester.trim() : null;

    // Check canonical Enrollment records first (Section 8, 9, 33)
    const enrollmentCount = await Enrollment.countDocuments({
      studentId: student._id,
      status: { $in: ['ENROLLED', 'COMPLETED'] }
    });

    if (enrollmentCount > 0) {
      const canonicalCourses = await getStudentCoursesCanonical({
        studentUserOrId: student,
        semester: filterSemester
      });
      if (canonicalCourses.length > 0 || filterSemester) {
        return res.json(canonicalCourses);
      }
    }

    // Fallback to department cohort offerings for legacy compatibility
    const cacheKey = `${cleanDept}_${series || 'ALL'}_${filterSemester || 'ALL'}`;
    let deptStructure = deptCoursesStructureCache.get(cacheKey);

    if (!deptStructure || (Date.now() - deptStructure.timestamp > DEPT_COURSES_TTL)) {
      // 1. Fetch CourseOfferings for this dept & series
      const offeringQuery = {
        departmentCode: cleanDept,
        seriesName: series,
        status: 'active'
      };
      if (filterSemester) {
        offeringQuery.$or = [{ semesterName: filterSemester }, { semesterName: { $regex: filterSemester, $options: 'i' } }];
      }

      // 2. Fetch all Elective / Master Courses for this department
      const courseQuery = {
        departmentCode: cleanDept,
        status: 'active'
      };
      if (filterSemester) {
        courseQuery.$or = [{ semesterLevel: filterSemester }, { semester: filterSemester }];
      }

      // Execute department queries in parallel with .lean()
      const [offerings, masterCourses, allAssignments] = await Promise.all([
        CourseOffering.find(offeringQuery)
          .populate('course', 'credit creditHours courseType isElective isSessional pairedCourseCode defaultAssessmentConfig syllabus semesterLevel')
          .sort({ createdAt: -1 })
          .lean(),
        Course.find(courseQuery).sort({ semesterLevel: 1, courseCode: 1 }).lean(),
        TeacherAssignment.find({
          status: 'active',
          departmentCode: cleanDept
        })
          .populate('teacher', 'name teacherId designation department email avatarUrl')
          .populate('courseOffering')
          .lean()
      ]);

      const assignmentByOfferingId = {};
      const assignmentByCourseCode = {};

      allAssignments.forEach(a => {
        if (a.courseOffering) {
          const offId = a.courseOffering._id ? a.courseOffering._id.toString() : a.courseOffering.toString();
          assignmentByOfferingId[offId] = a;
          if (a.courseOffering.courseCode) {
            assignmentByCourseCode[a.courseOffering.courseCode] = a;
          }
        }
      });

      deptStructure = {
        offerings,
        masterCourses,
        assignmentByOfferingId,
        assignmentByCourseCode,
        timestamp: Date.now()
      };
      deptCoursesStructureCache.set(cacheKey, deptStructure);
    }

    const { offerings, masterCourses, assignmentByOfferingId, assignmentByCourseCode } = deptStructure;

    // 4. Collect student's final results, requests, and approved elective enrollments in parallel
    const [finalResults, requests, finalEnrollments] = await Promise.all([
      FinalResult.find({ student: student._id }).lean(),
      Request.find({ student: student._id }).lean(),
      FinalEnrollment.find({ studentId: student._id, status: 'active' }).populate('courseId offeringId').lean()
    ]);

    const approvedElectiveCourseMap = new Map();
    finalEnrollments.forEach(fe => {
      if (fe.courseId) {
        approvedElectiveCourseMap.set(fe.courseId.courseCode || fe.courseCode, fe);
      }
    });

    const resultMap = {};
    finalResults.forEach(r => {
      const key = `${r.course}_${r.semester || ''}`;
      resultMap[key] = r;
      resultMap[r.course] = r; // fallback
    });

    const requestMap = {};
    requests.forEach(reqDoc => {
      const key = `${reqDoc.course}_${reqDoc.semester || ''}`;
      requestMap[key] = reqDoc;
      requestMap[reqDoc.course] = reqDoc;
    });

    // 5. Build combined response
    const combined = [];
    const seenCourseCodes = new Set();

    // Add active offerings first (Only include core courses, or electives if approved/finalized for this student)
    for (const off of offerings) {
      const courseCode = off.courseCode;
      const isElectiveCourse = off.course?.isElective !== undefined ? off.course.isElective : false;
      const isApprovedElective = approvedElectiveCourseMap.has(courseCode);

      // Do NOT include elective courses in active courses unless finalized for this student
      if (isElectiveCourse && !isApprovedElective) {
        continue;
      }

      seenCourseCodes.add(courseCode);

      const assign = assignmentByOfferingId[off._id.toString()] || assignmentByCourseCode[courseCode];
      const semester = off.semesterName || off.course?.semesterLevel || '3-2';
      const result = resultMap[`${courseCode}_${semester}`] || resultMap[courseCode];
      const reqDoc = requestMap[`${courseCode}_${semester}`] || requestMap[courseCode];

      combined.push({
        _id: off._id,
        offeringId: off._id,
        courseCode: off.courseCode,
        courseName: off.courseName,
        courseType: off.course?.courseType || (off.course?.isSessional ? 'Sessional' : 'Theory'),
        credit: off.course?.credit || 3.0,
        creditHours: off.course?.creditHours || 3.0,
        isElective: isElectiveCourse,
        isApprovedElective,
        isSessional: !!off.course?.isSessional,
        semester,
        academicSession: off.sessionName || '2024-2025',
        series: off.seriesName || student.series,
        department: off.departmentCode || student.department,
        teacher: assign && assign.teacher ? {
          _id: assign.teacher._id,
          teacherId: assign.teacher.teacherId,
          name: assign.teacher.name,
          designation: assign.teacher.designation,
          email: assign.teacher.email,
          department: assign.teacher.department
        } : null,
        grade: result?.grade || '',
        gradePoint: result?.gradePoint !== undefined ? result.gradePoint : null,
        totalMarks: result?.totalMarks || null,
        maxTotalMarks: result?.maxTotalMarks || 65,
        detailedMarks: (reqDoc?.status === 'Accepted' || reqDoc?.status === 'Completed' || result?.isPublished)
          ? (reqDoc?.detailedMarks || result?.detailedMarks)
          : null,
        request: reqDoc ? {
          _id: reqDoc._id,
          status: reqDoc.status,
          requestDate: reqDoc.requestDate,
          processedAt: reqDoc.processedAt,
          detailedMarks: reqDoc.detailedMarks
        } : null
      });
    }

    // Add finalized electives from FinalEnrollment if not already in offerings
    for (const fe of finalEnrollments) {
      if (!fe.courseId) continue;
      const courseCode = fe.courseCode || fe.courseId.courseCode;
      if (!seenCourseCodes.has(courseCode)) {
        seenCourseCodes.add(courseCode);
        const cDoc = fe.courseId;
        const coDoc = fe.courseOfferingId;
        const assign = (coDoc && assignmentByOfferingId[coDoc._id?.toString()]) || assignmentByCourseCode[courseCode];
        const semester = coDoc?.semesterName || cDoc.semesterLevel || '3-2';
        const result = resultMap[`${courseCode}_${semester}`] || resultMap[courseCode];
        const reqDoc = requestMap[`${courseCode}_${semester}`] || requestMap[courseCode];

        combined.push({
          _id: coDoc?._id || cDoc._id,
          offeringId: coDoc?._id || null,
          courseCode: cDoc.courseCode,
          courseName: cDoc.courseName,
          courseType: cDoc.courseType || (cDoc.isSessional ? 'Sessional' : 'Theory'),
          credit: cDoc.credit || 3.0,
          creditHours: cDoc.creditHours || 3.0,
          isElective: true,
          isApprovedElective: true,
          isSessional: !!cDoc.isSessional,
          semester,
          academicSession: coDoc?.sessionName || '2024-2025',
          series: coDoc?.seriesName || student.series,
          department: coDoc?.departmentCode || student.department,
          teacher: assign && assign.teacher ? {
            _id: assign.teacher._id,
            teacherId: assign.teacher.teacherId,
            name: assign.teacher.name,
            designation: assign.teacher.designation,
            email: assign.teacher.email,
            department: assign.teacher.department
          } : null,
          grade: result?.grade || '',
          gradePoint: result?.gradePoint !== undefined ? result.gradePoint : null,
          totalMarks: result?.totalMarks || null,
          maxTotalMarks: result?.maxTotalMarks || 65,
          detailedMarks: (reqDoc?.status === 'Accepted' || reqDoc?.status === 'Completed' || result?.isPublished)
            ? (reqDoc?.detailedMarks || result?.detailedMarks)
            : null,
          request: reqDoc ? {
            _id: reqDoc._id,
            status: reqDoc.status,
            requestDate: reqDoc.requestDate,
            processedAt: reqDoc.processedAt,
            detailedMarks: reqDoc.detailedMarks
          } : null
        });
      }
    }

    // Add remaining master core courses only (exclude unapproved electives)
    for (const mc of masterCourses) {
      if (mc.isElective && !approvedElectiveCourseMap.has(mc.courseCode)) {
        continue; // Do not add unfinalized electives
      }

      if (!seenCourseCodes.has(mc.courseCode)) {
        seenCourseCodes.add(mc.courseCode);
        const courseCode = mc.courseCode;
        const semester = mc.semesterLevel || '3-2';
        const assign = assignmentByCourseCode[courseCode];
        const result = resultMap[`${courseCode}_${semester}`] || resultMap[courseCode];
        const reqDoc = requestMap[`${courseCode}_${semester}`] || requestMap[courseCode];

        combined.push({
          _id: mc._id,
          offeringId: null,
          courseCode: mc.courseCode,
          courseName: mc.courseName,
          courseType: mc.courseType || (mc.isSessional ? 'Sessional' : 'Theory'),
          credit: mc.credit,
          creditHours: mc.creditHours,
          isElective: !!mc.isElective,
          isApprovedElective: approvedElectiveCourseMap.has(courseCode),
          isSessional: mc.isSessional,
          semester,
          academicSession: '2024-2025',
          series: student.series,
          department: mc.departmentCode,
          teacher: assign && assign.teacher ? {
            _id: assign.teacher._id,
            teacherId: assign.teacher.teacherId,
            name: assign.teacher.name,
            designation: assign.teacher.designation,
            email: assign.teacher.email,
            department: assign.teacher.department
          } : null,
          grade: result?.grade || '',
          gradePoint: result?.gradePoint !== undefined ? result.gradePoint : null,
          totalMarks: result?.totalMarks || null,
          maxTotalMarks: result?.maxTotalMarks || 65,
          detailedMarks: (reqDoc?.status === 'Accepted' || reqDoc?.status === 'Completed' || result?.isPublished)
            ? (reqDoc?.detailedMarks || result?.detailedMarks)
            : null,
          request: reqDoc ? {
            _id: reqDoc._id,
            status: reqDoc.status,
            requestDate: reqDoc.requestDate,
            processedAt: reqDoc.processedAt,
            detailedMarks: reqDoc.detailedMarks
          } : null
        });
      }
    }

    res.json(combined);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get full marks breakdown for a course
// @route GET /api/student/marks/:courseCode
const getStudentMarks = async (req, res) => {
  try {
    const student = req.user;
    const cleanCode = req.params.courseCode.trim().toUpperCase();
    const semester = req.query.semester ? req.query.semester.trim() : '';

    // 1. Resolve Course & Teacher
    const courseDoc = await Course.findOne({ courseCode: cleanCode });
    const offering = await CourseOffering.findOne({
      courseCode: cleanCode,
      departmentCode: student.department
    });

    let teacher = null;
    if (offering) {
      const assignment = await TeacherAssignment.findOne({
        courseOffering: offering._id,
        status: 'active'
      }).populate('teacher');
      if (assignment?.teacher) teacher = assignment.teacher;
    }

    if (!teacher) {
      // Fallback: search by course code across all offerings
      const allOfferings = await CourseOffering.find({ courseCode: cleanCode });
      for (const off of allOfferings) {
        const assignment = await TeacherAssignment.findOne({
          courseOffering: off._id,
          status: 'active'
        }).populate('teacher');
        if (assignment?.teacher) { teacher = assignment.teacher; break; }
      }
    }

    // 2. Resolve request and final result
    const [request, finalResult] = await Promise.all([
      Request.findOne({ student: student._id, course: cleanCode }),
      FinalResult.findOne({ student: student._id, course: cleanCode })
    ]);

    // 3. Marks visible if: published by teacher OR request accepted/completed
    const isPublished = !!(finalResult?.isPublished || offering?.isMarksPublished);
    const isRequestAccepted = !!(request && (request.status === 'Accepted' || request.status === 'Completed'));
    const isAuthorized = isPublished || isRequestAccepted;

    if (!isAuthorized) {
      return res.status(403).json({
        message: 'Marks are not yet published. They will be visible once the teacher finalizes and publishes results.',
        isPublished: false,
        requestStatus: request?.status || null
      });
    }

    const detailedMarks = request?.detailedMarks || finalResult?.detailedMarks || {
      quiz: finalResult?.quizMarks || 0,
      labReport: finalResult?.reportMarks || 0,
      labViva: finalResult?.vivaMarks || 0,
      labTest: finalResult?.testMarks || 0,
      openEnded: finalResult?.openEndedMarks || 'A',
      attendance: finalResult?.attendanceMarks || 0,
      performance: finalResult?.performanceMarks || 0,
      others: finalResult?.othersMarks || 0,
      total: finalResult?.totalMarks || 0,
      grade: finalResult?.grade || '',
      gradePoint: finalResult?.gradePoint || 0
    };

    res.json({
      courseCode: cleanCode,
      courseName: courseDoc?.courseName || offering?.courseName || cleanCode,
      courseType: courseDoc?.courseType || 'Sessional',
      credit: courseDoc?.credit || 1.5,
      semester: semester || offering?.semesterName || finalResult?.semester || '',
      academicSession: offering?.sessionName || finalResult?.academicSession || '2024-2025',
      student: {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        series: student.series,
        department: student.department
      },
      teacher: teacher ? {
        teacherId: teacher.teacherId,
        name: teacher.name,
        designation: teacher.designation,
        department: teacher.department,
        email: teacher.email
      } : {
        teacherId: finalResult?.teacherId || '',
        name: finalResult?.teacherName || 'Not Assigned',
        designation: '',
        department: student.department
      },
      detailedMarks,
      maxTotalMarks: finalResult?.maxTotalMarks || 75,
      totalMarks: detailedMarks.total || finalResult?.totalMarks || 0,
      grade: detailedMarks.grade || finalResult?.grade || '',
      gradePoint: detailedMarks.gradePoint !== undefined ? detailedMarks.gradePoint : null,
      isPublished,
      requestStatus: request?.status || (isPublished ? 'Published' : null),
      processedAt: request?.processedAt || finalResult?.publishedAt || null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get student's academic history across all semesters
// @route GET /api/student/history
const getStudentAcademicHistory = async (req, res) => {
  try {
    const student = req.user;

    const finalResults = await FinalResult.find({
      student: student._id
    }).lean();

    if (finalResults.length === 0) {
      return res.json({ semesters: [], totalResults: 0, studentInfo: {
        name: student.name, rollNumber: student.rollNumber,
        series: student.series, department: student.department
      }});
    }

    const courseCodes = [...new Set(finalResults.map(r => r.course))];
    const offerings = await CourseOffering.find({
      courseCode: { $in: courseCodes }
    }).lean();

    const offeringMap = {};
    offerings.forEach(o => { offeringMap[`${o.courseCode}_${o.seriesName}`] = o; offeringMap[o.courseCode] = o; });

    const offeringIds = offerings.map(o => o._id);
    const assignments = await TeacherAssignment.find({
      courseOffering: { $in: offeringIds },
      status: 'active'
    }).populate('teacher', 'name teacherId designation department').lean();

    const teacherByOfferingId = {};
    assignments.forEach(a => {
      if (a.courseOffering) teacherByOfferingId[a.courseOffering.toString()] = a.teacher;
    });

    // Group results by semester + academicSession
    const semesterMap = {};
    for (const result of finalResults) {
      const key = `${result.semester || 'Unknown'}__${result.academicSession || ''}`;
      if (!semesterMap[key]) {
        semesterMap[key] = {
          semester: result.semester || 'Unknown',
          academicSession: result.academicSession || '',
          courses: []
        };
      }
      const off = offeringMap[`${result.course}_${student.series}`] || offeringMap[result.course];
      const teacher = off ? teacherByOfferingId[off._id?.toString()] : null;

      semesterMap[key].courses.push({
        courseCode: result.course,
        courseName: result.courseName || off?.courseName || result.course,
        courseType: off?.course?.courseType || 'Sessional',
        teacherName: teacher?.name || result.teacherName || 'N/A',
        teacherId: teacher?.teacherId || result.teacherId || '',
        teacherDesignation: teacher?.designation || '',
        grade: result.grade || '',
        gradePoint: result.gradePoint !== undefined ? result.gradePoint : null,
        totalMarks: result.totalMarks || 0,
        maxTotalMarks: result.maxTotalMarks || 75,
        isPublished: result.isPublished || false,
        status: result.status
      });
    }

    // Sort semesters by most recent
    const semesters = Object.values(semesterMap).sort((a, b) => {
      const sessionCmp = b.academicSession.localeCompare(a.academicSession);
      if (sessionCmp !== 0) return sessionCmp;
      return b.semester.localeCompare(a.semester);
    });

    res.json({
      semesters,
      totalResults: finalResults.length,
      studentInfo: {
        name: student.name,
        rollNumber: student.rollNumber,
        series: student.series,
        department: student.department,
        semester: student.semester,
        session: student.session
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get current student's profile
// @route GET /api/student/profile
const getStudentProfile = async (req, res) => {
  try {
    const Student = require('../models/Student');
    const fullStudent = await Student.findOne({
      $or: [
        { _id: req.user._id },
        ...(req.user.userId ? [{ user: req.user.userId }] : []),
        ...(req.user.rollNumber ? [{ rollNumber: req.user.rollNumber }] : []),
        ...(req.authUser?.loginIdentifier ? [{ rollNumber: req.authUser.loginIdentifier }] : [])
      ]
    })
      .populate('departmentRef', 'name code')
      .populate('facultyRef', 'name code')
      .populate('seriesRef', 'name year startYear')
      .populate('academicSessionRef', 'name year')
      .select('-password -enrolledCourses -__v')
      .lean();

    if (!fullStudent) return res.status(404).json({ message: 'Student not found' });

    res.json({
      _id: fullStudent._id,
      name: fullStudent.name,
      rollNumber: fullStudent.rollNumber,
      registrationNumber: fullStudent.registrationNumber || '',
      email: fullStudent.email || '',
      contactNo: fullStudent.contactNo || '',
      series: fullStudent.series,
      department: fullStudent.department,
      departmentName: fullStudent.departmentRef?.name || fullStudent.department,
      facultyName: fullStudent.facultyRef?.name || '',
      semester: fullStudent.semester || '',
      session: fullStudent.session || '',
      section: fullStudent.section || '',
      batch: fullStudent.batch || '',
      gender: fullStudent.gender || '',
      bloodGroup: fullStudent.bloodGroup || '',
      address: fullStudent.address || '',
      regularStatus: fullStudent.regularStatus || 'Regular',
      status: fullStudent.status || 'active',
      avatarUrl: fullStudent.avatarUrl || '',
      createdAt: fullStudent.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStudentCourses,
  getStudentMarks,
  getStudentAcademicHistory,
  getStudentProfile
};

