require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const Faculty = require('./models/Faculty');
const Department = require('./models/Department');
const Teacher = require('./models/Teacher');

const jsonFiles = [
  'ase_faculty_teachers.json',
  'ce_faculty_teachers.json',
  'ece_faculty_teachers.json',
  'me_faculty_teachers.json'
];

// Normalize faculty code to standard format
function normalizeFacultyCode(rawCode) {
  const code = (rawCode || '').trim().toUpperCase();
  if (code.startsWith('ASE')) return 'ASE';
  if (code.startsWith('CE')) return 'CE';
  if (code.startsWith('ECE')) return 'ECE';
  if (code.startsWith('ME')) return 'ME';
  return code;
}

// Map teacher status string to dutyStatus and status
function mapTeacherStatus(rawStatus) {
  const s = (rawStatus || '').trim().toLowerCase();
  if (s === 'retired') {
    return { dutyStatus: 'INACTIVE', status: 'archived' };
  } else if (s === 'on leave' || s === 'on_leave') {
    return { dutyStatus: 'ON_LEAVE', status: 'active' };
  }
  return { dutyStatus: 'ON_DUTY', status: 'active' };
}

async function runImport() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI is not defined in .env');
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB Atlas...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB Atlas successfully!\n');

  // Pre-generate default hashed password
  const defaultSalt = await bcrypt.genSalt(10);
  const defaultHashedPassword = await bcrypt.hash('password123', defaultSalt);

  let facultiesProcessed = 0;
  let departmentsProcessed = 0;
  let teachersCreated = 0;
  let teachersUpdated = 0;

  for (const filename of jsonFiles) {
    const filePath = path.join(__dirname, 'data', filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ File not found: ${filePath}`);
      continue;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    const facultyName = data.faculty_name.trim();
    const facultyCode = normalizeFacultyCode(data.faculty_code);

    // 1. Upsert Faculty
    let facultyDoc = await Faculty.findOne({
      $or: [{ code: facultyCode }, { name: facultyName }]
    });

    if (facultyDoc) {
      facultyDoc.name = facultyName;
      facultyDoc.code = facultyCode;
      facultyDoc.status = 'active';
      await facultyDoc.save();
    } else {
      facultyDoc = await Faculty.create({
        name: facultyName,
        code: facultyCode,
        status: 'active'
      });
    }
    facultiesProcessed++;
    console.log(`🏛️ Faculty: ${facultyDoc.name} [Code: ${facultyDoc.code}]`);

    // 2. Iterate Departments
    for (const dept of data.departments) {
      const deptName = dept.department_name.trim();
      const deptCode = dept.department_code.trim().toUpperCase();

      let deptDoc = await Department.findOne({
        $or: [{ code: deptCode }, { name: deptName }]
      });

      if (deptDoc) {
        deptDoc.name = deptName;
        deptDoc.code = deptCode;
        deptDoc.faculty = facultyDoc._id;
        deptDoc.status = 'active';
        await deptDoc.save();
      } else {
        deptDoc = await Department.create({
          name: deptName,
          code: deptCode,
          faculty: facultyDoc._id,
          status: 'active'
        });
      }
      departmentsProcessed++;
      console.log(`   📂 Department: ${deptDoc.name} (${deptDoc.code}) - ${dept.teachers.length} teachers`);

      // 3. Upsert Teachers in this Department
      for (const t of dept.teachers) {
        if (!t.teacher_id || !t.name) continue;

        const cleanId = t.teacher_id.trim().toUpperCase();
        const cleanName = t.name.trim();
        const cleanNameBn = t.name_bn ? t.name_bn.trim() : '';
        const cleanDesignation = t.designation ? t.designation.trim() : 'Lecturer';
        const cleanEmail = t.email ? t.email.trim().toLowerCase() : '';
        const cleanContact = t.phone ? t.phone.trim() : 'N/A';
        const cleanOffice = t.office_contact ? t.office_contact.trim() : '';
        const { dutyStatus, status } = mapTeacherStatus(t.status);

        const existingTeacher = await Teacher.findOne({ teacherId: cleanId });

        if (existingTeacher) {
          existingTeacher.name = cleanName;
          existingTeacher.name_bn = cleanNameBn;
          existingTeacher.department = deptCode;
          existingTeacher.departmentRef = deptDoc._id;
          existingTeacher.facultyRef = facultyDoc._id;
          existingTeacher.designation = cleanDesignation;
          existingTeacher.email = cleanEmail;
          existingTeacher.contactNo = cleanContact;
          existingTeacher.officeContact = cleanOffice;
          existingTeacher.dutyStatus = dutyStatus;
          existingTeacher.status = status;
          await existingTeacher.save();
          teachersUpdated++;
        } else {
          // Direct insertion with pre-hashed password
          await Teacher.collection.insertOne({
            teacherId: cleanId,
            name: cleanName,
            name_bn: cleanNameBn,
            department: deptCode,
            departmentRef: deptDoc._id,
            facultyRef: facultyDoc._id,
            designation: cleanDesignation,
            email: cleanEmail,
            contactNo: cleanContact,
            officeContact: cleanOffice,
            password: defaultHashedPassword,
            role: 'teacher',
            dutyStatus: dutyStatus,
            specialization: '',
            status: status,
            allocatedCourses: [],
            joiningDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
          teachersCreated++;
        }
      }
    }
    console.log('');
  }

  // Verification counts
  const finalFacultyCount = await Faculty.countDocuments({ status: { $ne: 'archived' } });
  const finalDeptCount = await Department.countDocuments({ status: { $ne: 'archived' } });
  const finalTeacherCount = await Teacher.countDocuments();
  const onDutyCount = await Teacher.countDocuments({ dutyStatus: 'ON_DUTY' });
  const onLeaveCount = await Teacher.countDocuments({ dutyStatus: 'ON_LEAVE' });
  const inactiveCount = await Teacher.countDocuments({ dutyStatus: 'INACTIVE' });

  console.log('==============================================');
  console.log('🎉 SYNC & IMPORT COMPLETED SUCCESSFULLY');
  console.log('==============================================');
  console.log(`Faculties processed:   ${facultiesProcessed}`);
  console.log(`Departments processed: ${departmentsProcessed}`);
  console.log(`Teachers created:      ${teachersCreated}`);
  console.log(`Teachers updated:      ${teachersUpdated}`);
  console.log('----------------------------------------------');
  console.log('📊 Current MongoDB Atlas Database Totals:');
  console.log(`  Total Active Faculties:   ${finalFacultyCount}`);
  console.log(`  Total Active Departments: ${finalDeptCount}`);
  console.log(`  Total Teachers:           ${finalTeacherCount}`);
  console.log(`    - On Duty:              ${onDutyCount}`);
  console.log(`    - On Leave:             ${onLeaveCount}`);
  console.log(`    - Retired/Inactive:     ${inactiveCount}`);
  console.log('==============================================\n');

  process.exit(0);
}

runImport().catch(err => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
