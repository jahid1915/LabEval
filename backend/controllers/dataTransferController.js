const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Department = require('../models/Department');
const Series = require('../models/Series');
const User = require('../models/User');
const { logAudit } = require('../middleware/auditMiddleware');

// @desc Bulk import teachers (Optimized with bulkWrite and pre-fetched lookups)
// @route POST /api/admin/import/teachers
const importTeachers = async (req, res) => {
  try {
    const { teachers } = req.body;
    if (!Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({ message: 'teachers array is required' });
    }

    // 1. Single-pass pre-fetch of all departments in memory
    const deptDocs = await Department.find({}).lean();
    const deptMap = new Map();
    deptDocs.forEach(d => {
      deptMap.set(d.code.toUpperCase(), d);
    });

    // 2. Pre-fetch existing teachers in 1 network round-trip
    const cleanIds = teachers
      .map(t => (t.teacherId ? String(t.teacherId).trim().toUpperCase() : ''))
      .filter(Boolean);
    const existingTeachers = await Teacher.find({ teacherId: { $in: cleanIds } }).lean();
    const existingTeacherMap = new Map();
    existingTeachers.forEach(t => existingTeacherMap.set(t.teacherId, t));

    let inserted = 0;
    let updated = 0;
    let errors = [];
    const bulkOps = [];
    const userBulkOps = [];

    for (let i = 0; i < teachers.length; i++) {
      const row = teachers[i];
      if (!row.name || !row.teacherId || !row.department) {
        errors.push({ row: i + 1, error: 'Missing required fields (name, teacherId, department)' });
        continue;
      }

      const cleanId = String(row.teacherId).trim().toUpperCase();
      const cleanDept = String(row.department).trim().toUpperCase();
      const deptDoc = deptMap.get(cleanDept);

      const existing = existingTeacherMap.get(cleanId);
      if (existing) {
        const updateFields = {
          name: row.name.trim(),
          department: cleanDept,
          designation: row.designation?.trim() || existing.designation || 'Lecturer',
          contactNo: row.contactNo?.trim() || existing.contactNo || 'N/A',
          email: row.email?.trim().toLowerCase() || existing.email || '',
          dutyStatus: row.dutyStatus || existing.dutyStatus || 'ON_DUTY'
        };
        if (deptDoc) {
          updateFields.departmentRef = deptDoc._id;
          updateFields.facultyRef = deptDoc.faculty;
        }
        bulkOps.push({
          updateOne: {
            filter: { _id: existing._id },
            update: { $set: updateFields }
          }
        });
        updated++;
      } else {
        const newTeacherDoc = {
          name: row.name.trim(),
          teacherId: cleanId,
          department: cleanDept,
          departmentRef: deptDoc ? deptDoc._id : null,
          facultyRef: deptDoc ? deptDoc.faculty : null,
          designation: row.designation?.trim() || 'Lecturer',
          contactNo: row.contactNo?.trim() || 'N/A',
          email: row.email?.trim().toLowerCase() || '',
          password: row.password || '123456',
          dutyStatus: row.dutyStatus || 'ON_DUTY',
          role: 'teacher',
          status: 'active'
        };
        bulkOps.push({ insertOne: { document: newTeacherDoc } });
        inserted++;
      }
    }

    // 3. Execute in batch chunks of 200
    const CHUNK_SIZE = 200;
    for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
      const chunk = bulkOps.slice(i, i + CHUNK_SIZE);
      await Teacher.bulkWrite(chunk, { ordered: false });
    }

    logAudit({
      req,
      action: 'BULK_IMPORT_TEACHERS',
      entity: 'Teacher',
      details: `Imported teachers: ${inserted} created, ${updated} updated, ${errors.length} failed`
    }).catch(() => {});

    res.json({
      message: `Processed ${teachers.length} rows: ${inserted} created, ${updated} updated.`,
      inserted,
      updated,
      errors
    });
  } catch (error) {
    console.error('importTeachers error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Bulk import students (Optimized with bulkWrite and pre-fetched lookups)
// @route POST /api/admin/import/students
const importStudents = async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'students array is required' });
    }

    // 1. Single-pass pre-fetch of all departments & series in memory
    const [deptDocs, seriesDocs] = await Promise.all([
      Department.find({}).lean(),
      Series.find({}).lean()
    ]);

    const deptMap = new Map();
    deptDocs.forEach(d => deptMap.set(d.code.toUpperCase(), d));

    const seriesMap = new Map();
    seriesDocs.forEach(s => {
      const dCode = s.departmentCode || '';
      seriesMap.set(`${s.name}_${dCode.toUpperCase()}`, s);
      seriesMap.set(s.name, s);
    });

    // 2. Pre-fetch existing students in 1 single network query
    const cleanRolls = students
      .map(s => (s.rollNumber ? String(s.rollNumber).trim() : ''))
      .filter(Boolean);
    const existingStudents = await Student.find({ rollNumber: { $in: cleanRolls } }).lean();
    const existingStudentMap = new Map();
    existingStudents.forEach(s => existingStudentMap.set(s.rollNumber, s));

    let inserted = 0;
    let updated = 0;
    let errors = [];
    const bulkOps = [];

    for (let i = 0; i < students.length; i++) {
      const row = students[i];
      if (!row.name || !row.rollNumber || !row.series || !row.department) {
        errors.push({ row: i + 1, error: 'Missing required fields (name, rollNumber, series, department)' });
        continue;
      }

      const regNo = (row.registrationNumber || row.registrationNo)?.trim();
      if (!row.password && !regNo) {
        errors.push({ row: i + 1, error: 'Registration number is required as initial password' });
        continue;
      }

      const cleanRoll = String(row.rollNumber).trim();
      const cleanDept = String(row.department).trim().toUpperCase();
      const cleanSeries = String(row.series).trim();

      const deptDoc = deptMap.get(cleanDept);
      const seriesDoc = seriesMap.get(`${cleanSeries}_${cleanDept}`) || seriesMap.get(cleanSeries);

      const existing = existingStudentMap.get(cleanRoll);
      if (existing) {
        const updateFields = {
          name: row.name.trim(),
          series: cleanSeries,
          department: cleanDept,
          regularStatus: row.regularStatus || existing.regularStatus || 'Regular',
          status: row.status || existing.status || 'active'
        };
        if (deptDoc) {
          updateFields.departmentRef = deptDoc._id;
          updateFields.facultyRef = deptDoc.faculty;
        }
        if (seriesDoc) updateFields.seriesRef = seriesDoc._id;
        if (regNo) updateFields.registrationNumber = regNo;
        if (row.contactNo) updateFields.contactNo = String(row.contactNo).trim();
        if (row.email) updateFields.email = String(row.email).trim().toLowerCase();
        if (row.section) updateFields.section = String(row.section).trim().toUpperCase();

        bulkOps.push({
          updateOne: {
            filter: { _id: existing._id },
            update: { $set: updateFields }
          }
        });
        updated++;
      } else {
        const newStudentDoc = {
          name: row.name.trim(),
          rollNumber: cleanRoll,
          registrationNumber: regNo || '',
          series: cleanSeries,
          seriesRef: seriesDoc ? seriesDoc._id : null,
          department: cleanDept,
          departmentRef: deptDoc ? deptDoc._id : null,
          facultyRef: deptDoc ? deptDoc.faculty : null,
          contactNo: row.contactNo ? String(row.contactNo).trim() : 'N/A',
          email: row.email ? String(row.email).trim().toLowerCase() : '',
          password: row.password || regNo,
          section: row.section ? String(row.section).trim().toUpperCase() : 'A',
          regularStatus: row.regularStatus || 'Regular',
          status: row.status || 'active',
          role: 'student'
        };
        bulkOps.push({ insertOne: { document: newStudentDoc } });
        inserted++;
      }
    }

    // 3. Batch execute in chunks of 200
    const CHUNK_SIZE = 200;
    for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
      const chunk = bulkOps.slice(i, i + CHUNK_SIZE);
      await Student.bulkWrite(chunk, { ordered: false });
    }

    logAudit({
      req,
      action: 'BULK_IMPORT_STUDENTS',
      entity: 'Student',
      details: `Imported students: ${inserted} created, ${updated} updated, ${errors.length} failed`
    }).catch(() => {});

    res.json({
      message: `Processed ${students.length} rows: ${inserted} created, ${updated} updated.`,
      inserted,
      updated,
      errors
    });
  } catch (error) {
    console.error('importStudents error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  importTeachers,
  importStudents
};
