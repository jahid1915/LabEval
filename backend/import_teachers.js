require('dotenv').config();
const mongoose = require('mongoose');
const Teacher = require('./models/Teacher');
const Department = require('./models/Department');
const Faculty = require('./models/Faculty');

/**
 * You can provide teacher records in this array, or load from a JSON/Excel file.
 * Required fields:
 * - teacherId (e.g. "T-101", "T-CSE-01")
 * - name (e.g. "Dr. John Doe")
 * - department (e.g. "CSE", "ETE", "EEE", "ECE")
 * 
 * Optional fields:
 * - designation (e.g. "Professor", "Associate Professor", "Assistant Professor", "Lecturer")
 * - email (e.g. "john@ruet.ac.bd")
 * - contactNo (e.g. "01700000000")
 * - password (default: "password123")
 * - dutyStatus ("ON_DUTY", "ON_LEAVE", "STUDY_LEAVE")
 */
const teachersData = [
  // Example template — add or paste your faculty list here:
  {
    teacherId: "T-101",
    name: "Dr. Test Teacher",
    department: "CSE",
    designation: "Professor",
    email: "test.teacher@ruet.ac.bd",
    contactNo: "01700000000"
  },
  {
    teacherId: "T-102",
    name: "Dr. Al-Mamun",
    department: "CSE",
    designation: "Associate Professor",
    email: "almamun@ruet.ac.bd",
    contactNo: "01711111111"
  },
  {
    teacherId: "T-103",
    name: "Dr. B. K. Paul",
    department: "ETE",
    designation: "Professor",
    email: "bkpaul@ruet.ac.bd",
    contactNo: "01722222222"
  }
];

async function importTeachers(customData) {
  const data = customData || teachersData;
  if (!data || data.length === 0) {
    console.log('No teacher records found to import.');
    return;
  }

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/labeval';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // Fetch departments and faculties for relational references
    const departments = await Department.find({});
    const deptMap = {};
    departments.forEach(d => {
      deptMap[d.code.toUpperCase()] = d;
    });

    let inserted = 0;
    let updated = 0;

    for (const t of data) {
      if (!t.teacherId || !t.name || !t.department) {
        console.warn(`Skipping invalid row:`, t);
        continue;
      }

      const cleanId = t.teacherId.trim().toUpperCase();
      const cleanDept = t.department.trim().toUpperCase();
      const deptDoc = deptMap[cleanDept];

      const existing = await Teacher.findOne({ teacherId: cleanId });

      if (existing) {
        existing.name = t.name.trim();
        existing.department = cleanDept;
        if (deptDoc) {
          existing.departmentRef = deptDoc._id;
          existing.facultyRef = deptDoc.faculty;
        }
        if (t.designation) existing.designation = t.designation.trim();
        if (t.email) existing.email = t.email.trim().toLowerCase();
        if (t.contactNo) existing.contactNo = t.contactNo.trim();
        if (t.dutyStatus) existing.dutyStatus = t.dutyStatus;
        await existing.save();
        updated++;
        console.log(`Updated: [${cleanId}] ${existing.name}`);
      } else {
        await Teacher.create({
          teacherId: cleanId,
          name: t.name.trim(),
          department: cleanDept,
          departmentRef: deptDoc ? deptDoc._id : null,
          facultyRef: deptDoc ? deptDoc.faculty : null,
          designation: t.designation?.trim() || 'Lecturer',
          email: t.email?.trim().toLowerCase() || '',
          contactNo: t.contactNo?.trim() || 'N/A',
          password: t.password || 'password123',
          dutyStatus: t.dutyStatus || 'ON_DUTY'
        });
        inserted++;
        console.log(`Created: [${cleanId}] ${t.name}`);
      }
    }

    console.log(`\nImport Summary:`);
    console.log(`  - Total Processed: ${data.length}`);
    console.log(`  - Created: ${inserted}`);
    console.log(`  - Updated: ${updated}`);
    console.log(`All teachers have default password 'password123' if not specified.`);

    process.exit(0);
  } catch (err) {
    console.error('Error importing teachers:', err);
    process.exit(1);
  }
}

// Allow passing a JSON file path as argument: node import_teachers.js ./teachers.json
const args = process.argv.slice(2);
if (args.length > 0 && args[0].endsWith('.json')) {
  const fs = require('fs');
  const raw = fs.readFileSync(args[0], 'utf8');
  importTeachers(JSON.parse(raw));
} else {
  importTeachers();
}
