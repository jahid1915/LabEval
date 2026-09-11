require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// Models
const Faculty = require('./models/Faculty');
const Department = require('./models/Department');
const AcademicSession = require('./models/AcademicSession');
const Semester = require('./models/Semester');
const Series = require('./models/Series');
const Course = require('./models/Course');
const CourseOffering = require('./models/CourseOffering');
const TeacherAssignment = require('./models/TeacherAssignment');
const Teacher = require('./models/Teacher');
const Student = require('./models/Student');
const Admin = require('./models/Admin');

const runMigration = async () => {
  await connectDB();
  console.log('🚀 Starting Academic Hierarchy Migration & Seeding...');

  try {
    // 1. Seed Faculties
    const facultiesData = [
      {
        name: 'Faculty of Electrical & Computer Engineering',
        code: 'ECE_FACULTY',
        deanName: 'Prof. Dr. M. Nazrul Islam',
        description: 'Electrical, Electronics, Telecommunication, and Computer Engineering faculties.'
      },
      {
        name: 'Faculty of Mechanical Engineering',
        code: 'ME_FACULTY',
        deanName: 'Prof. Dr. Md. Emdadul Hoque',
        description: 'Mechanical, Industrial Production, Materials, and Chemical Engineering.'
      },
      {
        name: 'Faculty of Civil Engineering',
        code: 'CE_FACULTY',
        deanName: 'Prof. Dr. N. H. M. Kamruzzaman',
        description: 'Civil Engineering, Building Engineering & Construction, Architecture.'
      }
    ];

    const facultyDocs = {};
    for (const f of facultiesData) {
      const doc = await Faculty.findOneAndUpdate(
        { code: f.code },
        { ...f, status: 'active' },
        { upsert: true, new: true }
      );
      facultyDocs[f.code] = doc;
    }
    console.log('✅ Faculties initialized.');

    // 2. Seed Departments
    const departmentsData = [
      { name: 'Electronics & Telecommunication Engineering', code: 'ETE', faculty: facultyDocs['ECE_FACULTY']._id, headName: 'Prof. Dr. Md. Faruk Hossain' },
      { name: 'Computer Science & Engineering', code: 'CSE', faculty: facultyDocs['ECE_FACULTY']._id, headName: 'Prof. Dr. Al-Amin Khan' },
      { name: 'Electrical & Electronic Engineering', code: 'EEE', faculty: facultyDocs['ECE_FACULTY']._id, headName: 'Prof. Dr. Md. Selim Hossain' },
      { name: 'Electrical & Computer Engineering', code: 'ECE', faculty: facultyDocs['ECE_FACULTY']._id, headName: 'Prof. Dr. Md. Shahidul Islam' },
      { name: 'Mechanical Engineering', code: 'ME', faculty: facultyDocs['ME_FACULTY']._id, headName: 'Prof. Dr. Md. Rokonuzzaman' },
      { name: 'Industrial & Production Engineering', code: 'IPE', faculty: facultyDocs['ME_FACULTY']._id, headName: 'Prof. Dr. Mosharraf Hossain' },
      { name: 'Materials Science & Engineering', code: 'MSE', faculty: facultyDocs['ME_FACULTY']._id, headName: 'Prof. Dr. Sajal Kumar' },
      { name: 'Civil Engineering', code: 'CIVIL', faculty: facultyDocs['CE_FACULTY']._id, headName: 'Prof. Dr. Md. Mahmudur Rahman' },
      { name: 'Architecture', code: 'ARCHI', faculty: facultyDocs['CE_FACULTY']._id, headName: 'Prof. Ar. Nusrat Jahan' },
      { name: 'Building Engineering & Construction Management', code: 'BECM', faculty: facultyDocs['CE_FACULTY']._id, headName: 'Prof. Dr. Tariqul Islam' },
      { name: 'Mechatronics Engineering', code: 'MTE', faculty: facultyDocs['ME_FACULTY']._id, headName: 'Prof. Dr. Firoz Alam' },
      { name: 'Chemical & Materials Engineering', code: 'CME', faculty: facultyDocs['ME_FACULTY']._id, headName: 'Prof. Dr. Kamrul Hasan' }
    ];

    const departmentDocs = {};
    for (const d of departmentsData) {
      const doc = await Department.findOneAndUpdate(
        { code: d.code },
        { ...d, status: 'active' },
        { upsert: true, new: true }
      );
      departmentDocs[d.code] = doc;
    }
    console.log('✅ Departments initialized.');

    // 3. Seed Academic Sessions
    const sessionsData = [
      { name: '2025-2026', year: 2026, isCurrent: true, status: 'active' },
      { name: '2024-2025', year: 2025, isCurrent: false, status: 'active' },
      { name: '2023-2024', year: 2024, isCurrent: false, status: 'archived' }
    ];

    const sessionDocs = {};
    for (const s of sessionsData) {
      const doc = await AcademicSession.findOneAndUpdate(
        { name: s.name },
        s,
        { upsert: true, new: true }
      );
      sessionDocs[s.name] = doc;
    }
    console.log('✅ Academic Sessions initialized.');

    // 4. Seed Semesters for current session
    const currentSession = sessionDocs['2025-2026'];
    const semestersData = [
      { name: '1st Semester', code: '1st', academicSession: currentSession._id, isCurrent: true, status: 'active' },
      { name: '2nd Semester', code: '2nd', academicSession: currentSession._id, isCurrent: false, status: 'upcoming' }
    ];

    const semesterDocs = {};
    for (const sm of semestersData) {
      const doc = await Semester.findOneAndUpdate(
        { academicSession: sm.academicSession, code: sm.code },
        sm,
        { upsert: true, new: true }
      );
      semesterDocs[sm.code] = doc;
    }
    console.log('✅ Semesters initialized.');

    // 5. Seed Series for major departments
    const seriesList = ['20', '21', '22', '23', '24', '25', '2020', '2021', '2022', '2023', '2024', '2025'];
    for (const [deptCode, deptDoc] of Object.entries(departmentDocs)) {
      for (const sName of seriesList) {
        await Series.findOneAndUpdate(
          { name: sName, department: deptDoc._id },
          {
            name: sName,
            department: deptDoc._id,
            departmentCode: deptCode,
            academicSession: currentSession._id,
            status: 'active'
          },
          { upsert: true, new: true }
        );
      }
    }
    console.log('✅ Series cohorts initialized.');

    // 6. Update existing Teachers and Students with department & status refs
    const teachers = await Teacher.find({});
    for (const t of teachers) {
      const deptCode = (t.department || 'ETE').toUpperCase();
      const dept = departmentDocs[deptCode] || departmentDocs['ETE'];
      t.department = deptCode;
      t.departmentRef = dept ? dept._id : null;
      t.facultyRef = dept ? dept.faculty : null;
      if (!t.dutyStatus) t.dutyStatus = 'ON_DUTY';
      if (!t.designation) t.designation = 'Assistant Professor';
      await t.save();
    }
    console.log(`✅ ${teachers.length} Teachers linked to academic hierarchy.`);

    const students = await Student.find({});
    for (const st of students) {
      const deptCode = (st.department || 'ETE').toUpperCase();
      const dept = departmentDocs[deptCode] || departmentDocs['ETE'];
      st.department = deptCode;
      st.departmentRef = dept ? dept._id : null;
      st.facultyRef = dept ? dept.faculty : null;
      st.academicSessionRef = currentSession._id;
      if (!st.status) st.status = 'active';
      await st.save();
    }
    console.log(`✅ ${students.length} Students linked to academic hierarchy.`);

    // 7. Migrate existing Courses into Master Courses + Offerings + TeacherAssignments
    const existingCourses = await Course.find({});
    for (const c of existingCourses) {
      const deptCode = (c.department || 'ETE').toUpperCase();
      const dept = departmentDocs[deptCode] || departmentDocs['ETE'];
      
      // Update master course fields
      c.department = dept ? dept._id : null;
      c.departmentCode = deptCode;
      c.faculty = dept ? dept.faculty : null;
      c.courseType = 'Lab';
      if (!c.credit) c.credit = 1.5;
      await c.save();

      // Create Course Offering if teacher and series exist
      if (c.series) {
        const sName = c.series;
        const seriesDoc = await Series.findOne({ name: sName, departmentCode: deptCode });
        
        let offering = await CourseOffering.findOne({
          courseCode: c.courseCode,
          seriesName: sName,
          sessionName: '2025-2026'
        });

        if (!offering) {
          offering = await CourseOffering.create({
            course: c._id,
            courseCode: c.courseCode,
            courseName: c.courseName,
            department: dept ? dept._id : null,
            departmentCode: deptCode,
            series: seriesDoc ? seriesDoc._id : null,
            seriesName: sName,
            academicSession: currentSession._id,
            sessionName: '2025-2026',
            semester: semesterDocs['1st'] ? semesterDocs['1st']._id : null,
            semesterName: '1st Semester',
            assessmentConfig: c.assessmentConfig || {},
            status: 'active'
          });
        }

        // Create TeacherAssignment if teacherId present
        if (c.teacherId) {
          const teacherDoc = await Teacher.findOne({ teacherId: c.teacherId });
          if (teacherDoc) {
            await TeacherAssignment.findOneAndUpdate(
              { courseOffering: offering._id, teacher: teacherDoc._id },
              {
                courseOffering: offering._id,
                teacher: teacherDoc._id,
                teacherId: teacherDoc.teacherId,
                role: 'PRIMARY',
                status: 'active'
              },
              { upsert: true, new: true }
            );
          }
        }
      }
    }
    console.log(`✅ Migrated ${existingCourses.length} courses into master catalog & offerings.`);

    console.log('🎉 Academic Hierarchy & Migration Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Error:', error);
    process.exit(1);
  }
};

runMigration();
