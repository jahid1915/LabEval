require('dotenv').config();
const mongoose = require('mongoose');

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

async function seedDemoFlow() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    // 1. Get Faculty and Departments
    const eceFaculty = await Faculty.findOne({ code: 'ECE' });
    const eteDept = await Department.findOne({ code: 'ETE' });
    const eeeDept = await Department.findOne({ code: 'EEE' });
    const cseDept = await Department.findOne({ code: 'CSE' });

    // 2. Department Head Accounts
    // ETE Head
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

    // EEE Head
    await Admin.findOneAndUpdate(
      { username: 'head-eee' },
      {
        name: 'Prof. Dr. S. K. EEE',
        username: 'head-eee',
        email: 'head@eee.ruet.ac.bd',
        contactNo: '01711223355',
        password: 'password123',
        role: 'department_head',
        designation: 'Head, Dept. of EEE',
        faculty: eceFaculty._id,
        facultyCode: 'ECE',
        facultyName: eceFaculty.name,
        department: eeeDept._id,
        departmentCode: 'EEE',
        departmentName: eeeDept.name,
        status: 'active'
      },
      { upsert: true, returnDocument: 'after' }
    );

    // CSE Head
    await Admin.findOneAndUpdate(
      { username: 'head-cse' },
      {
        name: 'Prof. Dr. R. H. CSE',
        username: 'head-cse',
        email: 'head@cse.ruet.ac.bd',
        contactNo: '01711223366',
        password: 'password123',
        role: 'department_head',
        designation: 'Head, Dept. of CSE',
        faculty: eceFaculty._id,
        facultyCode: 'ECE',
        facultyName: eceFaculty.name,
        department: cseDept._id,
        departmentCode: 'CSE',
        departmentName: cseDept.name,
        status: 'active'
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Update default 'admin' to be Super Admin or ETE Head
    await Admin.findOneAndUpdate(
      { username: 'admin' },
      {
        faculty: eceFaculty._id,
        facultyCode: 'ECE',
        facultyName: eceFaculty.name,
        department: eteDept._id,
        departmentCode: 'ETE',
        departmentName: eteDept.name,
        role: 'department_head',
        designation: 'Head, Dept. of ETE'
      }
    );

    console.log('✅ Department Heads configured with strict department binding.');

    // 3. Teachers in ETE
    // Teacher: Md. Abu Ismail Siddique
    const teacherAIS = await Teacher.findOne({ teacherId: 'ETE-294' });
    const teacherKamal = await Teacher.findOne({ teacherId: 'ETE-151' });
    const teacherMowla = await Teacher.findOne({ teacherId: 'ETE-245' });

    // 4. Academic Session, Semester, Series
    const session = await AcademicSession.findOne({ name: '2024-2025' });
    const semester32 = await Semester.findOne({ code: '3-2', academicSession: session._id });
    const series22 = await Series.findOne({ name: '22', department: eteDept._id });

    // 5. Elective Courses: ETE 3221, ETE 3222, ETE 3225, ETE 3226
    const course3221 = await Course.findOne({ courseCode: 'ETE 3221' });
    const course3222 = await Course.findOne({ courseCode: 'ETE 3222' });
    const course3225 = await Course.findOne({ courseCode: 'ETE 3225' });
    const course3226 = await Course.findOne({ courseCode: 'ETE 3226' });

    console.log('Courses available:', {
      c3221: !!course3221,
      c3222: !!course3222,
      c3225: !!course3225,
      c3226: !!course3226
    });

    // 6. Department Head assigns Course Offering & Teacher
    // Offering 1: ETE 3222 (Sessional based on ETE 3221) -> Assigned to Md Abu Ismail Siddique
    if (course3222 && teacherAIS) {
      const offering3222 = await CourseOffering.findOneAndUpdate(
        {
          courseCode: 'ETE 3222',
          seriesName: '22',
          sessionName: '2024-2025',
          semesterName: '3-2'
        },
        {
          course: course3222._id,
          courseCode: 'ETE 3222',
          courseName: course3222.courseName,
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
        },
        { upsert: true, returnDocument: 'after' }
      );

      // Assign teacher
      await TeacherAssignment.findOneAndUpdate(
        { courseOffering: offering3222._id, teacher: teacherAIS._id },
        {
          courseOffering: offering3222._id,
          teacher: teacherAIS._id,
          teacherId: teacherAIS.teacherId,
          role: 'PRIMARY',
          status: 'active',
          assignedBy: eteHead._id,
          assignedAt: new Date()
        },
        { upsert: true, returnDocument: 'after' }
      );

      await Teacher.findByIdAndUpdate(teacherAIS._id, {
        $addToSet: {
          allocatedCourses: {
            courseCode: 'ETE 3222',
            courseName: course3222.courseName,
            series: '22'
          }
        }
      });
      console.log('✅ Assigned ETE 3222 to Md Abu Ismail Siddique (ETE-294)');
    }

    // Offering 2: ETE 3221 (Microwave Devices - Theory) -> Assigned to Md Abu Ismail Siddique
    if (course3221 && teacherAIS) {
      const offering3221 = await CourseOffering.findOneAndUpdate(
        {
          courseCode: 'ETE 3221',
          seriesName: '22',
          sessionName: '2024-2025',
          semesterName: '3-2'
        },
        {
          course: course3221._id,
          courseCode: 'ETE 3221',
          courseName: course3221.courseName,
          department: eteDept._id,
          departmentCode: 'ETE',
          series: series22?._id,
          seriesName: '22',
          academicSession: session?._id,
          sessionName: '2024-2025',
          semester: semester32?._id,
          semesterName: '3-2',
          status: 'active'
        },
        { upsert: true, returnDocument: 'after' }
      );

      await TeacherAssignment.findOneAndUpdate(
        { courseOffering: offering3221._id, teacher: teacherAIS._id },
        {
          courseOffering: offering3221._id,
          teacher: teacherAIS._id,
          teacherId: teacherAIS.teacherId,
          role: 'PRIMARY',
          status: 'active',
          assignedBy: eteHead._id
        },
        { upsert: true, returnDocument: 'after' }
      );
      console.log('✅ Assigned ETE 3221 to Md Abu Ismail Siddique (ETE-294)');
    }

    // Offering 3: ETE 3225 & ETE 3226 -> Assigned to Dr. Md. Kamal Hosain
    if (course3226 && teacherKamal) {
      const offering3226 = await CourseOffering.findOneAndUpdate(
        {
          courseCode: 'ETE 3226',
          seriesName: '22',
          sessionName: '2024-2025',
          semesterName: '3-2'
        },
        {
          course: course3226._id,
          courseCode: 'ETE 3226',
          courseName: course3226.courseName,
          department: eteDept._id,
          departmentCode: 'ETE',
          series: series22?._id,
          seriesName: '22',
          academicSession: session?._id,
          sessionName: '2024-2025',
          semester: semester32?._id,
          semesterName: '3-2',
          status: 'active'
        },
        { upsert: true, returnDocument: 'after' }
      );

      await TeacherAssignment.findOneAndUpdate(
        { courseOffering: offering3226._id, teacher: teacherKamal._id },
        {
          courseOffering: offering3226._id,
          teacher: teacherKamal._id,
          teacherId: teacherKamal.teacherId,
          role: 'PRIMARY',
          status: 'active',
          assignedBy: eteHead._id
        },
        { upsert: true, returnDocument: 'after' }
      );
      console.log('✅ Assigned ETE 3226 to Dr. Md. Kamal Hosain (ETE-151)');
    }

    // 7. Populate Results for ETE 3222 based on the Reference Screenshot
    // Reference marks:
    // Quiz [20], Report [15], Viva [10], Test [20], Open Ended [0], Atnd [10], Total [65]
    const students = await Student.find({ department: 'ETE', series: '22' }).sort({ rollNumber: 1 });
    console.log(`Populating authentic marks for ${students.length} ETE students...`);

    const sampleMarkRows = [
      { q: 18, r: 15, v: 9, t: 10, oe: 'A', a: 10 }, // 62
      { q: 16, r: 13, v: 9, t: 9,  oe: 'A', a: 10 }, // 57
      { q: 16, r: 13, v: 7, t: 10, oe: 'A', a: 10 }, // 56
      { q: 16, r: 13, v: 7, t: 7,  oe: 'A', a: 10 }, // 53
      { q: 16, r: 13, v: 9, t: 10, oe: 'A', a: 10 }, // 58
      { q: 17, r: 13, v: 9, t: 8,  oe: 'A', a: 10 }, // 57
      { q: 17, r: 13, v: 9, t: 9,  oe: 'A', a: 10 }, // 58
      { q: 13, r: 13, v: 7, t: 6,  oe: 'A', a: 10 }, // 49
      { q: 18, r: 13, v: 9, t: 10, oe: 'A', a: 10 }, // 60
      { q: 19, r: 13, v: 7, t: 10, oe: 'A', a: 10 }, // 59
      { q: 16, r: 13, v: 7, t: 6,  oe: 'A', a: 10 }, // 52
      { q: 12, r: 13, v: 7, t: 5,  oe: 'A', a: 10 }, // 47
      { q: 14, r: 13, v: 7, t: 8,  oe: 'A', a: 10 }, // 52
      { q: 20, r: 13, v: 5, t: 10, oe: 'A', a: 10 }, // 58
      { q: 17, r: 13, v: 9, t: 10, oe: 'A', a: 10 }, // 59
      { q: 16, r: 13, v: 7, t: 8,  oe: 'A', a: 10 }, // 54
      { q: 11, r: 13, v: 9, t: 9,  oe: 'A', a: 10 }, // 52
      { q: 16, r: 13, v: 9, t: 10, oe: 'A', a: 10 }, // 58
      { q: 13, r: 13, v: 7, t: 10, oe: 'A', a: 10 }, // 53
      { q: 15, r: 10, v: 7, t: 4,  oe: 'A', a: 10 }, // 46
      { q: 16, r: 13, v: 9, t: 10, oe: 'A', a: 10 }, // 58
      { q: 20, r: 13, v: 7, t: 9,  oe: 'A', a: 10 }, // 59
      { q: 17, r: 13, v: 9, t: 10, oe: 'A', a: 10 }, // 59
      { q: 18, r: 13, v: 9, t: 8,  oe: 'A', a: 10 }, // 58
      { q: 20, r: 13, v: 5, t: 7,  oe: 'A', a: 10 }, // 55
      { q: 15, r: 13, v: 7, t: 8,  oe: 'A', a: 10 }, // 53
      { q: 18, r: 13, v: 7, t: 9,  oe: 'A', a: 10 }, // 57
      { q: 16, r: 13, v: 9, t: 8,  oe: 'A', a: 10 }, // 56
      { q: 16, r: 13, v: 9, t: 7,  oe: 'A', a: 10 }, // 55
      { q: 14, r: 13, v: 7, t: 9,  oe: 'A', a: 10 }, // 53
      { q: 16, r: 13, v: 7, t: 8,  oe: 'A', a: 10 }, // 54
      { q: 14, r: 12, v: 7, t: 10, oe: 'A', a: 10 }, // 53
      { q: 14, r: 13, v: 9, t: 9,  oe: 'A', a: 10 }, // 55
      { q: 19, r: 13, v: 7, t: 10, oe: 'A', a: 10 }, // 59
      { q: 15, r: 13, v: 7, t: 10, oe: 'A', a: 10 }, // 55
      { q: 16, r: 11, v: 7, t: 10, oe: 'A', a: 10 }, // 54
      { q: 15, r: 13, v: 5, t: 10, oe: 'A', a: 10 }, // 53
      { q: 19, r: 13, v: 7, t: 9,  oe: 'A', a: 10 }, // 58
      { q: 15, r: 13, v: 7, t: 8,  oe: 'A', a: 10 }, // 53
      { q: 11, r: 13, v: 7, t: 10, oe: 'A', a: 10 }, // 51
      { q: 16, r: 13, v: 9, t: 9,  oe: 'A', a: 10 }, // 57
      { q: 16, r: 13, v: 9, t: 10, oe: 'A', a: 10 }, // 58
      { q: 16, r: 13, v: 9, t: 7,  oe: 'A', a: 10 }, // 55
      { q: 17, r: 13, v: 9, t: 8,  oe: 'A', a: 10 }, // 57
      { q: 15, r: 13, v: 7, t: 10, oe: 'A', a: 10 }, // 55
      { q: 15, r: 13, v: 5, t: 9,  oe: 'A', a: 10 }, // 52
      { q: 16, r: 13, v: 9, t: 9,  oe: 'A', a: 10 }, // 57
      { q: 20, r: 13, v: 7, t: 10, oe: 'A', a: 10 }, // 60
      { q: 19, r: 13, v: 7, t: 10, oe: 'A', a: 10 }, // 59
      { q: 16, r: 13, v: 7, t: 10, oe: 'A', a: 10 }, // 56
      { q: 17, r: 13, v: 9, t: 9,  oe: 'A', a: 10 }, // 58
      { q: 19, r: 13, v: 7, t: 9,  oe: 'A', a: 10 }, // 58
      { q: 15, r: 13, v: 5, t: 10, oe: 'A', a: 10 }, // 53
      { q: 16, r: 13, v: 9, t: 7,  oe: 'A', a: 10 }, // 55
      { q: 17, r: 13, v: 9, t: 9,  oe: 'A', a: 10 }, // 58
      { q: 17, r: 13, v: 5, t: 10, oe: 'A', a: 10 }, // 55
      { q: 0,  r: 0,  v: 0, t: 0,  oe: 'A', a: 0  }  // Absent
    ];

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const m = sampleMarkRows[i % sampleMarkRows.length];
      const tot = m.q + m.r + m.v + m.t + m.a;
      const { grade, gradePoint } = calculateRUETGrade(tot, 65);

      const detailedMarks = {
        quiz: m.q,
        labReport: m.r,
        labViva: m.v,
        labTest: m.t,
        openEnded: m.oe,
        attendance: m.a,
        total: tot,
        grade,
        gradePoint
      };

      await FinalResult.findOneAndUpdate(
        { student: s._id, course: 'ETE 3222' },
        {
          student: s._id,
          rollNumber: s.rollNumber,
          studentName: s.name,
          department: 'ETE',
          series: '22',
          semester: '3-2',
          academicSession: '2024-2025',
          course: 'ETE 3222',
          courseName: 'Sessional based on ETE 3221',
          teacher: teacherAIS._id,
          teacherId: 'ETE-294',
          teacherName: teacherAIS.name,
          quizMarks: m.q,
          reportMarks: m.r,
          vivaMarks: m.v,
          testMarks: m.t,
          openEndedMarks: m.oe,
          attendanceMarks: m.a,
          totalMarks: tot,
          maxTotalMarks: 65,
          grade,
          gradePoint,
          detailedMarks,
          status: 'published',
          isPublished: true,
          publishedAt: new Date()
        },
        { upsert: true, returnDocument: 'after' }
      );

      // Also for Theory course ETE 3221
      const thTot = Math.min(65, tot - 5 + (i % 8));
      const thGrade = calculateRUETGrade(thTot, 65);
      await FinalResult.findOneAndUpdate(
        { student: s._id, course: 'ETE 3221' },
        {
          student: s._id,
          rollNumber: s.rollNumber,
          studentName: s.name,
          department: 'ETE',
          series: '22',
          semester: '3-2',
          academicSession: '2024-2025',
          course: 'ETE 3221',
          courseName: 'Microwave Devices',
          teacher: teacherAIS._id,
          teacherId: 'ETE-294',
          teacherName: teacherAIS.name,
          totalMarks: thTot,
          maxTotalMarks: 65,
          grade: thGrade.grade,
          gradePoint: thGrade.gradePoint,
          status: 'published',
          isPublished: true,
          publishedAt: new Date()
        },
        { upsert: true, returnDocument: 'after' }
      );
    }
    console.log('✅ FinalResults seeded for ETE 3222 & ETE 3221 with RUET grading.');

    // 8. Create Student Mark Requests (Pending and Accepted)
    // Student: Md. Jahid Hasan (2204028)
    const jahid = await Student.findOne({ rollNumber: '2204028' });
    if (jahid && teacherAIS) {
      // Jahid requested ETE 3222 -> Accepted
      await Request.findOneAndUpdate(
        { student: jahid._id, course: 'ETE 3222' },
        {
          student: jahid._id,
          studentRoll: jahid.rollNumber,
          studentName: jahid.name,
          series: '22',
          department: 'ETE',
          semester: '3-2',
          academicSession: '2024-2025',
          course: 'ETE 3222',
          courseName: 'Sessional based on ETE 3221',
          teacher: 'ETE-294',
          teacherRef: teacherAIS._id,
          teacherName: teacherAIS.name,
          requestDate: new Date(Date.now() - 3600000 * 24),
          status: 'Accepted',
          detailedMarks: {
            quiz: 18,
            labReport: 15,
            labViva: 9,
            labTest: 10,
            openEnded: 'A',
            attendance: 10,
            total: 62,
            grade: 'A+',
            gradePoint: 4.00
          },
          processedAt: new Date()
        },
        { upsert: true, returnDocument: 'after' }
      );

      // Jahid requested ETE 3221 -> Pending
      await Request.findOneAndUpdate(
        { student: jahid._id, course: 'ETE 3221' },
        {
          student: jahid._id,
          studentRoll: jahid.rollNumber,
          studentName: jahid.name,
          series: '22',
          department: 'ETE',
          semester: '3-2',
          academicSession: '2024-2025',
          course: 'ETE 3221',
          courseName: 'Microwave Devices',
          teacher: 'ETE-294',
          teacherRef: teacherAIS._id,
          teacherName: teacherAIS.name,
          requestDate: new Date(),
          status: 'Pending'
        },
        { upsert: true, returnDocument: 'after' }
      );
    }

    // Add 4 more requests for Teacher Panel demo
    const otherStudents = students.filter(s => s.rollNumber !== '2204028').slice(0, 5);
    const statuses = ['Pending', 'Pending', 'Pending', 'Accepted', 'Pending'];
    for (let j = 0; j < otherStudents.length; j++) {
      const ost = otherStudents[j];
      await Request.findOneAndUpdate(
        { student: ost._id, course: 'ETE 3222' },
        {
          student: ost._id,
          studentRoll: ost.rollNumber,
          studentName: ost.name,
          series: '22',
          department: 'ETE',
          semester: '3-2',
          academicSession: '2024-2025',
          course: 'ETE 3222',
          courseName: 'Sessional based on ETE 3221',
          teacher: 'ETE-294',
          teacherRef: teacherAIS._id,
          teacherName: teacherAIS.name,
          requestDate: new Date(Date.now() - 3600000 * (j + 1)),
          status: statuses[j]
        },
        { upsert: true, returnDocument: 'after' }
      );
    }
    console.log('✅ Student mark requests seeded for Teacher Mark Request Panel.');

    console.log('\n🎉 DEMO FLOW SEEDING COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('Seed demo flow error:', err);
    process.exit(1);
  }
}

seedDemoFlow();
