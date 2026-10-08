const mongoose = require('mongoose');
const SupervisionAssignment = require('../models/SupervisionAssignment');
const Project = require('../models/Project');
const ProjectActivity = require('../models/ProjectActivity');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Department = require('../models/Department');
const AcademicSession = require('../models/AcademicSession');
const AuditLog = require('../models/AuditLog');

// Helper to get authenticated Head's department
const getHeadDept = (req) => {
  return (req.user?.departmentCode || req.user?.department || '').toUpperCase();
};

// ── HEAD: GET /api/head/supervision/overview ──────────────────────────
const getHeadSupervisionOverview = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    if (!deptCode) return res.status(403).json({ success: false, message: 'Unauthorized department access' });

    const [teachers, assignments, projects] = await Promise.all([
      Teacher.find({ department: deptCode, status: { $ne: 'inactive' } }).select('name teacherId designation email').lean(),
      SupervisionAssignment.find({ departmentCode: deptCode, status: 'active' }).lean(),
      Project.find({ departmentCode: deptCode, status: 'in_progress' }).lean()
    ]);

    // Aggregate by teacher
    const teacherMap = new Map();
    teachers.forEach(t => {
      teacherMap.set(String(t._id), {
        _id: t._id,
        name: t.name,
        teacherId: t.teacherId,
        designation: t.designation || 'Lecturer',
        email: t.email || '',
        counts: {
          PROJECT_I: 0,
          PROJECT_II: 0,
          SEMINAR: 0,
          THESIS: 0,
          total: 0
        },
        projectsCount: 0
      });
    });

    assignments.forEach(a => {
      const tKey = String(a.teacher);
      if (teacherMap.has(tKey)) {
        const obj = teacherMap.get(tKey);
        if (obj.counts[a.activityType] !== undefined) {
          obj.counts[a.activityType] += 1;
        }
        obj.counts.total += 1;
      }
    });

    projects.forEach(p => {
      const pKey = String(p.primarySupervisor);
      if (teacherMap.has(pKey)) {
        teacherMap.get(pKey).projectsCount += 1;
      }
    });

    const summary = {
      totalAssignments: assignments.length,
      projectI: assignments.filter(a => a.activityType === 'PROJECT_I').length,
      projectII: assignments.filter(a => a.activityType === 'PROJECT_II').length,
      seminar: assignments.filter(a => a.activityType === 'SEMINAR').length,
      thesis: assignments.filter(a => a.activityType === 'THESIS').length,
      activeProjectsCount: projects.length
    };

    res.json({
      success: true,
      department: deptCode,
      summary,
      teachers: Array.from(teacherMap.values()).sort((a, b) => b.counts.total - a.counts.total)
    });
  } catch (error) {
    console.error('getHeadSupervisionOverview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── HEAD: GET /api/head/supervision/list ──────────────────────────────
const getHeadSupervisionList = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const { activityType, session, series, teacherId, page = 1, limit = 50 } = req.query;

    const query = { departmentCode: deptCode };
    if (activityType) query.activityType = activityType;
    if (session) query.academicSession = session;
    if (series) query.series = series;
    if (teacherId) query.teacher = teacherId;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [total, assignments, projects] = await Promise.all([
      SupervisionAssignment.countDocuments(query),
      SupervisionAssignment.find(query)
        .populate('student', 'name rollNumber registrationNumber session series semester')
        .populate('teacher', 'name teacherId designation')
        .populate('project', 'title progress status milestones')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Project.find({ departmentCode: deptCode, ...(activityType ? { activityType } : {}) })
        .populate('primarySupervisor', 'name teacherId designation')
        .populate('coSupervisor', 'name teacherId designation')
        .sort({ updatedAt: -1 })
        .lean()
    ]);

    res.json({
      success: true,
      department: deptCode,
      assignments,
      projects,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('getHeadSupervisionList error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── HEAD: GET /api/head/supervision/eligible-students ──────────────────
const getHeadEligibleSupervisionStudents = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const { activityType = 'PROJECT_I', session, series, semester } = req.query;

    if (!session || !series) {
      return res.status(400).json({ success: false, message: 'Session and Series are required to find eligible students' });
    }

    const query = {
      department: deptCode,
      series: String(series).trim(),
      status: 'active'
    };

    // Match session canonical or string
    query.$or = [
      { session: session },
      { session: session.replace('-20', '-') },
      { session: session.replace('-', '-20') }
    ];

    if (semester) query.semester = semester;

    // Fetch active students
    const students = await Student.find(query)
      .select('name rollNumber registrationNumber series session semester status')
      .sort({ rollNumber: 1 })
      .lean();

    // Check existing assignments for this activityType
    const existing = await SupervisionAssignment.find({
      departmentCode: deptCode,
      activityType,
      academicSession: session,
      status: 'active'
    }).select('student studentRoll teacherName role project').lean();

    const assignedMap = new Map();
    existing.forEach(a => {
      assignedMap.set(String(a.student), a);
    });

    // If Project-II, check Project-I completion status (Section 26)
    let projectICompletedMap = new Map();
    if (activityType === 'PROJECT_II') {
      const p1Assignments = await SupervisionAssignment.find({
        departmentCode: deptCode,
        activityType: 'PROJECT_I',
        status: { $in: ['active', 'completed'] }
      }).select('student status').lean();

      p1Assignments.forEach(p1 => {
        projectICompletedMap.set(String(p1.student), p1.status);
      });
    }

    const annotatedStudents = students.map(s => {
      const assignment = assignedMap.get(String(s._id));
      const hasAssignment = !!assignment;
      const isEligibleForP2 = activityType === 'PROJECT_II' ? projectICompletedMap.has(String(s._id)) : true;

      return {
        ...s,
        isAssigned: hasAssignment,
        currentSupervisor: assignment ? assignment.teacherName : null,
        currentProjectId: assignment?.project || null,
        eligibleForP2: isEligibleForP2
      };
    });

    res.json({
      success: true,
      department: deptCode,
      activityType,
      totalStudents: students.length,
      availableCount: annotatedStudents.filter(s => !s.isAssigned).length,
      students: annotatedStudents
    });
  } catch (error) {
    console.error('getHeadEligibleSupervisionStudents error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── HEAD: POST /api/head/supervision/assign ───────────────────────────
const createSupervisionAssignment = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const {
      activityType = 'PROJECT_I',
      session,
      series,
      semester = '4th',
      teacherId,
      coTeacherId,
      studentIds, // Array of student ObjectIds
      projectTitle,
      projectDescription,
      notes
    } = req.body;

    if (!session || !series || !teacherId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Academic session, series, supervisor, and at least one student are required'
      });
    }

    // Verify supervisor belongs to Head's department
    const teacherDoc = await Teacher.findOne({
      _id: teacherId,
      department: deptCode,
      status: { $ne: 'inactive' }
    });
    if (!teacherDoc) {
      return res.status(400).json({ success: false, message: 'Selected primary supervisor is invalid or does not belong to your department' });
    }

    let coTeacherDoc = null;
    if (coTeacherId) {
      coTeacherDoc = await Teacher.findOne({ _id: coTeacherId, department: deptCode });
    }

    const deptDoc = await Department.findOne({ code: deptCode }).lean();

    // Verify students belong to Head's department
    const studentDocs = await Student.find({
      _id: { $in: studentIds },
      department: deptCode
    }).lean();

    if (studentDocs.length !== studentIds.length) {
      return res.status(400).json({ success: false, message: 'One or more students do not belong to your department' });
    }

    // Check duplicate assignments (Section 25)
    const existingDuplicates = await SupervisionAssignment.find({
      student: { $in: studentIds },
      activityType,
      academicSession: session,
      role: 'PRIMARY_SUPERVISOR',
      status: 'active'
    }).lean();

    if (existingDuplicates.length > 0) {
      const dupRolls = existingDuplicates.map(d => d.studentRoll).join(', ');
      return res.status(400).json({
        success: false,
        message: `Student(s) [${dupRolls}] already have an active supervisor for ${activityType} in session ${session}. Duplicate supervision is prevented.`
      });
    }

    // Create or Link Project Team
    const title = (projectTitle && projectTitle.trim()) || `${activityType} Team - ${studentDocs[0].rollNumber}`;
    const projectDoc = await Project.create({
      title,
      description: projectDescription || '',
      activityType,
      department: deptDoc?._id || studentDocs[0].departmentRef,
      departmentCode: deptCode,
      faculty: deptDoc?.faculty || null,
      academicSession: session,
      series: String(series).trim(),
      semester: semester || '4th',
      primarySupervisor: teacherDoc._id,
      primarySupervisorId: teacherDoc.teacherId,
      primarySupervisorName: teacherDoc.name,
      coSupervisor: coTeacherDoc?._id || null,
      coSupervisorId: coTeacherDoc?.teacherId || '',
      coSupervisorName: coTeacherDoc?.name || '',
      students: studentDocs.map(s => ({
        student: s._id,
        rollNumber: s.rollNumber,
        name: s.name
      })),
      milestones: [
        { title: 'Project Proposal & Problem Statement', description: 'Initial literature and scope definition', status: 'pending' },
        { title: 'System Design & Methodology', description: 'Architecture, mathematical model or circuit diagram', status: 'pending' },
        { title: 'Implementation & Simulation / Prototype', description: 'Execution and testing phase', status: 'pending' },
        { title: 'Final Report & Defense', description: 'Documentation and presentation', status: 'pending' }
      ],
      progress: 0,
      status: 'in_progress',
      createdBy: req.user._id
    });

    // Create individual SupervisionAssignment records
    const assignmentDocs = [];
    for (const s of studentDocs) {
      assignmentDocs.push({
        student: s._id,
        studentRoll: s.rollNumber,
        studentName: s.name,
        teacher: teacherDoc._id,
        teacherId: teacherDoc.teacherId,
        teacherName: teacherDoc.name,
        department: deptDoc?._id || s.departmentRef,
        departmentCode: deptCode,
        faculty: deptDoc?.faculty || null,
        academicSession: session,
        series: String(series).trim(),
        semester: semester || '4th',
        activityType,
        project: projectDoc._id,
        role: 'PRIMARY_SUPERVISOR',
        status: 'active',
        assignedBy: req.user._id,
        assignedByName: req.user.name || 'Department Head',
        notes: notes || ''
      });
    }

    const createdAssignments = await SupervisionAssignment.insertMany(assignmentDocs);

    // Initial project activity log
    await ProjectActivity.create({
      project: projectDoc._id,
      student: null,
      studentRoll: '',
      studentName: 'System',
      activityType: 'GENERAL_UPDATE',
      description: `Project team initialized by Department Head for ${activityType} under supervisor ${teacherDoc.name}.`
    });

    // Audit Log (Section 61)
    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      userName: req.user.name,
      action: `${activityType}_SUPERVISOR_ASSIGNED`,
      entity: 'SupervisionAssignment',
      entityId: String(projectDoc._id),
      details: `Assigned supervisor ${teacherDoc.name} (${teacherDoc.teacherId}) to ${studentDocs.length} students for ${activityType} (${session})`
    }).catch(e => console.error('AuditLog error:', e.message));

    res.status(201).json({
      success: true,
      message: `Successfully assigned ${studentDocs.length} student(s) to ${teacherDoc.name} for ${activityType}.`,
      project: projectDoc,
      assignments: createdAssignments
    });
  } catch (error) {
    console.error('createSupervisionAssignment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── HEAD: DELETE /api/head/supervision/:assignmentId ──────────────────
const cancelSupervisionAssignment = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const { assignmentId } = req.params;

    const assignment = await SupervisionAssignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ success: false, message: 'Supervision assignment not found' });

    if (assignment.departmentCode !== deptCode) {
      return res.status(403).json({ success: false, message: 'Forbidden: Assignment belongs to another department' });
    }

    assignment.status = 'cancelled';
    await assignment.save();

    // Also update project team if attached
    if (assignment.project) {
      await Project.updateOne(
        { _id: assignment.project },
        { $pull: { students: { student: assignment.student } } }
      );
    }

    res.json({ success: true, message: 'Supervision assignment successfully cancelled' });
  } catch (error) {
    console.error('cancelSupervisionAssignment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── HEAD: GET /api/head/my-academic ───────────────────────────────────
// Head personal academic section ("My Teaching" & "My Supervision")
const getHeadPersonalAcademic = async (req, res) => {
  try {
    const deptCode = getHeadDept(req);
    const user = req.user;

    // Find teacher profile matching head
    const teacherDoc = await Teacher.findOne({
      $or: [
        { _id: user.profileRef },
        { teacherId: user.loginIdentifier?.toUpperCase() },
        { email: user.email }
      ]
    }).lean();

    if (!teacherDoc) {
      return res.json({
        success: true,
        isTeacher: false,
        courses: [],
        supervision: {
          PROJECT_I: [],
          PROJECT_II: [],
          SEMINAR: [],
          THESIS: []
        }
      });
    }

    const TeacherAssignment = require('../models/TeacherAssignment');
    const [courses, supervisions, projects] = await Promise.all([
      TeacherAssignment.find({ teacher: teacherDoc._id, status: 'active' }).populate('courseId').lean(),
      SupervisionAssignment.find({ teacher: teacherDoc._id, status: 'active' })
        .populate('student', 'name rollNumber registrationNumber session series')
        .populate('project', 'title progress status milestones')
        .lean(),
      Project.find({ primarySupervisor: teacherDoc._id, status: 'in_progress' }).lean()
    ]);

    const supervisionGroups = {
      PROJECT_I: supervisions.filter(s => s.activityType === 'PROJECT_I'),
      PROJECT_II: supervisions.filter(s => s.activityType === 'PROJECT_II'),
      SEMINAR: supervisions.filter(s => s.activityType === 'SEMINAR'),
      THESIS: supervisions.filter(s => s.activityType === 'THESIS')
    };

    res.json({
      success: true,
      teacherProfile: teacherDoc,
      stats: {
        assignedCoursesCount: courses.length,
        projectStudentsCount: supervisionGroups.PROJECT_I.length + supervisionGroups.PROJECT_II.length,
        seminarStudentsCount: supervisionGroups.SEMINAR.length,
        thesisStudentsCount: supervisionGroups.THESIS.length
      },
      courses,
      supervision: supervisionGroups,
      projects
    });
  } catch (error) {
    console.error('getHeadPersonalAcademic error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── STUDENT: GET /api/student/supervision ─────────────────────────────
const getStudentSupervision = async (req, res) => {
  try {
    const studentId = req.user._id || req.user.profileRef;
    const sRoll = (req.user.rollNumber || req.user.loginIdentifier || '').toUpperCase();

    let student = null;
    if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
      student = await Student.findById(studentId).lean();
    }
    if (!student && sRoll) {
      student = await Student.findOne({ rollNumber: sRoll }).lean();
    }
    if (!student && (req.user.userId || req.user._id)) {
      student = await Student.findOne({ user: req.user.userId || req.user._id }).lean();
    }

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const assignments = await SupervisionAssignment.find({
      student: student._id,
      status: 'active'
    })
      .populate('teacher', 'name teacherId designation email contactNo')
      .populate('project')
      .lean();

    // Enhance each assignment with full team member details
    const enhanced = await Promise.all(assignments.map(async (a) => {
      let teamMembers = [];
      let projectDetails = a.project;

      if (a.project?._id) {
        const fullProj = await Project.findById(a.project._id)
          .populate('primarySupervisor', 'name teacherId designation email')
          .populate('students.student', 'name rollNumber session series semester email')
          .lean();

        if (fullProj) {
          projectDetails = fullProj;
          teamMembers = (fullProj.students || []).map(m => ({
            _id: m.student?._id || m.student,
            rollNumber: m.rollNumber,
            name: m.name,
            email: m.student?.email || '',
            isMe: m.rollNumber?.toUpperCase() === sRoll
          }));
        }
      }

      return {
        _id: a._id,
        activityType: a.activityType,
        academicSession: a.academicSession,
        series: a.series,
        semester: a.semester,
        supervisor: a.teacher,
        project: projectDetails,
        teamMembers
      };
    }));

    res.json({
      success: true,
      supervisions: enhanced
    });
  } catch (error) {
    console.error('getStudentSupervision error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── TEACHER: GET /api/teacher/supervision ─────────────────────────────
const getTeacherSupervision = async (req, res) => {
  try {
    const uTeacherId = req.user.loginIdentifier?.toUpperCase();
    const teacher = await Teacher.findOne({
      $or: [
        { _id: req.user.profileRef },
        { teacherId: uTeacherId },
        { email: req.user.email }
      ]
    }).lean();

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }

    const [assignments, projects] = await Promise.all([
      SupervisionAssignment.find({ teacher: teacher._id, status: 'active' })
        .populate('student', 'name rollNumber registrationNumber session series semester email')
        .populate('project')
        .lean(),
      Project.find({
        $or: [{ primarySupervisor: teacher._id }, { coSupervisor: teacher._id }],
        status: { $ne: 'cancelled' }
      })
        .populate('students.student', 'name rollNumber session series semester email')
        .sort({ updatedAt: -1 })
        .lean()
    ]);

    const grouped = {
      PROJECT_I: projects.filter(p => p.activityType === 'PROJECT_I'),
      PROJECT_II: projects.filter(p => p.activityType === 'PROJECT_II'),
      SEMINAR: projects.filter(p => p.activityType === 'SEMINAR'),
      THESIS: projects.filter(p => p.activityType === 'THESIS')
    };

    res.json({
      success: true,
      stats: {
        totalProjects: projects.length,
        totalSupervisees: assignments.length,
        projectICount: grouped.PROJECT_I.length,
        projectIICount: grouped.PROJECT_II.length,
        seminarCount: grouped.SEMINAR.length,
        thesisCount: grouped.THESIS.length
      },
      projects,
      groupedProjects: grouped,
      assignments
    });
  } catch (error) {
    console.error('getTeacherSupervision error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getHeadSupervisionOverview,
  getHeadSupervisionList,
  getHeadEligibleSupervisionStudents,
  createSupervisionAssignment,
  cancelSupervisionAssignment,
  getHeadPersonalAcademic,
  getStudentSupervision,
  getTeacherSupervision
};
