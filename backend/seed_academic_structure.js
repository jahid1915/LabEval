require('dotenv').config();
const mongoose = require('mongoose');

const AcademicSession = require('./models/AcademicSession');
const Semester = require('./models/Semester');
const Series = require('./models/Series');
const Department = require('./models/Department');
const Student = require('./models/Student');

async function seedAcademicStructure() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    // 1. Academic Sessions
    const sessionsData = [
      { name: '2024-2025', year: 2024, isCurrent: true, status: 'active' },
      { name: '2025-2026', year: 2025, isCurrent: false, status: 'upcoming' },
      { name: '2023-2024', year: 2023, isCurrent: false, status: 'completed' },
      { name: '2022-2023', year: 2022, isCurrent: false, status: 'completed' },
      { name: '2021-2022', year: 2021, isCurrent: false, status: 'completed' },
      { name: '2020-2021', year: 2020, isCurrent: false, status: 'completed' },
    ];

    const sessionDocs = [];
    for (const s of sessionsData) {
      const doc = await AcademicSession.findOneAndUpdate(
        { name: s.name },
        { ...s },
        { upsert: true, new: true }
      );
      sessionDocs.push(doc);
    }
    console.log(`Synced ${sessionDocs.length} Academic Sessions.`);

    const currentSession = sessionDocs.find(s => s.name === '2024-2025') || sessionDocs[0];

    // 2. Semesters for sessions
    const semesterCodes = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];
    const semesterNames = {
      '1-1': '1st Year 1st Semester',
      '1-2': '1st Year 2nd Semester',
      '2-1': '2nd Year 1st Semester',
      '2-2': '2nd Year 2nd Semester',
      '3-1': '3rd Year 1st Semester',
      '3-2': '3rd Year 2nd Semester',
      '4-1': '4th Year 1st Semester',
      '4-2': '4th Year 2nd Semester',
    };

    let semCount = 0;
    for (const sess of sessionDocs) {
      for (const code of semesterCodes) {
        await Semester.findOneAndUpdate(
          { academicSession: sess._id, code },
          {
            name: semesterNames[code],
            code,
            academicSession: sess._id,
            isCurrent: sess.isCurrent && code === '3-2',
            status: 'active'
          },
          { upsert: true, new: true }
        );
        semCount++;
      }
    }
    console.log(`Synced ${semCount} Semesters.`);

    // 3. Series for departments (especially ETE, CSE, EEE)
    const departments = await Department.find({ code: { $in: ['ETE', 'CSE', 'EEE', 'CE', 'ME'] } });
    const seriesList = ['20', '21', '22', '23', '24', '25'];

    let seriesCount = 0;
    for (const dept of departments) {
      for (const sName of seriesList) {
        await Series.findOneAndUpdate(
          { name: sName, department: dept._id },
          {
            name: sName,
            department: dept._id,
            departmentCode: dept.code,
            academicSession: currentSession._id,
            currentSemester: sName === '22' ? '3-2' : sName === '23' ? '2-2' : sName === '24' ? '1-2' : '4-2',
            status: 'active'
          },
          { upsert: true, new: true }
        );
        seriesCount++;
      }
    }
    console.log(`Synced ${seriesCount} Series entries.`);

    // 4. Ensure ETE students are populated from import_ete_students list
    const eteDept = await Department.findOne({ code: 'ETE' });
    const studentsData = [
      { "rollNumber": "2204001", "name": "Fatin Awsaf Amin" },
      { "rollNumber": "2204002", "name": "Sheikh Tanjim Ahmed" },
      { "rollNumber": "2204003", "name": "Md. Mahe Alam" },
      { "rollNumber": "2204004", "name": "Afifa Tasnim Haque" },
      { "rollNumber": "2204005", "name": "Most.Nafisa Tabassum" },
      { "rollNumber": "2204006", "name": "Md Iftaker Rahaman Radit" },
      { "rollNumber": "2204007", "name": "Talha Mahmud Siam Khan" },
      { "rollNumber": "2204008", "name": "Md. Mahir Shahriar" },
      { "rollNumber": "2204009", "name": "Farhan Hasin Fahim" },
      { "rollNumber": "2204010", "name": "Md. Rakib Hasan" },
      { "rollNumber": "2204011", "name": "Md. Lohan Ali" },
      { "rollNumber": "2204012", "name": "Bhismodev Saha Dhairjo" },
      { "rollNumber": "2204014", "name": "Ajraf Fahim" },
      { "rollNumber": "2204015", "name": "MD. Sawgatul Alam" },
      { "rollNumber": "2204016", "name": "Md. Tarik Jamil" },
      { "rollNumber": "2204017", "name": "Obaidul Islam Aontor" },
      { "rollNumber": "2204018", "name": "Samiha Tabassum Anika" },
      { "rollNumber": "2204019", "name": "MD. Muraduzzaman Sifat" },
      { "rollNumber": "2204020", "name": "Md. Atique Ashfak Arib" },
      { "rollNumber": "2204023", "name": "Amit Kamar Das" },
      { "rollNumber": "2204024", "name": "Mohammad Naim" },
      { "rollNumber": "2204025", "name": "Samiha Noshin Samiha" },
      { "rollNumber": "2204026", "name": "Abir Hossain Bhuiyan" },
      { "rollNumber": "2204027", "name": "S M Anik Hasan" },
      { "rollNumber": "2204028", "name": "Md. Jahid Hasan" },
      { "rollNumber": "2204029", "name": "Mst. Sahida Sultana" },
      { "rollNumber": "2204030", "name": "Tanim Shahriar Mitul" },
      { "rollNumber": "2204031", "name": "Faria Mozahid Othoy" },
      { "rollNumber": "2204032", "name": "Md Shoab Aktar" },
      { "rollNumber": "2204033", "name": "Jannatul Ferdaus" },
      { "rollNumber": "2204034", "name": "Md. Tareq Rahman" },
      { "rollNumber": "2204035", "name": "SM Tamjid" },
      { "rollNumber": "2204036", "name": "Pratick Chakraborty Dibba" },
      { "rollNumber": "2204037", "name": "Md. Khalid Hossen" },
      { "rollNumber": "2204038", "name": "Md. Anik Hassan" },
      { "rollNumber": "2204039", "name": "Muammar Ilham" },
      { "rollNumber": "2204040", "name": "Sanzidul Islam" },
      { "rollNumber": "2204041", "name": "Md. Sohanur Rahman Sohan" },
      { "rollNumber": "2204042", "name": "Mohaiminul Islam" },
      { "rollNumber": "2204043", "name": "Md Farhan Labib" },
      { "rollNumber": "2204044", "name": "Arnob Das Ricky" },
      { "rollNumber": "2204045", "name": "Tanmoy Debnath" },
      { "rollNumber": "2204046", "name": "Oritree Zaman" },
      { "rollNumber": "2204047", "name": "Tawfiq Ahmed Rafi" },
      { "rollNumber": "2204048", "name": "MD Mehedy Hasan" },
      { "rollNumber": "2204049", "name": "Md Mahabub Hasan Hridoy" },
      { "rollNumber": "2204050", "name": "Fahat Tasnim Lamisa" },
      { "rollNumber": "2204051", "name": "Ranesh Das Rik" },
      { "rollNumber": "2204052", "name": "Tasfiul Mostafa" },
      { "rollNumber": "2204053", "name": "Shahriar Shahid Shuvo" },
      { "rollNumber": "2204054", "name": "Fatema Tuz Johra" },
      { "rollNumber": "2204055", "name": "Adnan Sakib Esha" },
      { "rollNumber": "2204056", "name": "MD Symul Haque" },
      { "rollNumber": "2204057", "name": "Faria Mahjabin Jime" },
      { "rollNumber": "2204058", "name": "MD MOSHFIKUR RAHMAN TOSHUN" },
      { "rollNumber": "2204059", "name": "Iftakhar Mahmud Tamim" },
      { "rollNumber": "2204060", "name": "Imrul Islam Emon" }
    ];

    for (const s of studentsData) {
      await Student.findOneAndUpdate(
        { rollNumber: s.rollNumber },
        {
          name: s.name,
          rollNumber: s.rollNumber,
          series: '22',
          department: 'ETE',
          departmentRef: eteDept?._id,
          contactNo: '01700000000',
          password: 'password123',
          role: 'student',
          status: 'active'
        },
        { upsert: true, new: true }
      );
    }
    console.log(`Synced ${studentsData.length} ETE 22 Series students.`);

    process.exit(0);
  } catch (err) {
    console.error('Seeding academic structure error:', err);
    process.exit(1);
  }
}

seedAcademicStructure();
