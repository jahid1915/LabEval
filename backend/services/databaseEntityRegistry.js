/**
 * Central Database Entity Registry
 * Defines model metadata, classification, permissions, projections,
 * editable fields, protected fields, and dependency checks for the Admin Database Management Portal.
 */

const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const AcademicSession = require('../models/AcademicSession');
const Series = require('../models/Series');
const Semester = require('../models/Semester');
const Course = require('../models/Course');
const CourseOffering = require('../models/CourseOffering');
const TeacherAssignment = require('../models/TeacherAssignment');
const Enrollment = require('../models/Enrollment');
const ElectiveOffering = require('../models/ElectiveOffering');
const ElectiveSelection = require('../models/ElectiveSelection');
const Project = require('../models/Project');
const SupervisionAssignment = require('../models/SupervisionAssignment');
const Attendance = require('../models/Attendance');
const FinalResult = require('../models/FinalResult');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');
const AuditLog = require('../models/AuditLog');
const ImportJob = require('../models/ImportJob');
const HeadshipTransferRequest = require('../models/HeadshipTransferRequest');
const DepartmentHeadHistory = require('../models/DepartmentHeadHistory');
const DataCorrectionRequest = require('../models/DataCorrectionRequest');

const ENTITY_REGISTRY = {
  // ── 1. USERS & ACCOUNTS ───────────────────────────────────────────────────
  users: {
    key: 'users',
    label: 'Central Users',
    modelName: 'User',
    model: User,
    category: 'SYSTEM_PROTECTED',
    canCreate: false,
    colorTheme: {
      accent: '#e11d48',
      badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
      badgeText: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800'
    },
    description: 'Centralized authentication identities and security credentials.',
    icon: 'Shield',
    searchFields: ['loginIdentifier', 'name', 'email', 'phone', 'department'],
    filterFields: [
      { key: 'role', label: 'Role', options: ['student', 'teacher', 'department_head', 'admin'] },
      { key: 'status', label: 'Status', options: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
      { key: 'department', label: 'Department' }
    ],
    defaultSort: { createdAt: -1 },
    listFields: [
      { key: 'loginIdentifier', label: 'Login ID', sortable: true },
      { key: 'name', label: 'Name', sortable: true },
      { key: 'role', label: 'Role', sortable: true, badge: true },
      { key: 'department', label: 'Department', sortable: true },
      { key: 'status', label: 'Status', sortable: true, badge: true },
      { key: 'email', label: 'Email' },
      { key: 'lastLoginAt', label: 'Last Login', date: true }
    ],
    detailFields: ['loginIdentifier', 'name', 'email', 'phone', 'role', 'status', 'department', 'lastLoginAt', 'createdAt'],
    editableFields: ['name', 'email', 'phone', 'status', 'department'],
    protectedFields: ['passwordHash', 'resetPasswordToken', 'resetPasswordExpires', 'failedLoginAttempts', 'lockoutUntil'],
    deletePolicy: 'ARCHIVE_ONLY',
    checkDependencies: async (id) => {
      const user = await User.findById(id).lean();
      if (!user) return { count: 0, details: [] };
      let count = 0;
      const details = [];
      if (user.role === 'student') {
        const s = await Student.countDocuments({ user: id });
        if (s > 0) { count += s; details.push({ name: 'Student Profile', count: s }); }
      } else if (user.role === 'teacher') {
        const t = await Teacher.countDocuments({ user: id });
        if (t > 0) { count += t; details.push({ name: 'Teacher Profile', count: t }); }
      }
      return { count, details };
    }
  },

  // ── 2. STUDENTS ───────────────────────────────────────────────────────────
  students: {
    key: 'students',
    label: 'Students',
    modelName: 'Student',
    model: Student,
    category: 'MANAGEABLE',
    canCreate: true,
    colorTheme: {
      accent: '#0284c7',
      badgeBg: 'bg-sky-50 dark:bg-sky-950/40',
      badgeText: 'text-sky-700 dark:text-sky-300',
      border: 'border-sky-200 dark:border-sky-800'
    },
    description: 'Student master identity, enrollment credentials, and academic status.',
    icon: 'Users',
    searchFields: ['rollNumber', 'name', 'registrationNumber', 'email', 'department'],
    filterFields: [
      { key: 'department', label: 'Department' },
      { key: 'series', label: 'Series' },
      { key: 'status', label: 'Status', options: ['active', 'inactive', 'graduated', 'suspended'] },
      { key: 'regularStatus', label: 'Type', options: ['Regular', 'Irregular'] }
    ],
    defaultSort: { rollNumber: 1 },
    listFields: [
      { key: 'rollNumber', label: 'Roll Number', sortable: true },
      { key: 'name', label: 'Name', sortable: true },
      { key: 'department', label: 'Department', sortable: true },
      { key: 'series', label: 'Series', sortable: true },
      { key: 'registrationNumber', label: 'Registration' },
      { key: 'status', label: 'Status', sortable: true, badge: true },
      { key: 'regularStatus', label: 'Regularity' }
    ],
    detailFields: [
      'rollNumber', 'name', 'department', 'series', 'session', 'registrationNumber',
      'email', 'contactNo', 'gender', 'bloodGroup', 'address', 'status', 'regularStatus', 'createdAt'
    ],
    editableFields: [
      'name', 'registrationNumber', 'department', 'series', 'session',
      'contactNo', 'email', 'status', 'regularStatus', 'gender', 'bloodGroup', 'address', 'section'
    ],
    createFields: [
      { key: 'rollNumber', label: 'Roll Number', type: 'text', required: true, uppercase: true, placeholder: 'e.g. 2208001' },
      { key: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'e.g. Jahid Hasan' },
      { key: 'department', label: 'Department', type: 'select', reference: 'departments', required: true, placeholder: 'Select department' },
      { key: 'series', label: 'Series / Batch', type: 'select', reference: 'series', required: true, placeholder: 'Select series' },
      { key: 'registrationNumber', label: 'Registration No (Initial Password)', type: 'text', required: false, placeholder: 'e.g. 102938' },
      { key: 'session', label: 'Academic Session', type: 'select', reference: 'sessions', required: false, placeholder: 'Select session' },
      { key: 'semester', label: 'Current Semester', type: 'select', options: ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester'], required: false, defaultValue: '1st Semester' },
      { key: 'section', label: 'Section', type: 'text', uppercase: true, required: false, placeholder: 'e.g. A or B' },
      { key: 'regularStatus', label: 'Regularity Status', type: 'select', options: ['Regular', 'Irregular'], required: true, defaultValue: 'Regular' },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'graduated', 'suspended'], required: true, defaultValue: 'active' },
      { key: 'contactNo', label: 'Contact Phone', type: 'text', required: false, placeholder: 'e.g. 01700000000' },
      { key: 'email', label: 'Email Address', type: 'email', required: false, placeholder: 'e.g. student@ruet.ac.bd' }
    ],
    protectedFields: ['password', 'enrolledCourses', '__v'],
    deletePolicy: 'SAFE_CHECK',
    checkDependencies: async (id) => {
      const student = await Student.findById(id).lean();
      if (!student) return { count: 0, details: [] };
      const [enrollments, attendance, results, supervision, votes] = await Promise.all([
        Enrollment.countDocuments({ studentId: id }),
        Attendance.countDocuments({ studentRoll: student.rollNumber }),
        FinalResult.countDocuments({ studentRoll: student.rollNumber }),
        SupervisionAssignment.countDocuments({ student: id }),
        ElectiveSelection.countDocuments({ student: id })
      ]);
      const details = [];
      if (enrollments > 0) details.push({ name: 'Course Enrollments', count: enrollments });
      if (attendance > 0) details.push({ name: 'Attendance Records', count: attendance });
      if (results > 0) details.push({ name: 'Marks & Results', count: results });
      if (supervision > 0) details.push({ name: 'Supervision Projects', count: supervision });
      if (votes > 0) details.push({ name: 'Elective Votes', count: votes });
      const total = enrollments + attendance + results + supervision + votes;
      return { count: total, details };
    }
  },

  // ── 3. TEACHERS ───────────────────────────────────────────────────────────
  teachers: {
    key: 'teachers',
    label: 'Teachers',
    modelName: 'Teacher',
    model: Teacher,
    category: 'MANAGEABLE',
    canCreate: true,
    colorTheme: {
      accent: '#4f46e5',
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
      badgeText: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-200 dark:border-indigo-800'
    },
    description: 'Faculty members, designations, and departmental appointments.',
    icon: 'GraduationCap',
    searchFields: ['teacherId', 'name', 'email', 'department', 'designation'],
    filterFields: [
      { key: 'department', label: 'Department' },
      { key: 'designation', label: 'Designation' },
      { key: 'status', label: 'Status', options: ['active', 'inactive', 'on_leave'] }
    ],
    defaultSort: { teacherId: 1 },
    listFields: [
      { key: 'teacherId', label: 'Teacher ID', sortable: true },
      { key: 'name', label: 'Name', sortable: true },
      { key: 'department', label: 'Department', sortable: true },
      { key: 'designation', label: 'Designation', sortable: true },
      { key: 'email', label: 'Email' },
      { key: 'status', label: 'Status', badge: true }
    ],
    detailFields: [
      'teacherId', 'name', 'department', 'designation', 'email', 'contactNo',
      'status', 'dutyStatus', 'roomNo', 'specialization', 'createdAt'
    ],
    editableFields: [
      'name', 'department', 'designation', 'email', 'contactNo',
      'status', 'dutyStatus', 'roomNo', 'specialization'
    ],
    createFields: [
      { key: 'teacherId', label: 'Teacher ID / Code', type: 'text', required: true, uppercase: true, placeholder: 'e.g. ETE-T01' },
      { key: 'name', label: 'Teacher Full Name', type: 'text', required: true, placeholder: 'e.g. Dr. Md. Faruk Hossain' },
      { key: 'department', label: 'Department', type: 'select', reference: 'departments', required: true, placeholder: 'Select department' },
      { key: 'designation', label: 'Designation', type: 'select', options: ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'], required: true, defaultValue: 'Lecturer' },
      { key: 'contactNo', label: 'Phone Number', type: 'text', required: true, placeholder: 'e.g. 01711000000' },
      { key: 'email', label: 'Email Address', type: 'email', required: false, placeholder: 'e.g. teacher@ruet.ac.bd' },
      { key: 'dutyStatus', label: 'Duty Status', type: 'select', options: ['ON_DUTY', 'STUDY_LEAVE', 'DEPUTATION', 'ON_LEAVE'], required: true, defaultValue: 'ON_DUTY' },
      { key: 'specialization', label: 'Research Specialization', type: 'text', required: false, placeholder: 'e.g. Wireless Communications' },
      { key: 'password', label: 'Initial Password', type: 'password', required: false, placeholder: 'Defaults to Teacher ID if empty' }
    ],
    protectedFields: ['password', '__v'],
    deletePolicy: 'SAFE_CHECK',
    checkDependencies: async (id) => {
      const [assignments, supervision, deptHead] = await Promise.all([
        TeacherAssignment.countDocuments({ teacher: id, status: 'active' }),
        SupervisionAssignment.countDocuments({ supervisor: id, status: 'active' }),
        Department.countDocuments({ headTeacher: id })
      ]);
      const details = [];
      if (assignments > 0) details.push({ name: 'Active Teaching Assignments', count: assignments });
      if (supervision > 0) details.push({ name: 'Supervised Projects', count: supervision });
      if (deptHead > 0) details.push({ name: 'Head of Department Appointment', count: deptHead });
      const total = assignments + supervision + deptHead;
      return { count: total, details };
    }
  },

  // ── 4. FACULTIES ──────────────────────────────────────────────────────────
  faculties: {
    key: 'faculties',
    label: 'Faculties',
    modelName: 'Faculty',
    model: Faculty,
    category: 'MANAGEABLE',
    canCreate: true,
    colorTheme: {
      accent: '#d97706',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
      badgeText: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800'
    },
    description: 'University academic faculties grouping related engineering departments.',
    icon: 'FolderTree',
    searchFields: ['name', 'code', 'deanName'],
    filterFields: [],
    defaultSort: { name: 1 },
    listFields: [
      { key: 'code', label: 'Code', sortable: true },
      { key: 'name', label: 'Faculty Name', sortable: true },
      { key: 'deanName', label: 'Dean' },
      { key: 'createdAt', label: 'Created', date: true }
    ],
    detailFields: ['name', 'code', 'deanName', 'description', 'createdAt'],
    editableFields: ['name', 'code', 'deanName', 'description'],
    createFields: [
      { key: 'code', label: 'Faculty Code', type: 'text', required: true, uppercase: true, placeholder: 'e.g. ECE' },
      { key: 'name', label: 'Faculty Name', type: 'text', required: true, placeholder: 'e.g. Faculty of Electrical & Computer Engineering' },
      { key: 'deanName', label: 'Dean Name', type: 'text', required: false, placeholder: 'e.g. Prof. Dr. Name' },
      { key: 'description', label: 'Description', type: 'textarea', required: false, placeholder: 'Overview of academic faculty' }
    ],
    protectedFields: ['__v'],
    deletePolicy: 'SAFE_CHECK',
    checkDependencies: async (id) => {
      const depts = await Department.countDocuments({ faculty: id });
      return {
        count: depts,
        details: depts > 0 ? [{ name: 'Child Departments', count: depts }] : []
      };
    }
  },

  // ── 5. DEPARTMENTS ────────────────────────────────────────────────────────
  departments: {
    key: 'departments',
    label: 'Departments',
    modelName: 'Department',
    model: Department,
    category: 'MANAGEABLE',
    canCreate: true,
    colorTheme: {
      accent: '#2563eb',
      badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
      badgeText: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800'
    },
    description: 'Academic engineering departments with assigned faculty and headship.',
    icon: 'Building2',
    searchFields: ['name', 'code', 'headName'],
    filterFields: [],
    defaultSort: { code: 1 },
    listFields: [
      { key: 'code', label: 'Dept Code', sortable: true },
      { key: 'name', label: 'Department Name', sortable: true },
      { key: 'headName', label: 'Current Head' },
      { key: 'status', label: 'Status', badge: true }
    ],
    detailFields: ['name', 'code', 'headName', 'status', 'description', 'createdAt'],
    editableFields: ['name', 'code', 'status', 'description', 'headName'],
    createFields: [
      { key: 'code', label: 'Department Code', type: 'text', required: true, uppercase: true, placeholder: 'e.g. ETE' },
      { key: 'name', label: 'Department Name', type: 'text', required: true, placeholder: 'e.g. Electronics and Telecommunication Engineering' },
      { key: 'faculty', label: 'Parent Faculty', type: 'select', reference: 'faculties', required: false, placeholder: 'Select parent faculty' },
      { key: 'headName', label: 'Head of Department', type: 'text', required: false, placeholder: 'e.g. Prof. Dr. Name' },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'], required: true, defaultValue: 'active' },
      { key: 'description', label: 'Description', type: 'textarea', required: false, placeholder: 'Department academic profile' }
    ],
    protectedFields: ['__v'],
    deletePolicy: 'SAFE_CHECK',
    checkDependencies: async (id) => {
      const dept = await Department.findById(id).lean();
      if (!dept) return { count: 0, details: [] };
      const code = dept.code;
      const [students, teachers, courses, series] = await Promise.all([
        Student.countDocuments({ department: code }),
        Teacher.countDocuments({ department: code }),
        Course.countDocuments({ departmentCode: code }),
        Series.countDocuments({ departmentCode: code })
      ]);
      const details = [];
      if (students > 0) details.push({ name: 'Students', count: students });
      if (teachers > 0) details.push({ name: 'Teachers', count: teachers });
      if (courses > 0) details.push({ name: 'Courses', count: courses });
      if (series > 0) details.push({ name: 'Batches / Series', count: series });
      const total = students + teachers + courses + series;
      return { count: total, details };
    }
  },

  // ── 6. ACADEMIC SESSIONS ──────────────────────────────────────────────────
  sessions: {
    key: 'sessions',
    label: 'Academic Sessions',
    modelName: 'AcademicSession',
    model: AcademicSession,
    category: 'MANAGEABLE',
    canCreate: true,
    colorTheme: {
      accent: '#059669',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800'
    },
    description: 'University academic calendar sessions (e.g. 2022-2023).',
    icon: 'Calendar',
    searchFields: ['name', 'year'],
    filterFields: [
      { key: 'status', label: 'Status', options: ['ACTIVE', 'UPCOMING', 'ARCHIVED'] },
      { key: 'isCurrent', label: 'Current Session', options: ['true', 'false'] }
    ],
    defaultSort: { year: -1 },
    listFields: [
      { key: 'name', label: 'Session Name', sortable: true },
      { key: 'year', label: 'Year', sortable: true },
      { key: 'isCurrent', label: 'Current', badge: true },
      { key: 'status', label: 'Status', badge: true }
    ],
    detailFields: ['name', 'year', 'isCurrent', 'status', 'createdAt'],
    editableFields: ['name', 'year', 'isCurrent', 'status'],
    createFields: [
      { key: 'name', label: 'Session Name', type: 'text', required: true, placeholder: 'e.g. 2023-2024' },
      { key: 'year', label: 'Session Year', type: 'number', required: true, placeholder: 'e.g. 2024' },
      { key: 'isCurrent', label: 'Is Current Running Session', type: 'boolean', defaultValue: false },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'UPCOMING', 'ARCHIVED'], required: true, defaultValue: 'ACTIVE' }
    ],
    protectedFields: ['__v'],
    deletePolicy: 'SAFE_CHECK',
    checkDependencies: async (id) => {
      const sess = await AcademicSession.findById(id).lean();
      if (!sess) return { count: 0, details: [] };
      const offerings = await CourseOffering.countDocuments({
        $or: [{ academicSession: id }, { sessionName: sess.name }]
      });
      return {
        count: offerings,
        details: offerings > 0 ? [{ name: 'Course Offerings', count: offerings }] : []
      };
    }
  },

  // ── 7. SERIES / BATCHES ───────────────────────────────────────────────────
  series: {
    key: 'series',
    label: 'Series / Batches',
    modelName: 'Series',
    model: Series,
    category: 'MANAGEABLE',
    canCreate: true,
    colorTheme: {
      accent: '#7c3aed',
      badgeBg: 'bg-violet-50 dark:bg-violet-950/40',
      badgeText: 'text-violet-700 dark:text-violet-300',
      border: 'border-violet-200 dark:border-violet-800'
    },
    description: 'Admitted student cohorts per department (e.g. Series 22).',
    icon: 'Layers',
    searchFields: ['name', 'departmentCode'],
    filterFields: [
      { key: 'departmentCode', label: 'Department' },
      { key: 'status', label: 'Status', options: ['active', 'graduated', 'archived'] }
    ],
    defaultSort: { name: -1 },
    listFields: [
      { key: 'name', label: 'Series', sortable: true },
      { key: 'departmentCode', label: 'Department', sortable: true },
      { key: 'currentSemester', label: 'Current Semester' },
      { key: 'status', label: 'Status', badge: true }
    ],
    detailFields: ['name', 'departmentCode', 'currentSemester', 'status', 'createdAt'],
    editableFields: ['name', 'departmentCode', 'currentSemester', 'status'],
    createFields: [
      { key: 'name', label: 'Series / Batch Number', type: 'text', required: true, placeholder: 'e.g. 22' },
      { key: 'departmentCode', label: 'Department', type: 'select', reference: 'departments', required: true, placeholder: 'Select department' },
      { key: 'academicSession', label: 'Academic Session', type: 'select', reference: 'sessions', required: false, placeholder: 'Select session' },
      { key: 'currentSemester', label: 'Current Semester', type: 'select', options: ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester'], required: true, defaultValue: '1st Semester' },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'graduated', 'archived'], required: true, defaultValue: 'active' }
    ],
    protectedFields: ['__v'],
    deletePolicy: 'SAFE_CHECK',
    checkDependencies: async (id) => {
      const s = await Series.findById(id).lean();
      if (!s) return { count: 0, details: [] };
      const count = await Student.countDocuments({ series: s.name, department: s.departmentCode });
      return {
        count,
        details: count > 0 ? [{ name: 'Enrolled Students in Series', count }] : []
      };
    }
  },

  // ── 8. COURSES ────────────────────────────────────────────────────────────
  courses: {
    key: 'courses',
    label: 'Courses',
    modelName: 'Course',
    model: Course,
    category: 'MANAGEABLE',
    canCreate: true,
    colorTheme: {
      accent: '#0d9488',
      badgeBg: 'bg-teal-50 dark:bg-teal-950/40',
      badgeText: 'text-teal-700 dark:text-teal-300',
      border: 'border-teal-200 dark:border-teal-800'
    },
    description: 'Master course definitions, credit hours, and syllabi.',
    icon: 'BookOpen',
    searchFields: ['courseCode', 'courseName', 'departmentCode'],
    filterFields: [
      { key: 'departmentCode', label: 'Department' },
      { key: 'courseType', label: 'Type', options: ['Theory', 'Sessional'] },
      { key: 'status', label: 'Status', options: ['active', 'inactive'] }
    ],
    defaultSort: { courseCode: 1 },
    listFields: [
      { key: 'courseCode', label: 'Course Code', sortable: true },
      { key: 'courseName', label: 'Course Title', sortable: true },
      { key: 'departmentCode', label: 'Department', sortable: true },
      { key: 'credits', label: 'Credits', sortable: true },
      { key: 'courseType', label: 'Type' },
      { key: 'status', label: 'Status', badge: true }
    ],
    detailFields: ['courseCode', 'courseName', 'departmentCode', 'credits', 'courseType', 'semesterLevel', 'status', 'description', 'createdAt'],
    editableFields: ['courseCode', 'courseName', 'departmentCode', 'credits', 'courseType', 'semesterLevel', 'status', 'description'],
    createFields: [
      { key: 'courseCode', label: 'Course Code', type: 'text', required: true, uppercase: true, placeholder: 'e.g. ETE 4101' },
      { key: 'courseName', label: 'Course Title', type: 'text', required: true, placeholder: 'e.g. Wireless & Mobile Communication' },
      { key: 'departmentCode', label: 'Department', type: 'select', reference: 'departments', required: true, placeholder: 'Select department' },
      { key: 'credits', label: 'Credit Hours', type: 'number', required: true, placeholder: 'e.g. 3.0' },
      { key: 'courseType', label: 'Course Type', type: 'select', options: ['Theory', 'Sessional'], required: true, defaultValue: 'Theory' },
      { key: 'semesterLevel', label: 'Semester Level', type: 'select', options: ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester'], required: false },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'], required: true, defaultValue: 'active' },
      { key: 'description', label: 'Description / Syllabus', type: 'textarea', required: false, placeholder: 'Course syllabus outline' }
    ],
    protectedFields: ['__v'],
    deletePolicy: 'SAFE_CHECK',
    checkDependencies: async (id) => {
      const offerings = await CourseOffering.countDocuments({ course: id, status: { $ne: 'cancelled' } });
      return {
        count: offerings,
        details: offerings > 0 ? [{ name: 'Active Course Offerings', count: offerings }] : []
      };
    }
  },

  // ── 9. COURSE OFFERINGS ───────────────────────────────────────────────────
  course_offerings: {
    key: 'course_offerings',
    label: 'Course Offerings',
    modelName: 'CourseOffering',
    model: CourseOffering,
    category: 'MANAGEABLE',
    canCreate: true,
    colorTheme: {
      accent: '#ea580c',
      badgeBg: 'bg-orange-50 dark:bg-orange-950/40',
      badgeText: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800'
    },
    description: 'Offered courses per series, academic session, and semester.',
    icon: 'Award',
    searchFields: ['courseCode', 'courseName', 'seriesName', 'sessionName', 'departmentCode'],
    filterFields: [
      { key: 'departmentCode', label: 'Department' },
      { key: 'seriesName', label: 'Series' },
      { key: 'status', label: 'Status', options: ['draft', 'active', 'completed', 'cancelled'] }
    ],
    defaultSort: { createdAt: -1 },
    listFields: [
      { key: 'courseCode', label: 'Code', sortable: true },
      { key: 'courseName', label: 'Course Title' },
      { key: 'departmentCode', label: 'Dept', sortable: true },
      { key: 'seriesName', label: 'Series', sortable: true },
      { key: 'sessionName', label: 'Session' },
      { key: 'semesterName', label: 'Semester' },
      { key: 'status', label: 'Status', badge: true }
    ],
    detailFields: ['courseCode', 'courseName', 'departmentCode', 'seriesName', 'sessionName', 'semesterName', 'status', 'enrollmentSyncStatus', 'createdAt'],
    editableFields: ['status', 'semesterName'],
    createFields: [
      { key: 'course', label: 'Master Course', type: 'select', reference: 'courses', required: true, placeholder: 'Select master course' },
      { key: 'departmentCode', label: 'Department', type: 'select', reference: 'departments', required: true, placeholder: 'Select department' },
      { key: 'seriesName', label: 'Series', type: 'select', reference: 'series', required: true, placeholder: 'Select series' },
      { key: 'sessionName', label: 'Academic Session', type: 'select', reference: 'sessions', required: true, placeholder: 'Select session' },
      { key: 'semesterName', label: 'Offered Semester', type: 'select', options: ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester'], required: true, defaultValue: '1st Semester' },
      { key: 'status', label: 'Offering Status', type: 'select', options: ['draft', 'active', 'completed', 'cancelled'], required: true, defaultValue: 'active' }
    ],
    protectedFields: ['__v'],
    deletePolicy: 'SAFE_CHECK',
    checkDependencies: async (id) => {
      const [enrollments, teachers] = await Promise.all([
        Enrollment.countDocuments({ courseOfferingId: id, status: 'ENROLLED' }),
        TeacherAssignment.countDocuments({ courseOffering: id, status: 'active' })
      ]);
      const details = [];
      if (enrollments > 0) details.push({ name: 'Active Student Enrollments', count: enrollments });
      if (teachers > 0) details.push({ name: 'Assigned Teachers', count: teachers });
      return { count: enrollments + teachers, details };
    }
  },

  // ── 10. ENROLLMENTS ───────────────────────────────────────────────────────
  enrollments: {
    key: 'enrollments',
    label: 'Enrollments',
    modelName: 'Enrollment',
    model: Enrollment,
    category: 'MANAGEABLE',
    canCreate: false,
    colorTheme: {
      accent: '#0891b2',
      badgeBg: 'bg-cyan-50 dark:bg-cyan-950/40',
      badgeText: 'text-cyan-700 dark:text-cyan-300',
      border: 'border-cyan-200 dark:border-cyan-800'
    },
    description: 'Canonical series student enrollments in offered courses.',
    icon: 'ClipboardList',
    searchFields: ['studentRoll', 'studentName', 'courseCode', 'series', 'departmentCode'],
    filterFields: [
      { key: 'departmentCode', label: 'Department' },
      { key: 'series', label: 'Series' },
      { key: 'status', label: 'Status', options: ['ENROLLED', 'DROPPED', 'COMPLETED', 'CANCELLED'] }
    ],
    defaultSort: { createdAt: -1 },
    listFields: [
      { key: 'studentRoll', label: 'Student Roll', sortable: true },
      { key: 'studentName', label: 'Student Name' },
      { key: 'courseCode', label: 'Course Code', sortable: true },
      { key: 'departmentCode', label: 'Dept' },
      { key: 'series', label: 'Series' },
      { key: 'status', label: 'Status', badge: true }
    ],
    detailFields: ['studentRoll', 'studentName', 'courseCode', 'departmentCode', 'series', 'academicSession', 'semester', 'status', 'enrolledAt'],
    editableFields: ['status'],
    protectedFields: ['__v'],
    deletePolicy: 'ARCHIVE_SUPPORTED',
    checkDependencies: async (id) => {
      const enr = await Enrollment.findById(id).lean();
      if (!enr) return { count: 0, details: [] };
      const results = await FinalResult.countDocuments({ studentRoll: enr.studentRoll, course: enr.courseCode });
      return {
        count: results,
        details: results > 0 ? [{ name: 'Marks Record for Course', count: results }] : []
      };
    }
  },

  // ── 11. TEACHER ASSIGNMENTS ───────────────────────────────────────────────
  teaching_assignments: {
    key: 'teaching_assignments',
    label: 'Teaching Assignments',
    modelName: 'TeacherAssignment',
    model: TeacherAssignment,
    category: 'MANAGEABLE',
    canCreate: false,
    colorTheme: {
      accent: '#6366f1',
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
      badgeText: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-200 dark:border-indigo-800'
    },
    description: 'Allocated faculty teachers for courses, series, and sessions.',
    icon: 'BookOpen',
    searchFields: ['teacherName', 'teacherId', 'courseCode', 'departmentCode', 'series'],
    filterFields: [
      { key: 'departmentCode', label: 'Department' },
      { key: 'series', label: 'Series' },
      { key: 'status', label: 'Status', options: ['active', 'inactive', 'replaced'] }
    ],
    defaultSort: { createdAt: -1 },
    listFields: [
      { key: 'courseCode', label: 'Course', sortable: true },
      { key: 'teacherName', label: 'Teacher', sortable: true },
      { key: 'role', label: 'Role' },
      { key: 'departmentCode', label: 'Dept' },
      { key: 'series', label: 'Series' },
      { key: 'academicSession', label: 'Session' },
      { key: 'status', label: 'Status', badge: true }
    ],
    detailFields: ['courseCode', 'courseName', 'teacherName', 'teacherId', 'role', 'departmentCode', 'series', 'academicSession', 'semester', 'status', 'createdAt'],
    editableFields: ['role', 'status', 'notes'],
    protectedFields: ['__v'],
    deletePolicy: 'ARCHIVE_SUPPORTED',
    checkDependencies: async () => ({ count: 0, details: [] })
  },

  // ── 12. PROJECTS ──────────────────────────────────────────────────────────
  projects: {
    key: 'projects',
    label: 'Projects & Workspaces',
    modelName: 'Project',
    model: Project,
    category: 'MANAGEABLE',
    canCreate: false,
    colorTheme: {
      accent: '#8b5cf6',
      badgeBg: 'bg-purple-50 dark:bg-purple-950/40',
      badgeText: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800'
    },
    description: 'Undergraduate student projects, supervision, and workspaces.',
    icon: 'Layers',
    searchFields: ['title', 'category', 'departmentCode', 'series'],
    filterFields: [
      { key: 'departmentCode', label: 'Department' },
      { key: 'category', label: 'Category', options: ['PROJECT_I', 'PROJECT_II', 'SEMINAR', 'THESIS'] },
      { key: 'status', label: 'Status', options: ['active', 'completed', 'archived'] }
    ],
    defaultSort: { createdAt: -1 },
    listFields: [
      { key: 'title', label: 'Project Title', sortable: true },
      { key: 'category', label: 'Type', badge: true },
      { key: 'departmentCode', label: 'Dept' },
      { key: 'series', label: 'Series' },
      { key: 'progress', label: 'Progress (%)' },
      { key: 'status', label: 'Status', badge: true }
    ],
    detailFields: ['title', 'category', 'departmentCode', 'series', 'academicSession', 'status', 'progress', 'description', 'createdAt'],
    editableFields: ['title', 'status', 'progress', 'description'],
    protectedFields: ['__v'],
    deletePolicy: 'SAFE_CHECK',
    checkDependencies: async (id) => {
      const count = await SupervisionAssignment.countDocuments({ project: id });
      return { count, details: count > 0 ? [{ name: 'Supervision Links', count }] : [] };
    }
  },

  // ── 13. AUDIT LOGS ────────────────────────────────────────────────────────
  audit_logs: {
    key: 'audit_logs',
    label: 'Audit Logs',
    modelName: 'AuditLog',
    model: AuditLog,
    category: 'READ_ONLY',
    canCreate: false,
    colorTheme: {
      accent: '#71717a',
      badgeBg: 'bg-zinc-50 dark:bg-zinc-950/40',
      badgeText: 'text-zinc-700 dark:text-zinc-300',
      border: 'border-zinc-200 dark:border-zinc-800'
    },
    description: 'Immutable system change history, security actions, and mutation logs.',
    icon: 'Shield',
    searchFields: ['userName', 'action', 'entity', 'details'],
    filterFields: [
      { key: 'userRole', label: 'Role', options: ['admin', 'department_head', 'teacher', 'student'] },
      { key: 'action', label: 'Action' }
    ],
    defaultSort: { timestamp: -1 },
    listFields: [
      { key: 'timestamp', label: 'Timestamp', date: true, sortable: true },
      { key: 'userName', label: 'Actor', sortable: true },
      { key: 'userRole', label: 'Role', badge: true },
      { key: 'action', label: 'Action', badge: true },
      { key: 'entity', label: 'Entity' },
      { key: 'details', label: 'Details' }
    ],
    detailFields: ['timestamp', 'userId', 'userName', 'userRole', 'action', 'entity', 'entityId', 'details', 'ipAddress', 'userAgent'],
    editableFields: [],
    protectedFields: ['*'],
    deletePolicy: 'DENIED',
    checkDependencies: async () => ({ count: 0, details: [] })
  },

  // ── 14. IMPORT JOBS ───────────────────────────────────────────────────────
  import_jobs: {
    key: 'import_jobs',
    label: 'Import Jobs',
    modelName: 'ImportJob',
    model: ImportJob,
    category: 'READ_ONLY',
    canCreate: false,
    colorTheme: {
      accent: '#c026d3',
      badgeBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',
      badgeText: 'text-fuchsia-700 dark:text-fuchsia-300',
      border: 'border-fuchsia-200 dark:border-fuchsia-800'
    },
    description: 'History of bulk XLSX / JSON student and teacher data imports.',
    icon: 'History',
    searchFields: ['fileName', 'targetEntity', 'performedByName'],
    filterFields: [
      { key: 'targetEntity', label: 'Entity', options: ['students', 'teachers'] },
      { key: 'status', label: 'Status', options: ['pending', 'processing', 'completed', 'failed', 'cancelled'] }
    ],
    defaultSort: { createdAt: -1 },
    listFields: [
      { key: 'createdAt', label: 'Date', date: true, sortable: true },
      { key: 'fileName', label: 'File' },
      { key: 'targetEntity', label: 'Target', badge: true },
      { key: 'status', label: 'Status', badge: true },
      { key: 'performedByName', label: 'Operator' }
    ],
    detailFields: ['fileName', 'targetEntity', 'status', 'summary', 'performedByName', 'createdAt'],
    editableFields: [],
    protectedFields: ['*'],
    deletePolicy: 'DENIED',
    checkDependencies: async () => ({ count: 0, details: [] })
  }
};

module.exports = {
  ENTITY_REGISTRY,
  getEntityConfig: (key) => ENTITY_REGISTRY[key] || null,
  getAllEntityKeys: () => Object.keys(ENTITY_REGISTRY)
};
