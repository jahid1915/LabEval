require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const Admin = require('./models/Admin');
const Department = require('./models/Department');
const Faculty = require('./models/Faculty');
const Course = require('./models/Course');
const CourseOffering = require('./models/CourseOffering');
const TeacherAssignment = require('./models/TeacherAssignment');
const Teacher = require('./models/Teacher');
const Student = require('./models/Student');
const FinalResult = require('./models/FinalResult');
const Request = require('./models/Request');
const AcademicSession = require('./models/AcademicSession');
const Semester = require('./models/Semester');
const Series = require('./models/Series');
const { calculateRUETGrade } = require('./utils/gradeCalculator');

async function importSessionalCourses() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is missing from .env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // 1. Locate ETE department and ECE faculty
    const eceFaculty = await Faculty.findOne({ code: 'ECE' });
    const eteDept = await Department.findOne({ code: 'ETE' });
    const eeeDept = await Department.findOne({ code: 'EEE' });
    const cseDept = await Department.findOne({ code: 'CSE' });

    if (!eteDept || !eceFaculty) {
      console.error('ETE department or ECE faculty missing.');
      process.exit(1);
    }

    // 2. Read courses.json
    const coursesPath = path.join(__dirname, 'data', 'courses.json');
    const rawData = fs.readFileSync(coursesPath, 'utf8');
    const allCourses = JSON.parse(rawData);

    // 3. Filter ONLY sessional courses as requested by user
    const sessionalCourses = allCourses.filter(c => c.isSessional === true);
    console.log(`Found ${sessionalCourses.length} SESSIONAL courses out of ${allCourses.length} total entries.`);

    // 4. Remove previous courses to guarantee ONLY sessional courses exist
    const deleteOld = await Course.deleteMany({});
    console.log(`Cleared previous courses: ${deleteOld.deletedCount} removed.`);

    // 5. Insert all 45 sessional courses
    const docsToInsert = sessionalCourses.map(c => {
      const courseCode = c.courseCode.trim().toUpperCase();
      return {
        courseCode,
        courseName: c.title.trim(),
        credit: parseFloat(c.credits) || 1.5,
        creditHours: parseFloat(c.creditHours) || 3.0,
        department: eteDept._id,
        departmentCode: 'ETE',
        faculty: eceFaculty._id,
        facultyCode: 'ECE',
        courseType: 'Sessional',
        isElective: false,
        isSessional: true,
        pairedCourseCode: c.pairedCourseCode ? c.pairedCourseCode.trim().toUpperCase() : null,
        semesterLevel: c.semester ? c.semester.trim() : '3-2',
        syllabus: c.syllabus || '',
        description: `${c.title} (RUET Sessional / Laboratory Course)`,
        defaultAssessmentConfig: {
          quiz: 20,
          labReport: 15,
          labViva: 10,
          labTest: 20,
          openEnded: 0,
          attendance: 10,
          others: 0,
          // compatibility
          performance: 10,
          report: 15,
          test: 20
        },
        status: 'active'
      };
    });

    const insertedCourses = await Course.insertMany(docsToInsert);
    console.log(`\n🎉 Successfully imported ${insertedCourses.length} SESSIONAL courses into RUET database!`);

    // Grouping summary by semester
    const bySemester = {};
    insertedCourses.forEach(c => {
      bySemester[c.semesterLevel] = (bySemester[c.semesterLevel] || 0) + 1;
    });
    console.log('Sessional course distribution by semester:', bySemester);

    // 6. Setup Academic Sessions, Semesters, Series
    const session = await AcademicSession.findOne({ name: '2024-2025' });
    const semester31 = await Semester.findOne({ code: '3-1' });
    const semester32 = await Semester.findOne({ code: '3-2' });
    const series22 = await Series.findOne({ name: '22', department: eteDept._id });

    // 7. Ensure Department Head accounts
    const eteHead = await Admin.findOneAndUpdate(
      { username: 'head-ete' },
      {
        name: 'Prof. Dr. M. A. ETE',
        username: 'head-ete',
        email: 'head@ete.ruet.ac.bd',
        contactNo: '01711223344',
        password: 'password123',
        role: 'department_head',
        designation: 'Head, Dept. of ETE',
        faculty: eceFaculty._id,
        facultyCode: 'ECE',
        facultyName: eceFaculty.name,
        department: eteDept._id,
        departmentCode: 'ETE',
        departmentName: eteDept.name,
        status: 'active'
      },
      { upsert: true, returnDocument: 'after' }
    );

    // 8. Find primary Teacher Md Abu Ismail Siddique
    let teacherAIS = await Teacher.findOne({ teacherId: 'ETE-294' });
    if (!teacherAIS) {
      teacherAIS = await Teacher.create({
        name: 'Md Abu Ismail Siddique',
        teacherId: 'ETE-294',
        designation: 'Assistant Professor',
        department: 'ETE',
        departmentRef: eteDept._id,
        facultyRef: eceFaculty._id,
        contactNo: '01712345679',
        email: 'saif101303@gmail.com',
        password: 'password123',
        role: 'teacher'
      });
    }

    // Secondary teachers for realistic assignments
    const teacherKamal = await Teacher.findOne({ teacherId: 'ETE-151' });
    const teacherMowla = await Teacher.findOne({ teacherId: 'ETE-245' });

    // 9. Assign Sessional Courses to Teachers:
    // Key course 1: EEE 3154 (Sessional based on EEE 3153) -> Md Abu Ismail Siddique (Semester 3-1)
    // Key course 2: ETE 3222 (Sessional based on ETE 3221) -> Md Abu Ismail Siddique (Semester 3-2)
    // Key course 3: ETE 3112 (Sessional based on ETE 3111) -> Md Abu Ismail Siddique (Semester 3-1)
    // Key course 4: ETE 3224 -> Dr. Md. Kamal Hosain
    // Key course 5: ETE 3226 -> Dr. Md. Mowla

    const courseEEE3154 = await Course.findOne({ courseCode: 'EEE 3154' });
    const courseETE3222 = await Course.findOne({ courseCode: 'ETE 3222' });
    const courseETE3112 = await Course.findOne({ courseCode: 'ETE 3112' });
    const courseETE3224 = await Course.findOne({ courseCode: 'ETE 3224' });
    const courseETE3226 = await Course.findOne({ courseCode: 'ETE 3226' });

    // Clear old offerings & assignments
    await CourseOffering.deleteMany({});
    await TeacherAssignment.deleteMany({});

    // Assign EEE 3154 to Md Abu Ismail Siddique
    if (courseEEE3154) {
      const offEEE3154 = await CourseOffering.create({
        course: courseEEE3154._id,
        courseCode: 'EEE 3154',
        courseName: courseEEE3154.courseName,
        department: eteDept._id,
        departmentCode: 'ETE',
        series: series22?._id,
        seriesName: '22',
        academicSession: session?._id,
        sessionName: '2024-2025',
        semester: semester31?._id,
        semesterName: '3-1',
        assessmentConfig: {
          quiz: 20,
          labReport: 15,
          labViva: 10,
          labTest: 20,
          openEnded: 0,
          attendance: 10,
          others: 0
        },
        isMarksPublished: true,
        publishedAt: new Date(),
        status: 'active'
      });

      await TeacherAssignment.create({
        courseOffering: offEEE3154._id,
        course: courseEEE3154._id,
        courseCode: 'EEE 3154',
        courseName: courseEEE3154.courseName,
        teacher: teacherAIS._id,
        teacherId: teacherAIS.teacherId,
        teacherName: teacherAIS.name,
        departmentCode: 'ETE',
        semester: '3-1',
        academicSession: '2024-2025',
        series: '22',
        role: 'PRIMARY',
        status: 'active',
        assignedBy: eteHead._id,
        assignedAt: new Date()
      });
      console.log('✅ Assigned EEE 3154 to Md Abu Ismail Siddique (ETE-294)');
    }

    // Assign ETE 3222 to Md Abu Ismail Siddique
    if (courseETE3222) {
      const offETE3222 = await CourseOffering.create({
        course: courseETE3222._id,
        courseCode: 'ETE 3222',
        courseName: courseETE3222.courseName,
        department: eteDept._id,
        departmentCode: 'ETE',
        series: series22?._id,
        seriesName: '22',
        academicSession: session?._id,
        sessionName: '2024-2025',
        semester: semester32?._id,
        semesterName: '3-2',
        assessmentConfig: {
          quiz: 20,
          labReport: 15,
          labViva: 10,
          labTest: 20,
          openEnded: 0,
          attendance: 10,
          others: 0
        },
        isMarksPublished: true,
        publishedAt: new Date(),
        status: 'active'
      });

      await TeacherAssignment.create({
        courseOffering: offETE3222._id,
        course: courseETE3222._id,
        courseCode: 'ETE 3222',
        courseName: courseETE3222.courseName,
        teacher: teacherAIS._id,
        teacherId: teacherAIS.teacherId,
        teacherName: teacherAIS.name,
        departmentCode: 'ETE',
        semester: '3-2',
        academicSession: '2024-2025',
        series: '22',
        role: 'PRIMARY',
        status: 'active',
        assignedBy: eteHead._id,
        assignedAt: new Date()
      });
      console.log('✅ Assigned ETE 3222 to Md Abu Ismail Siddique (ETE-294)');
    }

    // Assign ETE 3112 to Md Abu Ismail Siddique
    if (courseETE3112) {
      const offETE3112 = await CourseOffering.create({
        course: courseETE3112._id,
        courseCode: 'ETE 3112',
        courseName: courseETE3112.courseName,
        department: eteDept._id,
        departmentCode: 'ETE',
        series: series22?._id,
        seriesName: '22',
        academicSession: session?._id,
        sessionName: '2024-2025',
        semester: semester31?._id,
        semesterName: '3-1',
        assessmentConfig: {
          quiz: 20,
          labReport: 15,
          labViva: 10,
          labTest: 20,
          openEnded: 0,
          attendance: 10,
          others: 0
        },
        isMarksPublished: true,
        publishedAt: new Date(),
        status: 'active'
      });

      await TeacherAssignment.create({
        courseOffering: offETE3112._id,
        course: courseETE3112._id,
        courseCode: 'ETE 3112',
        courseName: courseETE3112.courseName,
        teacher: teacherAIS._id,
        teacherId: teacherAIS.teacherId,
        teacherName: teacherAIS.name,
        departmentCode: 'ETE',
        semester: '3-1',
        academicSession: '2024-2025',
        series: '22',
        role: 'PRIMARY',
        status: 'active',
        assignedBy: eteHead._id,
        assignedAt: new Date()
      });
      console.log('✅ Assigned ETE 3112 to Md Abu Ismail Siddique (ETE-294)');
    }

    // Assign ETE 3224 to Kamal
    if (courseETE3224 && teacherKamal) {
      const offETE3224 = await CourseOffering.create({
        course: courseETE3224._id,
        courseCode: 'ETE 3224',
        courseName: courseETE3224.courseName,
        department: eteDept._id,
        departmentCode: 'ETE',
        series: series22?._id,
        seriesName: '22',
        academicSession: session?._id,
        sessionName: '2024-2025',
        semester: semester32?._id,
        semesterName: '3-2',
        status: 'active'
      });

      await TeacherAssignment.create({
        courseOffering: offETE3224._id,
        course: courseETE3224._id,
        courseCode: 'ETE 3224',
        courseName: courseETE3224.courseName,
        teacher: teacherKamal._id,
        teacherId: teacherKamal.teacherId,
        teacherName: teacherKamal.name,
        departmentCode: 'ETE',
        semester: '3-2',
        academicSession: '2024-2025',
        series: '22',
        role: 'PRIMARY',
        status: 'active',
        assignedBy: eteHead._id,
        assignedAt: new Date()
      });
      console.log('✅ Assigned ETE 3224 to Dr. Md. Kamal Hosain');
    }

    // Assign ETE 3226 to Mowla
    if (courseETE3226 && teacherMowla) {
      const offETE3226 = await CourseOffering.create({
        course: courseETE3226._id,
        courseCode: 'ETE 3226',
        courseName: courseETE3226.courseName,
        department: eteDept._id,
        departmentCode: 'ETE',
        series: series22?._id,
        seriesName: '22',
        academicSession: session?._id,
        sessionName: '2024-2025',
        semester: semester32?._id,
        semesterName: '3-2',
        status: 'active'
      });

      await TeacherAssignment.create({
        courseOffering: offETE3226._id,
        course: courseETE3226._id,
        courseCode: 'ETE 3226',
        courseName: courseETE3226.courseName,
        teacher: teacherMowla._id,
        teacherId: teacherMowla.teacherId,
        teacherName: teacherMowla.name,
        departmentCode: 'ETE',
        semester: '3-2',
        academicSession: '2024-2025',
        series: '22',
        role: 'PRIMARY',
        status: 'active',
        assignedBy: eteHead._id,
        assignedAt: new Date()
      });
      console.log('✅ Assigned ETE 3226 to Dr. Md. Mowla');
    }

    // Update Teacher allocatedCourses field for quick display
    await Teacher.findByIdAndUpdate(teacherAIS._id, {
      $set: {
        allocatedCourses: [
          { courseCode: 'EEE 3154', courseName: courseEEE3154?.courseName || 'Sessional based on EEE 3153', series: '22' },
          { courseCode: 'ETE 3222', courseName: courseETE3222?.courseName || 'Sessional based on ETE 3221', series: '22' },
          { courseCode: 'ETE 3112', courseName: courseETE3112?.courseName || 'Sessional based on ETE 3111', series: '22' }
        ]
      }
    });

    // 10. Student Data Setup for 22 Series Students
    const studentJahid = await Student.findOne({ rollNumber: '2204028' });
    const students = await Student.find({ department: 'ETE', series: '22' }).sort({ rollNumber: 1 });
    console.log(`Found ${students.length} ETE 22-series students in database.`);

    // Clear old FinalResults and Requests
    await FinalResult.deleteMany({});
    await Request.deleteMany({});

    // Enroll students in active CourseOfferings
    const activeOfferings = await CourseOffering.find({ departmentCode: 'ETE' });
    for (const st of students) {
      await Student.findByIdAndUpdate(st._id, {
        $set: {
          enrolledCourses: activeOfferings.map(o => ({
            courseCode: o.courseCode,
            courseOffering: o._id
          }))
        }
      });
    }
    console.log(`✅ Enrolled ${students.length} students into active sessional course offerings.`);

    // 11. Seed Student Evaluation Results for EEE 3154 and ETE 3222
    // Generate marks matching the user's reference image for RUET evaluation:
    // Quiz [20], Lab Report [15], Lab Viva [10], Lab Test [20], Open Ended [0], Atnd [10], Total [65]
    const finalResultsToInsert = [];
    const offEEE3154 = await CourseOffering.findOne({ courseCode: 'EEE 3154' });
    const offETE3222 = await CourseOffering.findOne({ courseCode: 'ETE 3222' });

    for (const [idx, st] of students.entries()) {
      // Deterministic realistic marks
      const q = 14 + (idx % 7);       // 14 to 20
      const rep = 12 + (idx % 4);     // 12 to 15
      const viv = 7 + (idx % 4);      // 7 to 10
      const t = 10 + (idx % 11);      // 10 to 20
      const oe = 'A';                 // As shown in the user's reference spreadsheet!
      const att = 10;                 // 10
      const numOe = 0;
      const total = q + rep + viv + t + numOe + att; // Max 65
      const gradeRes = calculateRUETGrade(total, 65);

      // Result for EEE 3154
      if (offEEE3154 && courseEEE3154) {
        finalResultsToInsert.push({
          courseOffering: offEEE3154._id,
          course: courseEEE3154._id,
          student: st._id,
          rollNumber: st.rollNumber,
          studentName: st.name,
          series: '22',
          academicSession: '2024-2025',
          semester: '3-1',
          quizMark: q,
          reportMark: rep,
          vivaMark: viv,
          testMark: t,
          openEndedMark: oe,
          attendanceMark: att,
          totalMark: total,
          // compatibility
          quizMarks: q,
          reportMarks: rep,
          vivaMarks: viv,
          testMarks: t,
          openEndedMarks: oe,
          attendanceMarks: att,
          totalMarks: total,
          percentage: gradeRes.percentage,
          grade: gradeRes.letterGrade,
          gradePoint: gradeRes.gradePoint,
          isSubmitted: true,
          submittedAt: new Date()
        });
      }

      // Result for ETE 3222
      if (offETE3222 && courseETE3222) {
        const q2 = 15 + ((idx + 2) % 6);
        const rep2 = 13 + ((idx + 1) % 3);
        const viv2 = 8 + ((idx + 3) % 3);
        const t2 = 12 + ((idx + 4) % 9);
        const tot2 = q2 + rep2 + viv2 + t2 + numOe + att;
        const gradeRes2 = calculateRUETGrade(tot2, 65);

        finalResultsToInsert.push({
          courseOffering: offETE3222._id,
          course: courseETE3222._id,
          student: st._id,
          rollNumber: st.rollNumber,
          studentName: st.name,
          series: '22',
          academicSession: '2024-2025',
          semester: '3-2',
          quizMark: q2,
          reportMark: rep2,
          vivaMark: viv2,
          testMark: t2,
          openEndedMark: oe,
          attendanceMark: att,
          totalMark: tot2,
          // compatibility
          quizMarks: q2,
          reportMarks: rep2,
          vivaMarks: viv2,
          testMarks: t2,
          openEndedMarks: oe,
          attendanceMarks: att,
          totalMarks: tot2,
          percentage: gradeRes2.percentage,
          grade: gradeRes2.letterGrade,
          gradePoint: gradeRes2.gradePoint,
          isSubmitted: true,
          submittedAt: new Date()
        });
      }
    }

    if (finalResultsToInsert.length > 0) {
      await FinalResult.insertMany(finalResultsToInsert);
      console.log(`✅ Inserted ${finalResultsToInsert.length} FinalResult records for EEE 3154 & ETE 3222.`);
    }

    // 12. Create Mark Requests for testing student-teacher workflow
    if (studentJahid && teacherAIS && courseETE3222) {
      await Request.create({
        student: studentJahid._id,
        studentRoll: studentJahid.rollNumber,
        studentName: studentJahid.name,
        series: '22',
        department: 'ETE',
        semester: '3-2',
        academicSession: '2024-2025',
        course: 'ETE 3222',
        courseName: courseETE3222.courseName,
        teacher: teacherAIS.teacherId,
        teacherRef: teacherAIS._id,
        teacherName: teacherAIS.name,
        status: 'Accepted',
        detailedMarks: {
          quiz: 18,
          labReport: 15,
          labViva: 9,
          labTest: 19,
          openEnded: 0,
          attendance: 10,
          total: 71,
          grade: 'A+',
          gradePoint: 4.00
        },
        remarks: 'Marks released according to RUET assessment criteria.',
        processedAt: new Date()
      });
      console.log('✅ Created accepted detailed marks request for Jahid Hasan in ETE 3222.');
    }

    if (studentJahid && teacherAIS && courseEEE3154) {
      await Request.create({
        student: studentJahid._id,
        studentRoll: studentJahid.rollNumber,
        studentName: studentJahid.name,
        series: '22',
        department: 'ETE',
        semester: '3-1',
        academicSession: '2024-2025',
        course: 'EEE 3154',
        courseName: courseEEE3154.courseName,
        teacher: teacherAIS.teacherId,
        teacherRef: teacherAIS._id,
        teacherName: teacherAIS.name,
        status: 'Pending',
        remarks: 'Student requested official mark breakdown.'
      });
      console.log('✅ Created pending detailed marks request for Jahid Hasan in EEE 3154.');
    }

    console.log('\n======================================================');
    console.log('🎉 RUET SESSIONAL DATABASE REDESIGN COMPLETE!');
    console.log('======================================================');
    console.log(`Total Sessional Courses: ${insertedCourses.length}`);
    console.log('Key Sessional Courses:');
    console.log(' - EEE 3154 (Sessional based on EEE 3153) -> Assigned to Md Abu Ismail Siddique (ETE-294)');
    console.log(' - ETE 3222 (Sessional based on ETE 3221) -> Assigned to Md Abu Ismail Siddique (ETE-294)');
    console.log(' - ETE 3112 (Sessional based on ETE 3111) -> Assigned to Md Abu Ismail Siddique (ETE-294)');
    console.log('Department Head: head-ete / password123');
    console.log('Teacher: ETE-294 / password123');
    console.log('Student: 2204028 / password123');
    console.log('======================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error importing sessional courses:', err);
    process.exit(1);
  }
}

importSessionalCourses();
