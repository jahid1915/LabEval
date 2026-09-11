const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Department = require('../models/Department');
const Series = require('../models/Series');
const CourseOffering = require('../models/CourseOffering');
const FinalResult = require('../models/FinalResult');
const { logAudit } = require('../middleware/auditMiddleware');

// @desc Bulk import teachers
// @route POST /api/admin/import/teachers
const importTeachers = async (req, res) => {
  try {
    const { teachers } = req.body;
    if (!Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({ message: 'teachers array is required' });
    }

    let inserted = 0;
    let updated = 0;
    let errors = [];

    for (let i = 0; i < teachers.length; i++) {
      const row = teachers[i];
      if (!row.name || !row.teacherId || !row.department) {
        errors.push({ row: i + 1, error: 'Missing required fields (name, teacherId, department)' });
        continue;
      }

      try {
        const cleanId = row.teacherId.trim().toUpperCase();
        const cleanDept = row.department.trim().toUpperCase();

        const deptDoc = await Department.findOne({ code: cleanDept });

        const existing = await Teacher.findOne({ teacherId: cleanId });
        if (existing) {
          existing.name = row.name.trim();
          existing.department = cleanDept;
          if (deptDoc) {
            existing.departmentRef = deptDoc._id;
            existing.facultyRef = deptDoc.faculty;
          }
          if (row.designation) existing.designation = row.designation.trim();
          if (row.contactNo) existing.contactNo = row.contactNo.trim();
          if (row.email) existing.email = row.email.trim().toLowerCase();
          if (row.dutyStatus) existing.dutyStatus = row.dutyStatus;
          await existing.save();
          updated++;
        } else {
          await Teacher.create({
            name: row.name.trim(),
            teacherId: cleanId,
            department: cleanDept,
            departmentRef: deptDoc ? deptDoc._id : null,
            facultyRef: deptDoc ? deptDoc.faculty : null,
            designation: row.designation?.trim() || 'Lecturer',
            contactNo: row.contactNo?.trim() || 'N/A',
            email: row.email?.trim().toLowerCase() || '',
            password: row.password || '123456',
            dutyStatus: row.dutyStatus || 'ON_DUTY'
          });
          inserted++;
        }
      } catch (err) {
        errors.push({ row: i + 1, error: err.message });
      }
    }

    await logAudit({
      req,
      action: 'BULK_IMPORT_TEACHERS',
      entity: 'Teacher',
      details: `Imported teachers: ${inserted} created, ${updated} updated, ${errors.length} failed`
    });

    res.json({
      message: `Processed ${teachers.length} rows: ${inserted} created, ${updated} updated.`,
      inserted,
      updated,
      errors
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Bulk import students
// @route POST /api/admin/import/students
const importStudents = async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'students array is required' });
    }

    let inserted = 0;
    let updated = 0;
    let errors = [];

    for (let i = 0; i < students.length; i++) {
      const row = students[i];
      if (!row.name || !row.rollNumber || !row.series || !row.department) {
        errors.push({ row: i + 1, error: 'Missing required fields (name, rollNumber, series, department)' });
        continue;
      }

      try {
        const cleanRoll = row.rollNumber.trim();
        const cleanDept = row.department.trim().toUpperCase();
        const cleanSeries = row.series.trim();

        const [deptDoc, seriesDoc] = await Promise.all([
          Department.findOne({ code: cleanDept }),
          Series.findOne({ name: cleanSeries, departmentCode: cleanDept })
        ]);

        const existing = await Student.findOne({ rollNumber: cleanRoll });
        if (existing) {
          existing.name = row.name.trim();
          existing.series = cleanSeries;
          existing.department = cleanDept;
          if (deptDoc) {
            existing.departmentRef = deptDoc._id;
            existing.facultyRef = deptDoc.faculty;
          }
          if (seriesDoc) existing.seriesRef = seriesDoc._id;
          if (row.registrationNumber) existing.registrationNumber = row.registrationNumber.trim();
          if (row.contactNo) existing.contactNo = row.contactNo.trim();
          if (row.email) existing.email = row.email.trim().toLowerCase();
          if (row.status) existing.status = row.status;
          await existing.save();
          updated++;
        } else {
          await Student.create({
            name: row.name.trim(),
            rollNumber: cleanRoll,
            registrationNumber: row.registrationNumber?.trim() || '',
            series: cleanSeries,
            seriesRef: seriesDoc ? seriesDoc._id : null,
            department: cleanDept,
            departmentRef: deptDoc ? deptDoc._id : null,
            facultyRef: deptDoc ? deptDoc.faculty : null,
            contactNo: row.contactNo?.trim() || 'N/A',
            email: row.email?.trim().toLowerCase() || '',
            password: row.password || cleanRoll,
            status: row.status || 'active'
          });
          inserted++;
        }
      } catch (err) {
        errors.push({ row: i + 1, error: err.message });
      }
    }

    await logAudit({
      req,
      action: 'BULK_IMPORT_STUDENTS',
      entity: 'Student',
      details: `Imported students: ${inserted} created, ${updated} updated, ${errors.length} failed`
    });

    res.json({
      message: `Processed ${students.length} rows: ${inserted} created, ${updated} updated.`,
      inserted,
      updated,
      errors
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  importTeachers,
  importStudents
};
