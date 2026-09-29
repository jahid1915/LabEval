/**
 * Elective Course Management Controller
 * Handles Dynamic Elective Course Catalog, Offerings, Student Voting,
 * Teacher Assignment, Live Statistics, Finalization, Reopening, and Course Rosters
 */
const mongoose = require('mongoose');
const XLSX = require('xlsx');

const ElectiveOffering = require('../models/ElectiveOffering');
const ElectiveSelection = require('../models/ElectiveSelection');
const FinalEnrollment = require('../models/FinalEnrollment');
const Course = require('../models/Course');
const CourseOffering = require('../models/CourseOffering');
const Student = require('../models/Student');
const TeacherAssignment = require('../models/TeacherAssignment');
const Teacher = require('../models/Teacher');
const Department = require('../models/Department');
const Attendance = require('../models/Attendance');
const Report = require('../models/Report');
const Performance = require('../models/Performance');
const Quiz = require('../models/Quiz');
const Test = require('../models/Test');
const Others = require('../models/Others');
const FinalResult = require('../models/FinalResult');
const { logAudit } = require('../middleware/auditMiddleware');
const { emitElectiveUpdate } = require('../utils/socketManager');

// ── 1. DYNAMIC ELECTIVE COURSE CATALOG ───────────────────────────────────────
// GET /api/electives/catalog or /api/admin/electives/catalog
const getElectiveCoursesCatalog = async (req, res) => {
  try {
    const { department, search, series, semester } = req.query;

    const filter = {
      $or: [
        { isElective: true },
        { courseType: /elective/i },
        { courseType: 'Elective' }
      ]
    };

    if (department && department !== 'ALL') {
      const cleanDept = department.trim().toUpperCase();
      filter.$and = [
        {
          $or: [
            { departmentCode: cleanDept },
            { department: cleanDept }
          ]
        }
      ];
    }

    if (search && search.trim()) {
      const s = search.trim();
      const searchCond = {
        $or: [
          { courseCode: { $regex: s, $options: 'i' } },
          { courseName: { $regex: s, $options: 'i' } }
        ]
      };
      if (filter.$and) {
        filter.$and.push(searchCond);
      } else {
        filter.$and = [searchCond];
      }
    }

    const courses = await Course.find(filter)
      .populate('department', 'name code')
      .sort({ courseCode: 1 })
      .lean();

    const courseIds = courses.map(c => c._id);

    // Fetch all offerings that reference these courses
    const offerings = await ElectiveOffering.find({
      $or: [
        { course: { $in: courseIds } },
        { availableCourses: { $in: courseIds } }
      ]
    })
      .populate('assignedTeacher', 'name teacherId email department designation')
      .populate('teacherAssignments.teacher', 'name teacherId email')
      .sort({ createdAt: -1 })
      .lean();

    // Map each course with its live offering status and voting data
    const catalog = await Promise.all(courses.map(async (course) => {
      // Find latest relevant offering
      const offering = offerings.find(off =>
        (off.course && off.course.toString() === course._id.toString()) ||
        (off.availableCourses && off.availableCourses.some(ac => ac.toString() === course._id.toString()))
      );

      const deptCode = course.departmentCode || course.department?.code || (typeof course.department === 'string' ? course.department : '');

      if (!offering) {
        return {
          _id: course._id,
          courseCode: course.courseCode,
          courseName: course.courseName,
          department: deptCode,
          credit: course.credit || 3.0,
          creditHours: course.creditHours || 3.0,
          courseType: course.courseType || (course.isSessional ? 'Sessional' : 'Theory'),
          isSessional: !!course.isSessional,
          semesterLevel: course.semesterLevel || '',
          offeringId: null,
          availableSeries: [],
          eligibleSemester: course.semesterLevel || '',
          currentStatus: 'NOT_OFFERED',
          assignedTeacher: null,
          teacherName: '',
          teacherId: '',
          eligibleStudentsCount: 0,
          votesCount: 0,
          votingStatus: 'NOT_OFFERED',
          finalizationStatus: 'NOT_FINALIZED',
          isFinalized: false
        };
      }

      const eligibleSeries = (offering.eligibleSeries && offering.eligibleSeries.length > 0)
        ? offering.eligibleSeries
        : (offering.series ? [offering.series] : []);

      // Calculate live counts
      const [eligibleStudentsCount, votesCount] = await Promise.all([
        Student.countDocuments({
          department: offering.departmentCode,
          series: { $in: eligibleSeries },
          status: 'active'
        }),
        ElectiveSelection.countDocuments({
          offeringId: offering._id,
          $or: [
            { selectedCourse: course._id },
            { selectedCourses: course._id }
          ]
        })
      ]);

      let teacherInfo = null;
      let teacherName = offering.teacherName || '';
      let teacherId = offering.teacherId || '';

      if (offering.assignedTeacher) {
        teacherInfo = offering.assignedTeacher;
        teacherName = offering.assignedTeacher.name || teacherName;
        teacherId = offering.assignedTeacher.teacherId || teacherId;
      } else if (offering.teacherAssignments && offering.teacherAssignments.length > 0) {
        const ta = offering.teacherAssignments.find(t => t.course?.toString() === course._id.toString()) || offering.teacherAssignments[0];
        teacherInfo = ta.teacher || { name: ta.teacherName, teacherId: ta.teacherId };
        teacherName = ta.teacherName || (ta.teacher && ta.teacher.name) || teacherName;
        teacherId = ta.teacherId || (ta.teacher && ta.teacher.teacherId) || teacherId;
      }

      const isOpen = ['OFFERED', 'VOTING_OPEN', 'OPEN'].includes(offering.status) && !offering.isFinalized;
      const votingStatus = offering.isFinalized ? 'FINALIZED' : (isOpen ? 'OPEN' : 'CLOSED');
      const finalizationStatus = offering.isFinalized ? 'FINALIZED' : 'NOT_FINALIZED';

      return {
        _id: course._id,
        courseCode: course.courseCode,
        courseName: course.courseName,
        department: deptCode,
        credit: course.credit || 3.0,
        creditHours: course.creditHours || 3.0,
        courseType: course.courseType || (course.isSessional ? 'Sessional' : 'Theory'),
        isSessional: !!course.isSessional,
        semesterLevel: offering.semester || course.semesterLevel || '',
        offeringId: offering._id,
        offeringStatus: offering.status,
        availableSeries: eligibleSeries,
        eligibleSemester: offering.semester,
        currentStatus: offering.isFinalized ? 'FINALIZED' : offering.status,
        assignedTeacher: teacherInfo,
        teacherName,
        teacherId,
        eligibleStudentsCount,
        votesCount,
        votingStatus,
        finalizationStatus,
        isFinalized: !!offering.isFinalized,
        offeringCreatedAt: offering.createdAt
      };
    }));

    return res.json({
      success: true,
      count: catalog.length,
      data: catalog
    });
  } catch (error) {
    console.error('getElectiveCoursesCatalog error:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ── 2. ADMIN: Create or Offer Elective Course ─────────────────────────────────
// POST /api/admin/electives/offering
const createOffering = async (req, res) => {
  try {
    const {
      courseId,
      course: singleCourseId,
      department,
      semester,
      academicSession,
      series,
      eligibleSeries,
      electiveGroup,
      availableCourses,
      assignedTeacher,
      teacherId,
      teacherName,
      teacherAssignments,
      maxChoices = 1,
      selectionOpenAt,
      selectionCloseAt,
      status = 'OFFERED',
      showStudentNamesInStats = true
    } = req.body;

    const cleanDept = (department || req.user?.departmentCode || 'ETE').trim().toUpperCase();
    const deptDoc = await Department.findOne({ code: cleanDept });

    // Determine course list
    const primaryCourseId = courseId || singleCourseId;
    let coursesList = [];
    if (availableCourses && Array.isArray(availableCourses) && availableCourses.length > 0) {
      coursesList = availableCourses;
    } else if (primaryCourseId) {
      coursesList = [primaryCourseId];
    }

    if (coursesList.length === 0) {
      return res.status(400).json({ message: 'At least one elective course must be selected.' });
    }

    // Determine eligible series
    let seriesList = [];
    if (eligibleSeries && Array.isArray(eligibleSeries) && eligibleSeries.length > 0) {
      seriesList = eligibleSeries.map(s => String(s).trim());
    } else if (series) {
      seriesList = String(series).split(',').map(s => s.trim()).filter(Boolean);
    }

    if (seriesList.length === 0) {
      return res.status(400).json({ message: 'At least one eligible series must be selected.' });
    }

    if (!semester) {
      return res.status(400).json({ message: 'Eligible semester is required (e.g. 3-1, 3-2).' });
    }

    // Validate courses exist
    const validCourses = await Course.find({ _id: { $in: coursesList } });
    if (validCourses.length !== coursesList.length) {
      return res.status(400).json({ message: 'One or more selected courses are invalid.' });
    }

    // Teacher resolution
    let teacherDoc = null;
    let resolvedTeacherName = teacherName || '';
    let resolvedTeacherId = teacherId || '';

    if (assignedTeacher) {
      if (mongoose.Types.ObjectId.isValid(assignedTeacher)) {
        teacherDoc = await Teacher.findById(assignedTeacher);
      } else {
        teacherDoc = await Teacher.findOne({ teacherId: String(assignedTeacher).toUpperCase() });
      }
      if (teacherDoc) {
        resolvedTeacherName = teacherDoc.name;
        resolvedTeacherId = teacherDoc.teacherId;
      }
    } else if (teacherId) {
      teacherDoc = await Teacher.findOne({ teacherId: String(teacherId).toUpperCase() });
      if (teacherDoc) {
        resolvedTeacherName = teacherDoc.name;
        resolvedTeacherId = teacherDoc.teacherId;
      }
    }

    const groupTitle = electiveGroup || validCourses.map(c => c.courseName).join(' / ') || 'Elective Course';
    const computedSession = academicSession || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    const openAt = selectionOpenAt ? new Date(selectionOpenAt) : new Date();
    const closeAt = selectionCloseAt ? new Date(selectionCloseAt) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Compute eligible students count
    const eligibleCount = await Student.countDocuments({
      department: cleanDept,
      series: { $in: seriesList },
      status: 'active'
    });

    const offering = await ElectiveOffering.create({
      department: cleanDept,
      departmentCode: cleanDept,
      departmentRef: deptDoc?._id,
      semester: semester.trim(),
      academicSession: computedSession,
      series: seriesList.join(', '),
      eligibleSeries: seriesList,
      electiveGroup: groupTitle,
      course: primaryCourseId || validCourses[0]._id,
      availableCourses: coursesList,
      assignedTeacher: teacherDoc?._id || null,
      teacherName: resolvedTeacherName,
      teacherId: resolvedTeacherId,
      teacherAssignments: teacherAssignments || (teacherDoc ? [{
        course: validCourses[0]._id,
        teacher: teacherDoc._id,
        teacherName: resolvedTeacherName,
        teacherId: resolvedTeacherId
      }] : []),
      maxChoices: parseInt(maxChoices) || 1,
      selectionOpenAt: openAt,
      selectionCloseAt: closeAt,
      offeredAt: new Date(),
      votingStartedAt: new Date(),
      status: status || 'OFFERED',
      showStudentNamesInStats: !!showStudentNamesInStats,
      createdBy: req.user._id
    });

    await offering.populate([
      { path: 'availableCourses', select: 'courseCode courseName credit creditHours isSessional' },
      { path: 'assignedTeacher', select: 'name teacherId email department designation' }
    ]);

    await logAudit({
      req,
      action: 'ELECTIVE_OFFERING_CREATE',
      entity: 'ElectiveOffering',
      entityId: offering._id,
      details: `Admin offered elective: ${offering.electiveGroup} (${cleanDept} ${semester}, Series ${seriesList.join(', ')}) with teacher ${resolvedTeacherName || 'None'}. Eligible students: ${eligibleCount}`,
      newValues: offering.toObject()
    });

    emitElectiveUpdate(offering._id.toString(), 'elective:offered', {
      offeringId: offering._id,
      electiveGroup: offering.electiveGroup,
      series: seriesList,
      semester
    });

    return res.status(201).json({
      success: true,
      message: `Elective course successfully offered to ${eligibleCount} eligible students.`,
      data: {
        ...offering.toObject(),
        eligibleCount
      }
    });
  } catch (error) {
    console.error('Create Offering Error:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ── 3. ADMIN: Get All Offerings ───────────────────────────────────────────────
// GET /api/admin/electives/offerings
const getOfferings = async (req, res) => {
  try {
    const { department, semester, series, academicSession, status } = req.query;
    const query = {};

    if (department && department !== 'ALL') query.departmentCode = department.trim().toUpperCase();
    if (semester) query.semester = semester.trim();
    if (series) {
      query.$or = [
        { series: series.trim() },
        { eligibleSeries: series.trim() }
      ];
    }
    if (academicSession) query.academicSession = academicSession.trim();
    if (status) query.status = status;

    const offerings = await ElectiveOffering.find(query)
      .populate('availableCourses', 'courseCode courseName credit creditHours isSessional courseType')
      .populate('course', 'courseCode courseName credit isSessional courseType')
      .populate('assignedTeacher', 'name teacherId email department designation')
      .populate('createdBy', 'name email username')
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await Promise.all(
      offerings.map(async (off) => {
        const seriesList = (off.eligibleSeries && off.eligibleSeries.length > 0)
          ? off.eligibleSeries
          : (off.series ? [off.series] : []);

        const [totalSelections, eligibleCount] = await Promise.all([
          ElectiveSelection.countDocuments({
            offeringId: off._id,
            status: { $in: ['SUBMITTED', 'PENDING_APPROVAL', 'APPROVED'] }
          }),
          Student.countDocuments({
            department: off.departmentCode,
            series: { $in: seriesList },
            status: 'active'
          })
        ]);

        const votePercentage = eligibleCount > 0 ? ((totalSelections / eligibleCount) * 100).toFixed(1) : 0;

        return {
          ...off,
          seriesList,
          totalSelections,
          votesReceived: totalSelections,
          eligibleCount,
          noVoteCount: Math.max(0, eligibleCount - totalSelections),
          votePercentage: parseFloat(votePercentage)
        };
      })
    );

    return res.json({ success: true, data: enriched });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── 4. ADMIN: Detailed Student-Wise Voting Information & Statistics ───────────
// GET /api/admin/electives/offering/:offeringId/voting-details
const getOfferingVotingDetails = async (req, res) => {
  try {
    const { offeringId } = req.params;

    const offering = await ElectiveOffering.findById(offeringId)
      .populate('availableCourses', 'courseCode courseName credit creditHours isSessional')
      .populate('course', 'courseCode courseName credit creditHours isSessional')
      .populate('assignedTeacher', 'name teacherId email department designation')
      .lean();

    if (!offering) {
      return res.status(404).json({ message: 'Elective offering not found' });
    }

    const seriesList = (offering.eligibleSeries && offering.eligibleSeries.length > 0)
      ? offering.eligibleSeries
      : (offering.series ? [offering.series] : []);

    // 1. Fetch all eligible students
    const eligibleStudents = await Student.find({
      department: offering.departmentCode,
      series: { $in: seriesList },
      status: 'active'
    })
      .select('rollNumber name email phone contactNo series semester department registrationNo')
      .sort({ rollNumber: 1 })
      .lean();

    // 2. Fetch all selections / votes for this offering
    const selections = await ElectiveSelection.find({ offeringId })
      .populate('studentId', 'rollNumber name email series semester department registrationNo')
      .populate('selectedCourse', 'courseCode courseName credit')
      .populate('selectedCourses', 'courseCode courseName credit')
      .lean();

    const selectionMap = new Map();
    selections.forEach(sel => {
      if (sel.studentId) {
        selectionMap.set(sel.studentId._id.toString(), sel);
      }
    });

    // 3. Calculate course preferences breakdown
    const courseDistMap = new Map();
    (offering.availableCourses || []).forEach(c => {
      courseDistMap.set(c._id.toString(), {
        courseId: c._id.toString(),
        courseCode: c.courseCode,
        courseName: c.courseName,
        votes: 0,
        percentage: 0
      });
    });

    let totalVotes = 0;
    selections.forEach(sel => {
      const primaryCourse = sel.selectedCourse || (sel.selectedCourses && sel.selectedCourses[0]);
      if (primaryCourse) {
        const cId = primaryCourse._id ? primaryCourse._id.toString() : primaryCourse.toString();
        if (courseDistMap.has(cId)) {
          courseDistMap.get(cId).votes++;
          totalVotes++;
        }
      }
    });

    const courseDistribution = Array.from(courseDistMap.values()).map(cd => ({
      ...cd,
      percentage: totalVotes > 0 ? parseFloat(((cd.votes / totalVotes) * 100).toFixed(1)) : 0
    }));

    // 4. Build student-wise voting rows
    const studentVotingRows = eligibleStudents.map(student => {
      const sel = selectionMap.get(student._id.toString());
      const selectedCourseDoc = sel?.selectedCourse || (sel?.selectedCourses && sel.selectedCourses[0]) || null;

      const hasVoted = !!(sel && (sel.status === 'SUBMITTED' || sel.status === 'APPROVED' || sel.status === 'PENDING_APPROVAL'));

      return {
        _id: student._id,
        roll: student.rollNumber,
        rollNumber: student.rollNumber,
        name: student.name,
        email: student.email || '',
        registrationNo: student.registrationNo || '',
        series: student.series,
        semester: student.semester || offering.semester,
        department: student.department,
        phone: student.phone || student.contactNo || '',
        hasVoted,
        selectedCourseId: selectedCourseDoc?._id || sel?.selectedCourse || null,
        selectedCourseCode: selectedCourseDoc?.courseCode || sel?.courseCode || '',
        selectedCourseName: selectedCourseDoc?.courseName || sel?.courseName || '',
        selectedElective: selectedCourseDoc ? `${selectedCourseDoc.courseCode} - ${selectedCourseDoc.courseName}` : (sel?.courseName || 'No Vote'),
        votedAt: sel?.votedAt || sel?.submittedAt || null,
        status: hasVoted ? (offering.isFinalized ? 'Finalized' : 'Vote Submitted') : 'Not Voted',
        voteStatus: hasVoted ? 'VOTED' : 'NO_VOTE'
      };
    });

    const totalEligible = eligibleStudents.length;
    const votesReceived = studentVotingRows.filter(s => s.hasVoted).length;
    const noVoteCount = Math.max(0, totalEligible - votesReceived);
    const votePercentage = totalEligible > 0 ? parseFloat(((votesReceived / totalEligible) * 100).toFixed(1)) : 0;

    return res.json({
      success: true,
      data: {
        offering,
        stats: {
          totalEligibleStudents: totalEligible,
          votesReceived,
          noVoteCount,
          votePercentage,
          isFinalized: offering.isFinalized,
          status: offering.status
        },
        courseDistribution,
        studentVotingRows
      }
    });
  } catch (error) {
    console.error('getOfferingVotingDetails error:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ── 5. ADMIN: Check Academic Records Before Destructive Action ────────────────
// POST /api/admin/electives/:offeringId/check-academic-records
const checkAcademicRecords = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const offering = await ElectiveOffering.findById(offeringId);
    if (!offering) return res.status(404).json({ message: 'Offering not found' });

    const courseIds = offering.availableCourses;

    const [attCount, repCount, perfCount, quizCount, testCount, othersCount, finalResultCount] = await Promise.all([
      Attendance.countDocuments({ course: { $in: courseIds } }),
      Report.countDocuments({ course: { $in: courseIds } }),
      Performance.countDocuments({ course: { $in: courseIds } }),
      Quiz.countDocuments({ course: { $in: courseIds } }),
      Test.countDocuments({ course: { $in: courseIds } }),
      Others.countDocuments({ course: { $in: courseIds } }),
      FinalResult.countDocuments({ course: { $in: courseIds } })
    ]);

    const total = attCount + repCount + perfCount + quizCount + testCount + othersCount + finalResultCount;

    return res.json({
      success: true,
      hasRecords: total > 0,
      totalRecords: total,
      breakdown: {
        attendance: attCount,
        reports: repCount,
        performance: perfCount,
        quiz: quizCount,
        tests: testCount,
        others: othersCount,
        finalResults: finalResultCount
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── 6. ADMIN: Finalize Elective Allocation ────────────────────────────────────
// POST /api/admin/electives/:offeringId/finalize
const finalizeOffering = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const offering = await ElectiveOffering.findById(offeringId)
      .populate('availableCourses')
      .populate('course')
      .populate('assignedTeacher')
      .populate('departmentRef');

    if (!offering) return res.status(404).json({ message: 'Elective offering not found' });

    const seriesList = (offering.eligibleSeries && offering.eligibleSeries.length > 0)
      ? offering.eligibleSeries
      : (offering.series ? [offering.series] : []);

    // 1. Fetch all student selections
    const selections = await ElectiveSelection.find({ offeringId })
      .populate('studentId')
      .populate('selectedCourse')
      .populate('selectedCourses');

    if (selections.length === 0) {
      return res.status(400).json({ message: 'No student votes found to finalize.' });
    }

    // 2. Ensure CourseOffering exists for each course & series
    const coursesToProcess = offering.availableCourses || [offering.course];
    const courseOfferingMap = new Map();

    for (const course of coursesToProcess) {
      for (const sName of seriesList) {
        let co = await CourseOffering.findOne({
          courseCode: course.courseCode,
          seriesName: sName,
          departmentCode: offering.departmentCode,
          semesterName: offering.semester
        });

        if (!co) {
          co = await CourseOffering.create({
            course: course._id,
            courseCode: course.courseCode,
            courseName: course.courseName,
            department: offering.departmentRef || null,
            departmentCode: offering.departmentCode,
            seriesName: sName,
            sessionName: offering.academicSession,
            semesterName: offering.semester,
            status: 'active'
          });
        } else if (co.status !== 'active') {
          co.status = 'active';
          await co.save();
        }

        courseOfferingMap.set(`${course._id.toString()}_${sName}`, co);
        courseOfferingMap.set(course._id.toString(), co);
      }
    }

    // 3. Assign Teacher(s) -> TeacherAssignment with status: 'active'
    let assignedTeacherCount = 0;
    if (offering.assignedTeacher) {
      const tDoc = offering.assignedTeacher;
      for (const course of coursesToProcess) {
        for (const sName of seriesList) {
          const coDoc = courseOfferingMap.get(`${course._id.toString()}_${sName}`) || courseOfferingMap.get(course._id.toString());
          if (coDoc) {
            await TeacherAssignment.findOneAndUpdate(
              {
                courseOffering: coDoc._id,
                teacher: tDoc._id
              },
              {
                courseOffering: coDoc._id,
                teacher: tDoc._id,
                teacherId: tDoc.teacherId.toUpperCase(),
                teacherName: tDoc.name,
                courseId: course._id,
                courseCode: course.courseCode,
                courseName: course.courseName,
                role: 'PRIMARY',
                status: 'active'
              },
              { upsert: true, new: true }
            );
            assignedTeacherCount++;
          }
        }
      }
    }

    // Process additional teacherAssignments array if specified
    if (offering.teacherAssignments && offering.teacherAssignments.length > 0) {
      for (const ta of offering.teacherAssignments) {
        if (!ta.teacher) continue;
        const targetCourse = coursesToProcess.find(c => c._id.toString() === ta.course?.toString()) || coursesToProcess[0];
        for (const sName of seriesList) {
          const coDoc = courseOfferingMap.get(`${targetCourse._id.toString()}_${sName}`) || courseOfferingMap.get(targetCourse._id.toString());
          if (coDoc) {
            await TeacherAssignment.findOneAndUpdate(
              { courseOffering: coDoc._id, teacher: ta.teacher },
              {
                courseOffering: coDoc._id,
                teacher: ta.teacher,
                teacherId: (ta.teacherId || '').toUpperCase(),
                teacherName: ta.teacherName,
                courseId: targetCourse._id,
                courseCode: targetCourse.courseCode,
                courseName: targetCourse.courseName,
                role: 'PRIMARY',
                status: 'active'
              },
              { upsert: true, new: true }
            );
          }
        }
      }
    }

    // 4. Enroll students -> FinalEnrollment & Student.enrolledCourses
    let enrollmentCount = 0;
    let studentsFinalizedCount = 0;

    for (const sel of selections) {
      if (!sel.studentId) continue;
      studentsFinalizedCount++;

      // Selected courses to enroll
      const coursesToEnroll = [];
      if (sel.approvedCourses && sel.approvedCourses.length > 0) {
        coursesToEnroll.push(...sel.approvedCourses);
      } else if (sel.selectedCourse) {
        coursesToEnroll.push(sel.selectedCourse);
      } else if (sel.selectedCourses && sel.selectedCourses.length > 0) {
        coursesToEnroll.push(...sel.selectedCourses);
      }

      for (const course of coursesToEnroll) {
        const cId = course._id ? course._id.toString() : course.toString();
        const cDoc = coursesToProcess.find(c => c._id.toString() === cId) || course;
        const coDoc = courseOfferingMap.get(`${cDoc._id ? cDoc._id.toString() : cId}_${sel.studentId.series}`) ||
                      courseOfferingMap.get(cDoc._id ? cDoc._id.toString() : cId);

        // Upsert FinalEnrollment
        await FinalEnrollment.findOneAndUpdate(
          { studentId: sel.studentId._id, courseId: cDoc._id || cId },
          {
            studentId: sel.studentId._id,
            courseId: cDoc._id || cId,
            courseCode: cDoc.courseCode,
            offeringId: offering._id,
            courseOfferingId: coDoc?._id || null,
            enrollmentType: 'ELECTIVE',
            source: 'ELECTIVE_ALLOCATION',
            approvedBy: req.user._id,
            approvedAt: new Date(),
            status: 'active'
          },
          { upsert: true, new: true }
        );

        // Add to Student.enrolledCourses
        await Student.updateOne(
          {
            _id: sel.studentId._id,
            'enrolledCourses.courseCode': { $ne: cDoc.courseCode }
          },
          {
            $push: {
              enrolledCourses: {
                courseCode: cDoc.courseCode,
                courseOffering: coDoc?._id || null
              }
            }
          }
        );

        enrollmentCount++;
      }

      sel.status = 'APPROVED';
      sel.reviewedBy = req.user._id;
      sel.reviewedAt = new Date();
      await sel.save();
    }

    // 5. Update offering status to FINALIZED
    offering.isFinalized = true;
    offering.finalizedAt = new Date();
    offering.finalizedBy = req.user._id;
    offering.status = 'FINALIZED';
    await offering.save();

    emitElectiveUpdate(offeringId, 'elective:finalized', {
      offeringId,
      finalizedAt: offering.finalizedAt,
      studentsCount: studentsFinalizedCount,
      message: 'Elective allocation officially finalized by Admin'
    });

    await logAudit({
      req,
      action: 'ELECTIVE_FINALIZATION',
      entity: 'ElectiveOffering',
      entityId: offering._id,
      details: `Admin finalized elective offering ${offering.electiveGroup} (${offering.departmentCode} ${offering.semester}). Allocated ${enrollmentCount} course seats across ${studentsFinalizedCount} students. Activated teacher assignments.`,
      newValues: { studentsFinalizedCount, enrollmentCount, finalizedAt: offering.finalizedAt }
    });

    return res.json({
      success: true,
      message: `Elective allocation finalized successfully! ${studentsFinalizedCount} students enrolled and course activated for assigned teacher.`,
      data: {
        offeringId: offering._id,
        studentsCount: studentsFinalizedCount,
        enrollmentCount,
        finalizedAt: offering.finalizedAt
      }
    });
  } catch (error) {
    console.error('finalizeOffering error:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ── 7. ADMIN: Reopen Voting / Allocation ──────────────────────────────────────
// POST /api/admin/electives/:offeringId/reopen
const reopenOffering = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const { force = false } = req.body;

    const offering = await ElectiveOffering.findById(offeringId).populate('availableCourses');
    if (!offering) return res.status(404).json({ message: 'Elective offering not found' });

    // Check academic records if currently finalized
    if (offering.isFinalized && !force) {
      const courseIds = offering.availableCourses;
      const totalRecords = await Attendance.countDocuments({ course: { $in: courseIds } }) +
        await Report.countDocuments({ course: { $in: courseIds } }) +
        await Quiz.countDocuments({ course: { $in: courseIds } }) +
        await Test.countDocuments({ course: { $in: courseIds } }) +
        await Performance.countDocuments({ course: { $in: courseIds } }) +
        await FinalResult.countDocuments({ course: { $in: courseIds } });

      if (totalRecords > 0) {
        return res.status(409).json({
          message: `Warning: This course has ${totalRecords} existing academic records (attendance/marks). Reopening will suspend active student/teacher course visibility. Please confirm with force=true to proceed.`,
          existingRecordsCount: totalRecords,
          requiresConfirmation: true
        });
      }
    }

    const courseIds = (offering.availableCourses || []).map(c => c._id);
    if (offering.course) courseIds.push(offering.course);
    const courseCodes = (offering.availableCourses || []).map(c => c.courseCode);

    const seriesList = (offering.eligibleSeries && offering.eligibleSeries.length > 0)
      ? offering.eligibleSeries
      : (offering.series ? [offering.series] : []);

    // Find course offerings for this offering
    const coList = await CourseOffering.find({
      $or: [
        { course: { $in: courseIds } },
        { courseCode: { $in: courseCodes } }
      ],
      seriesName: { $in: seriesList },
      departmentCode: offering.departmentCode
    });
    const coIds = coList.map(co => co._id);

    // 1. Deactivate Teacher Assignments for this offering
    await TeacherAssignment.updateMany(
      {
        $or: [
          { courseId: { $in: courseIds } },
          { courseOffering: { $in: coIds } },
          { courseCode: { $in: courseCodes } }
        ],
        status: 'active'
      },
      { status: 'revoked' }
    );

    // 2. Set CourseOfferings to inactive
    if (coIds.length > 0) {
      await CourseOffering.updateMany(
        { _id: { $in: coIds } },
        { status: 'inactive' }
      );
    }

    // 2. Deactivate FinalEnrollments for this offering
    await FinalEnrollment.updateMany(
      { offeringId: offering._id, status: 'active' },
      { status: 'inactive' }
    );

    // 3. Remove from Student.enrolledCourses
    await Student.updateMany(
      { 'enrolledCourses.courseCode': { $in: courseCodes } },
      { $pull: { enrolledCourses: { courseCode: { $in: courseCodes } } } }
    );

    // 4. Revert ElectiveSelection status to SUBMITTED
    await ElectiveSelection.updateMany(
      { offeringId: offering._id, status: 'APPROVED' },
      { status: 'SUBMITTED' }
    );

    // 5. Update offering state
    offering.isFinalized = false;
    offering.status = 'VOTING_OPEN';
    offering.finalizedAt = null;
    offering.finalizedBy = null;
    await offering.save();

    emitElectiveUpdate(offeringId, 'elective:reopened', {
      offeringId,
      status: 'VOTING_OPEN',
      message: 'Elective allocation reopened by Admin'
    });

    await logAudit({
      req,
      action: 'ELECTIVE_REOPEN',
      entity: 'ElectiveOffering',
      entityId: offering._id,
      details: `Admin reopened elective offering ${offering.electiveGroup}. Course assignments revoked pending new finalization.`
    });

    return res.json({
      success: true,
      message: 'Elective voting reopened successfully. Students can now modify their votes.',
      data: offering
    });
  } catch (error) {
    console.error('reopenOffering error:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ── 8. STUDENT: Get Eligible Elective Offerings ───────────────────────────────
// GET /api/student/electives/eligible
const getStudentEligibleOfferings = async (req, res) => {
  try {
    const student = req.user;
    const now = new Date();

    const studentDept = student.department.toUpperCase();
    const studentSeries = String(student.series).trim();

    // Find offerings that include this student's series and department
    const offerings = await ElectiveOffering.find({
      departmentCode: studentDept,
      $or: [
        { eligibleSeries: studentSeries },
        { series: studentSeries },
        { series: { $regex: new RegExp(`\\b${studentSeries}\\b`, 'i') } }
      ],
      status: { $in: ['OFFERED', 'VOTING_OPEN', 'OPEN', 'VOTING_CLOSED', 'CLOSED', 'FINALIZED'] }
    })
      .populate('availableCourses', 'courseCode courseName credit creditHours isSessional courseType defaultAssessmentConfig')
      .populate('course', 'courseCode courseName credit creditHours isSessional courseType')
      .populate('assignedTeacher', 'name teacherId email department designation')
      .sort({ createdAt: -1 })
      .lean();

    const results = await Promise.all(
      offerings.map(async (off) => {
        // Find student's current vote
        const mySelection = await ElectiveSelection.findOne({
          studentId: student._id,
          offeringId: off._id
        })
          .populate('selectedCourse', 'courseCode courseName credit isSessional')
          .populate('selectedCourses', 'courseCode courseName credit isSessional')
          .populate('approvedCourses', 'courseCode courseName credit isSessional')
          .lean();

        // Count votes per course
        const counts = await ElectiveSelection.aggregate([
          { $match: { offeringId: off._id } },
          { $group: { _id: '$selectedCourse', count: { $sum: 1 } } }
        ]);

        const countMap = {};
        counts.forEach(c => {
          if (c._id) countMap[c._id.toString()] = c.count;
        });

        const isOpen = ['OFFERED', 'VOTING_OPEN', 'OPEN'].includes(off.status) &&
          !off.isFinalized &&
          (!off.selectionCloseAt || now <= new Date(off.selectionCloseAt));

        const coursesList = (off.availableCourses && off.availableCourses.length > 0)
          ? off.availableCourses
          : (off.course ? [off.course] : []);

        const teacherName = off.teacherName || off.assignedTeacher?.name || '';

        return {
          ...off,
          availableCourses: coursesList,
          isOpen,
          canChangeVote: isOpen,
          teacherName,
          mySelection: mySelection || null,
          hasVoted: !!mySelection,
          votedCourseId: mySelection?.selectedCourse?._id || mySelection?.selectedCourses?.[0]?._id || null,
          courseCounts: countMap
        };
      })
    );

    return res.json({ success: true, data: results });
  } catch (error) {
    console.error('getStudentEligibleOfferings error:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ── 9. STUDENT: Submit or Change Vote (Single Elective Choice) ─────────────────
// POST /api/student/electives/:offeringId/vote
const submitStudentVote = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const { courseId } = req.body;
    const student = req.user;

    if (!courseId) {
      return res.status(400).json({ message: 'courseId is required to submit your elective choice.' });
    }

    const offering = await ElectiveOffering.findById(offeringId);
    if (!offering) return res.status(404).json({ message: 'Elective offering not found' });

    // Validate eligibility
    const studentDept = student.department.toUpperCase();
    const studentSeries = String(student.series).trim();
    const isDeptMatch = offering.departmentCode === studentDept;
    const isSeriesMatch = (offering.eligibleSeries && offering.eligibleSeries.includes(studentSeries)) ||
                          (offering.series && offering.series.includes(studentSeries));

    if (!isDeptMatch || !isSeriesMatch) {
      return res.status(403).json({ message: 'You are not eligible for this elective offering.' });
    }

    // Validate open state
    const isOpen = ['OFFERED', 'VOTING_OPEN', 'OPEN'].includes(offering.status) && !offering.isFinalized;
    if (!isOpen) {
      return res.status(400).json({ message: 'Voting is currently closed for this elective course.' });
    }

    // Validate course is part of offering
    const allowedCourseIds = (offering.availableCourses || []).map(c => c.toString());
    if (offering.course) allowedCourseIds.push(offering.course.toString());

    if (!allowedCourseIds.includes(courseId.toString())) {
      return res.status(400).json({ message: 'Selected course is not an available option for this offering.' });
    }

    const courseDoc = await Course.findById(courseId);
    if (!courseDoc) return res.status(404).json({ message: 'Course document not found' });

    // Upsert vote
    let selection = await ElectiveSelection.findOne({ studentId: student._id, offeringId });

    if (selection && selection.status === 'APPROVED') {
      return res.status(400).json({ message: 'Your elective choice has already been finalized by Admin and cannot be changed.' });
    }

    if (!selection) {
      selection = new ElectiveSelection({
        studentId: student._id,
        offeringId: offering._id,
        selectedCourse: courseDoc._id,
        selectedCourses: [courseDoc._id],
        studentName: student.name,
        roll: student.rollNumber,
        registrationNo: student.registrationNo || '',
        series: student.series,
        semester: student.semester || offering.semester,
        department: student.department,
        courseCode: courseDoc.courseCode,
        courseName: courseDoc.courseName,
        status: 'SUBMITTED',
        votedAt: new Date(),
        submittedAt: new Date()
      });
    } else {
      selection.selectedCourse = courseDoc._id;
      selection.selectedCourses = [courseDoc._id];
      selection.courseCode = courseDoc.courseCode;
      selection.courseName = courseDoc.courseName;
      selection.status = 'SUBMITTED';
      selection.votedAt = new Date();
      selection.submittedAt = new Date();
    }

    await selection.save();
    await selection.populate('selectedCourse');

    emitElectiveUpdate(offeringId, 'elective:voted', {
      offeringId,
      studentRoll: student.rollNumber,
      courseCode: courseDoc.courseCode
    });

    return res.json({
      success: true,
      message: `✓ Vote Submitted! Your choice for ${courseDoc.courseName} (${courseDoc.courseCode}) has been recorded.`,
      data: selection
    });
  } catch (error) {
    console.error('submitStudentVote error:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ── 10. Legacy Student Select & Submit Support ─────────────────────────────────
const selectStudentElectives = async (req, res) => {
  const courseIds = req.body.courseIds || req.body.selectedCourses || (req.body.courseId ? [req.body.courseId] : []);
  if (courseIds.length === 1) {
    req.body.courseId = courseIds[0];
    return submitStudentVote(req, res);
  }
  return res.status(400).json({ message: 'Please use submitStudentVote with courseId' });
};

const submitStudentElectives = async (req, res) => {
  const courseIds = req.body.courseIds || req.body.selectedCourses || (req.body.courseId ? [req.body.courseId] : []);
  if (courseIds.length >= 1) {
    req.body.courseId = courseIds[0];
    return submitStudentVote(req, res);
  }
  return res.status(400).json({ message: 'Please select a course before submitting' });
};

// ── 11. Legacy Offering Stats (For existing components) ───────────────────────
const getOfferingStats = async (req, res) => {
  return getOfferingVotingDetails(req, res);
};

// ── 12. ADMIN: Update Offering Settings ───────────────────────────────────────
const updateOffering = async (req, res) => {
  try {
    const offering = await ElectiveOffering.findById(req.params.id);
    if (!offering) return res.status(404).json({ message: 'Offering not found' });

    const {
      status,
      selectionOpenAt,
      selectionCloseAt,
      assignedTeacher,
      teacherId,
      teacherName,
      eligibleSeries,
      electiveGroup
    } = req.body;

    if (status) offering.status = status;
    if (selectionOpenAt) offering.selectionOpenAt = new Date(selectionOpenAt);
    if (selectionCloseAt) offering.selectionCloseAt = new Date(selectionCloseAt);
    if (electiveGroup) offering.electiveGroup = electiveGroup.trim();

    if (eligibleSeries && Array.isArray(eligibleSeries)) {
      offering.eligibleSeries = eligibleSeries;
      offering.series = eligibleSeries.join(', ');
    }

    if (assignedTeacher) {
      const tDoc = await Teacher.findById(assignedTeacher);
      if (tDoc) {
        offering.assignedTeacher = tDoc._id;
        offering.teacherName = tDoc.name;
        offering.teacherId = tDoc.teacherId;
      }
    } else if (teacherName) {
      offering.teacherName = teacherName;
      if (teacherId) offering.teacherId = teacherId;
    }

    await offering.save();

    emitElectiveUpdate(offering._id.toString(), 'elective:settingsUpdated', {
      offeringId: offering._id,
      status: offering.status
    });

    return res.json({ success: true, message: 'Offering updated', data: offering });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── 13. ADMIN: Delete Offering ────────────────────────────────────────────────
const deleteOffering = async (req, res) => {
  try {
    const offering = await ElectiveOffering.findById(req.params.id);
    if (!offering) return res.status(404).json({ message: 'Offering not found' });

    if (offering.isFinalized) {
      return res.status(400).json({ message: 'Cannot delete a finalized elective offering. Reopen or archive it first.' });
    }

    await Promise.all([
      ElectiveOffering.findByIdAndDelete(req.params.id),
      ElectiveSelection.deleteMany({ offeringId: req.params.id })
    ]);

    return res.json({ success: true, message: 'Offering deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── 14. ADMIN: Get Student Selections for Allocation Table ────────────────────
const getOfferingSelections = async (req, res) => {
  return getOfferingVotingDetails(req, res);
};

// ── 15. ADMIN: Live Editing / Override Student Selection ──────────────────────
const updateStudentSelectionAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { courseId, status, adminNotes } = req.body;

    const selection = await ElectiveSelection.findById(id).populate('studentId offeringId');
    if (!selection) return res.status(404).json({ message: 'Selection record not found' });

    if (courseId) {
      const courseDoc = await Course.findById(courseId);
      if (courseDoc) {
        selection.selectedCourse = courseDoc._id;
        selection.selectedCourses = [courseDoc._id];
        selection.courseCode = courseDoc.courseCode;
        selection.courseName = courseDoc.courseName;
      }
    }

    if (status) selection.status = status;
    if (adminNotes !== undefined) selection.adminNotes = adminNotes;
    selection.adminOverridden = true;
    selection.reviewedBy = req.user._id;
    selection.reviewedAt = new Date();

    await selection.save();
    return res.json({ success: true, message: 'Student allocation updated', data: selection });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── 16. ADMIN: Bulk Allocation ────────────────────────────────────────────────
const bulkAssignElectives = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const { studentIds, courseId, status = 'APPROVED' } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'No students provided for bulk assignment' });
    }
    if (!courseId) {
      return res.status(400).json({ message: 'No course provided for bulk assignment' });
    }

    const offering = await ElectiveOffering.findById(offeringId);
    if (!offering) return res.status(404).json({ message: 'Offering not found' });

    const courseDoc = await Course.findById(courseId);
    if (!courseDoc) return res.status(404).json({ message: 'Course not found' });

    let updatedCount = 0;
    for (const sId of studentIds) {
      const studentDoc = await Student.findById(sId);
      if (!studentDoc) continue;

      await ElectiveSelection.findOneAndUpdate(
        { studentId: sId, offeringId },
        {
          studentId: sId,
          offeringId,
          selectedCourse: courseDoc._id,
          selectedCourses: [courseDoc._id],
          studentName: studentDoc.name,
          roll: studentDoc.rollNumber,
          registrationNo: studentDoc.registrationNo || '',
          series: studentDoc.series,
          semester: studentDoc.semester || offering.semester,
          department: studentDoc.department,
          courseCode: courseDoc.courseCode,
          courseName: courseDoc.courseName,
          status,
          adminOverridden: true,
          reviewedBy: req.user._id,
          reviewedAt: new Date()
        },
        { upsert: true, new: true }
      );
      updatedCount++;
    }

    return res.json({ success: true, message: `Successfully updated allocation for ${updatedCount} students` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── 17. ADMIN: Export Elective Allocations (Excel) ─────────────────────────────
const exportOfferingAllocations = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const offering = await ElectiveOffering.findById(offeringId).populate('availableCourses').lean();
    if (!offering) return res.status(404).json({ message: 'Offering not found' });

    const selections = await ElectiveSelection.find({ offeringId })
      .populate('studentId', 'rollNumber name series semester department email registrationNo')
      .populate('selectedCourse', 'courseCode courseName')
      .populate('selectedCourses', 'courseCode courseName')
      .sort({ 'studentId.rollNumber': 1 })
      .lean();

    const wb = XLSX.utils.book_new();

    const allocHeaders = ['Roll Number', 'Student Name', 'Registration No', 'Series', 'Semester', 'Department', 'Selected Elective', 'Vote Time', 'Status'];
    const allocRows = selections.map(s => {
      const course = s.selectedCourse || (s.selectedCourses && s.selectedCourses[0]);
      return [
        s.studentId?.rollNumber || s.roll || '',
        s.studentId?.name || s.studentName || '',
        s.studentId?.registrationNo || s.registrationNo || '',
        s.studentId?.series || s.series || offering.series,
        s.studentId?.semester || s.semester || offering.semester,
        s.studentId?.department || s.department || offering.departmentCode,
        course ? `${course.courseCode} - ${course.courseName}` : (s.courseName || 'None'),
        s.votedAt ? new Date(s.votedAt).toLocaleString() : '',
        s.status
      ];
    });

    const allocWs = XLSX.utils.aoa_to_sheet([allocHeaders, ...allocRows]);
    allocWs['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 35 }, { wch: 22 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, allocWs, 'Student Allocations');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Elective_Allocations_${offering.departmentCode}_${offering.semester}_${Date.now()}.xlsx"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'no-cache'
    });
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── 18. TEACHER: Get Assigned Electives & Roster ──────────────────────────────
const getTeacherElectives = async (req, res) => {
  try {
    const teacherId = req.user.teacherId;
    const assignments = await TeacherAssignment.find({
      teacherId,
      status: 'active'
    }).populate('courseOffering').lean();

    const courseIds = assignments.map(a => a.courseId).filter(Boolean);

    const offerings = await ElectiveOffering.find({
      $or: [
        { availableCourses: { $in: courseIds } },
        { course: { $in: courseIds } }
      ],
      isFinalized: true
    }).populate('availableCourses course').lean();

    return res.json({ success: true, data: { assignments, offerings } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getTeacherElectiveRoster = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).lean();
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const enrollments = await FinalEnrollment.find({
      courseId,
      status: 'active'
    }).populate('studentId', 'rollNumber name email series semester department regularStatus contactNo registrationNo').lean();

    const students = enrollments
      .map(e => e.studentId)
      .filter(Boolean)
      .sort((a, b) => (a.rollNumber > b.rollNumber ? 1 : -1));

    return res.json({
      success: true,
      data: {
        course,
        totalStudents: students.length,
        students
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getElectiveCoursesCatalog,
  createOffering,
  getOfferings,
  getOfferingStats,
  getOfferingVotingDetails,
  checkAcademicRecords,
  updateOffering,
  deleteOffering,
  getOfferingSelections,
  updateStudentSelectionAdmin,
  bulkAssignElectives,
  finalizeOffering,
  reopenOffering,
  exportOfferingAllocations,
  getStudentEligibleOfferings,
  submitStudentVote,
  selectStudentElectives,
  submitStudentElectives,
  getTeacherElectives,
  getTeacherElectiveRoster
};
