/**
 * Admin Data Management Controller
 * Handles:
 * - XLSX & JSON Import Pipeline (Preview -> Validate -> Commit)
 * - Safe Delete Operations with Referential Integrity Protection (409 Conflict on dependencies)
 * - Bulk Operations (Bulk Edit, Bulk Delete with dependency checking)
 * - Data Export (XLSX & JSON) for all academic & master data entities
 * - Master Course Management (CRUD, Bulk Update, Bulk Import)
 */

const mongoose = require('mongoose');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const Course = require('../models/Course');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const AcademicSession = require('../models/AcademicSession');
const Semester = require('../models/Semester');
const Series = require('../models/Series');
const TeacherAssignment = require('../models/TeacherAssignment');
const SupervisionAssignment = require('../models/SupervisionAssignment');
const CourseOffering = require('../models/CourseOffering');
const ElectiveOffering = require('../models/ElectiveOffering');
const ElectiveSelection = require('../models/ElectiveSelection');
const Attendance = require('../models/Attendance');
const Performance = require('../models/Performance');
const FinalResult = require('../models/FinalResult');
const Project = require('../models/Project');
const ImportJob = require('../models/ImportJob');
const { logAudit } = require('../middleware/auditMiddleware');
const { parseXlsxBuffer, inspectWorkbook } = require('../utils/xlsxParser');

// In-memory import sessions cache (TTL: 30 minutes)
const importSessions = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [id, sess] of importSessions.entries()) {
    if (sess.expiresAt < now) importSessions.delete(id);
  }
}, 10 * 60 * 1000);

// Helper to sanitize documents for export (exclude passwords, hashes, internal keys)
const sanitizeDoc = (doc) => {
  const clean = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  delete clean.password;
  delete clean.passwordHash;
  delete clean.__v;
  return clean;
};

// ── 1. IMPORT XLSX PIPELINE ──────────────────────────────────────────

// POST /api/admin/imports/xlsx/preview
const previewXlsx = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No XLSX file uploaded', code: 'NO_FILE' });
    }

    const targetEntity = (req.body.targetEntity || 'students').toLowerCase();
    const { sheetNames, sheetsInfo } = inspectWorkbook(req.file.buffer);
    const selectedSheet = req.body.sheetName || sheetNames[0];
    const headerRowIndex = req.body.headerRowIndex !== undefined ? parseInt(req.body.headerRowIndex, 10) : null;

    const { headers, rows } = parseXlsxBuffer(req.file.buffer, selectedSheet, headerRowIndex);

    if (!headers || headers.length === 0) {
      return res.status(400).json({ success: false, message: 'Uploaded sheet contains no readable headers', code: 'NO_HEADERS' });
    }

    const importId = uuidv4();
    const sessionData = {
      importId,
      fileType: 'xlsx',
      targetEntity,
      headers,
      rawRows: rows,
      selectedSheet,
      metadata: req.body.metadata ? (typeof req.body.metadata === 'string' ? JSON.parse(req.body.metadata) : req.body.metadata) : {},
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000
    };

    importSessions.set(importId, sessionData);

    return res.json({
      success: true,
      importId,
      targetEntity,
      sheetNames,
      sheetsInfo,
      selectedSheet,
      headers,
      totalRows: rows.length,
      sampleRows: rows.slice(0, 10),
      expiresInMinutes: 30
    });
  } catch (error) {
    console.error('previewXlsx error:', error);
    return res.status(500).json({ success: false, message: error.message, code: 'XLSX_PREVIEW_ERROR' });
  }
};

// POST /api/admin/imports/xlsx/validate
const validateXlsx = async (req, res) => {
  try {
    const { importId, mapping = {}, duplicatePolicy = 'skip', metadata = {} } = req.body;
    const session = importSessions.get(importId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Import session expired or not found. Please upload again.', code: 'SESSION_EXPIRED' });
    }

    const rows = session.rawRows;
    const targetEntity = session.targetEntity;
    const validRows = [];
    const errorRows = [];
    const duplicateRows = [];

    // Entity-specific validation & DB duplicate checks
    if (targetEntity === 'students') {
      const rollCol = mapping.rollNumber || 'rollNumber';
      const nameCol = mapping.name || 'name';
      const regCol = mapping.registrationNumber || 'registrationNumber';

      const rollsInBatch = new Set();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const roll = String(row[rollCol] || '').trim();
        const name = String(row[nameCol] || '').trim();
        const regNo = String(row[regCol] || '').trim();

        if (!roll) {
          errorRows.push({ rowNumber: i + 1, data: row, error: 'Missing Roll Number' });
          continue;
        }

        if (rollsInBatch.has(roll)) {
          duplicateRows.push({ rowNumber: i + 1, data: row, error: 'Duplicate roll number in uploaded file' });
          continue;
        }
        rollsInBatch.add(roll);

        // Check DB duplicate
        const existing = await Student.findOne({ rollNumber: roll }).select('rollNumber name department').lean();
        if (existing) {
          duplicateRows.push({ rowNumber: i + 1, data: row, error: `Roll number ${roll} already exists in database` });
        } else {
          validRows.push({ rowNumber: i + 1, data: row, rollNumber: roll, name: name || 'Student' });
        }
      }
    } else if (targetEntity === 'teachers') {
      const idCol = mapping.teacherId || 'teacherId';
      const nameCol = mapping.name || 'name';
      const deptCol = mapping.department || 'department';

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const teacherId = String(row[idCol] || '').trim();
        const name = String(row[nameCol] || '').trim();
        const dept = String(row[deptCol] || metadata.department || '').trim().toUpperCase();

        if (!teacherId || !name) {
          errorRows.push({ rowNumber: i + 1, data: row, error: 'Teacher ID and Name are required' });
          continue;
        }

        const existing = await Teacher.findOne({ teacherId }).select('teacherId name').lean();
        if (existing) {
          duplicateRows.push({ rowNumber: i + 1, data: row, error: `Teacher ID ${teacherId} already exists in database` });
        } else {
          validRows.push({ rowNumber: i + 1, data: row, teacherId, name, department: dept });
        }
      }
    } else if (targetEntity === 'courses') {
      const codeCol = mapping.courseCode || 'courseCode';
      const nameCol = mapping.courseName || 'courseName';

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const code = String(row[codeCol] || '').trim().toUpperCase();
        const cname = String(row[nameCol] || '').trim();

        if (!code || !cname) {
          errorRows.push({ rowNumber: i + 1, data: row, error: 'Course Code and Course Name are required' });
          continue;
        }

        const existing = await Course.findOne({ courseCode: code }).select('courseCode courseName').lean();
        if (existing) {
          duplicateRows.push({ rowNumber: i + 1, data: row, error: `Course Code ${code} already exists in database` });
        } else {
          validRows.push({ rowNumber: i + 1, data: row, courseCode: code, courseName: cname });
        }
      }
    } else {
      // Generic entity validation
      validRows.push(...rows.map((r, i) => ({ rowNumber: i + 1, data: r })));
    }

    session.validatedData = {
      validRows,
      errorRows,
      duplicateRows,
      mapping,
      duplicatePolicy,
      metadata
    };

    return res.json({
      success: true,
      importId,
      targetEntity,
      summary: {
        totalRows: rows.length,
        validCount: validRows.length,
        errorCount: errorRows.length,
        duplicateCount: duplicateRows.length,
        readyToCommit: validRows.length > 0 || (duplicateRows.length > 0 && duplicatePolicy === 'update')
      },
      errors: errorRows.slice(0, 50),
      duplicates: duplicateRows.slice(0, 50)
    });
  } catch (error) {
    console.error('validateXlsx error:', error);
    return res.status(500).json({ success: false, message: error.message, code: 'XLSX_VALIDATE_ERROR' });
  }
};

// POST /api/admin/imports/xlsx/commit
const commitXlsx = async (req, res) => {
  try {
    const { importId, duplicatePolicy = 'skip' } = req.body;
    const session = importSessions.get(importId);
    if (!session || !session.validatedData) {
      return res.status(404).json({ success: false, message: 'Validated import session not found. Please re-validate.', code: 'SESSION_EXPIRED' });
    }

    const { validRows, duplicateRows, mapping, metadata } = session.validatedData;
    const targetEntity = session.targetEntity;

    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const errors = [];

    if (targetEntity === 'students') {
      const rowsToProcess = [...validRows];
      if (duplicatePolicy === 'update') {
        rowsToProcess.push(...duplicateRows);
      }

      for (const item of rowsToProcess) {
        const row = item.data;
        const roll = String(row[mapping.rollNumber || 'rollNumber'] || '').trim();
        const name = String(row[mapping.name || 'name'] || '').trim();
        const regNo = String(row[mapping.registrationNumber || 'registrationNumber'] || '').trim();
        const dept = String(row[mapping.department || 'department'] || metadata.department || 'ETE').trim().toUpperCase();
        const series = String(row[mapping.series || 'series'] || metadata.series || (roll.length >= 2 ? roll.slice(0, 2) : '22')).trim();
        const sessionName = String(row[mapping.session || 'session'] || metadata.session || `20${series}-20${parseInt(series) + 1}`).trim();
        const semester = String(row[mapping.semester || 'semester'] || metadata.semester || '1st').trim();
        const email = String(row[mapping.email || 'email'] || '').trim().toLowerCase();
        const contactNo = String(row[mapping.contactNo || 'contactNo'] || '').trim();

        try {
          const deptDoc = await Department.findOne({ code: dept });
          const seriesDoc = await Series.findOne({ name: series, departmentCode: dept });
          const sessDoc = await AcademicSession.findOne({ name: sessionName });

          let student = await Student.findOne({ rollNumber: roll });
          if (student) {
            if (duplicatePolicy === 'skip') continue;
            student.name = name || student.name;
            student.series = series || student.series;
            student.department = dept;
            if (regNo) student.registrationNumber = regNo;
            if (email) student.email = email;
            if (contactNo) student.contactNo = contactNo;
            if (deptDoc) student.departmentRef = deptDoc._id;
            if (seriesDoc) student.seriesRef = seriesDoc._id;
            if (sessDoc) student.academicSessionRef = sessDoc._id;
            await student.save();
            updatedCount++;
          } else {
            const plainPassword = regNo || '123456';
            const passwordHash = await bcrypt.hash(plainPassword, 10);
            student = await Student.create({
              name: name || `Student ${roll}`,
              rollNumber: roll,
              registrationNumber: regNo,
              series,
              session: sessionName,
              semester,
              department: dept,
              departmentRef: deptDoc ? deptDoc._id : null,
              facultyRef: deptDoc ? deptDoc.faculty : null,
              seriesRef: seriesDoc ? seriesDoc._id : null,
              academicSessionRef: sessDoc ? sessDoc._id : null,
              email,
              contactNo,
              password: plainPassword,
              status: 'active'
            });

            // Ensure matching User account
            const existingUser = await User.findOne({ loginIdentifierLower: roll.toLowerCase() });
            if (!existingUser) {
              await User.create({
                name: student.name,
                loginIdentifier: roll,
                loginIdentifierLower: roll.toLowerCase(),
                passwordHash,
                role: 'student',
                department: dept,
                departmentRef: deptDoc ? deptDoc._id : null,
                profileModel: 'Student',
                profileRef: student._id,
                status: 'ACTIVE'
              });
            }
            createdCount++;
          }
        } catch (err) {
          failedCount++;
          errors.push({ roll, error: err.message });
        }
      }
    } else if (targetEntity === 'teachers') {
      const rowsToProcess = [...validRows];
      if (duplicatePolicy === 'update') rowsToProcess.push(...duplicateRows);

      for (const item of rowsToProcess) {
        const row = item.data;
        const teacherId = String(row[mapping.teacherId || 'teacherId'] || '').trim();
        const name = String(row[mapping.name || 'name'] || '').trim();
        const dept = String(row[mapping.department || 'department'] || metadata.department || 'ETE').trim().toUpperCase();
        const email = String(row[mapping.email || 'email'] || '').trim().toLowerCase();
        const designation = String(row[mapping.designation || 'designation'] || 'Lecturer').trim();

        try {
          const deptDoc = await Department.findOne({ code: dept });
          let teacher = await Teacher.findOne({ teacherId });
          if (teacher) {
            if (duplicatePolicy === 'skip') continue;
            teacher.name = name || teacher.name;
            teacher.department = dept;
            teacher.email = email || teacher.email;
            teacher.designation = designation || teacher.designation;
            if (deptDoc) teacher.departmentRef = deptDoc._id;
            await teacher.save();
            updatedCount++;
          } else {
            const passwordHash = await bcrypt.hash('123456', 10);
            teacher = await Teacher.create({
              name,
              teacherId,
              department: dept,
              departmentRef: deptDoc ? deptDoc._id : null,
              facultyRef: deptDoc ? deptDoc.faculty : null,
              email,
              designation,
              password: passwordHash,
              dutyStatus: 'ON_DUTY'
            });

            const existingUser = await User.findOne({ loginIdentifierLower: teacherId.toLowerCase() });
            if (!existingUser) {
              await User.create({
                name: teacher.name,
                loginIdentifier: teacherId,
                loginIdentifierLower: teacherId.toLowerCase(),
                passwordHash,
                role: 'teacher',
                department: dept,
                departmentRef: deptDoc ? deptDoc._id : null,
                profileModel: 'Teacher',
                profileRef: teacher._id,
                status: 'ACTIVE'
              });
            }
            createdCount++;
          }
        } catch (err) {
          failedCount++;
          errors.push({ teacherId, error: err.message });
        }
      }
    } else if (targetEntity === 'courses') {
      const rowsToProcess = [...validRows];
      if (duplicatePolicy === 'update') rowsToProcess.push(...duplicateRows);

      for (const item of rowsToProcess) {
        const row = item.data;
        const code = String(row[mapping.courseCode || 'courseCode'] || '').trim().toUpperCase();
        const cname = String(row[mapping.courseName || 'courseName'] || '').trim();
        const credit = parseFloat(row[mapping.credit || 'credit']) || 3.0;
        const dept = String(row[mapping.department || 'department'] || metadata.department || 'ETE').trim().toUpperCase();
        const courseType = row[mapping.courseType || 'courseType'] || 'Theory';

        try {
          const deptDoc = await Department.findOne({ code: dept });
          let course = await Course.findOne({ courseCode: code });
          if (course) {
            if (duplicatePolicy === 'skip') continue;
            course.courseName = cname || course.courseName;
            course.credit = credit;
            course.departmentCode = dept;
            if (deptDoc) course.department = deptDoc._id;
            await course.save();
            updatedCount++;
          } else {
            await Course.create({
              courseCode: code,
              courseName: cname,
              credit,
              courseType,
              departmentCode: dept,
              department: deptDoc ? deptDoc._id : null,
              status: 'active'
            });
            createdCount++;
          }
        } catch (err) {
          failedCount++;
          errors.push({ courseCode: code, error: err.message });
        }
      }
    }

    // Record import job in DB
    const importJob = await ImportJob.create({
      jobId: importId,
      fileName: `import_${targetEntity}_${Date.now()}.xlsx`,
      uploadedBy: req.user?._id || req.user?.id,
      uploadedByName: req.user?.name || 'Admin',
      department: metadata.department || 'GLOBAL',
      status: failedCount > 0 && createdCount === 0 ? 'failed' : 'completed',
      totalRows: session.rawRows.length,
      insertedCount: createdCount,
      updatedCount: updatedCount,
      errorCount: failedCount,
      errors: errors.slice(0, 50)
    });

    await logAudit({
      req,
      action: 'IMPORT_COMMITTED',
      entity: targetEntity,
      entityId: importJob._id,
      details: `Committed XLSX import for ${targetEntity}: ${createdCount} created, ${updatedCount} updated, ${failedCount} failed`,
      newValues: { targetEntity, createdCount, updatedCount, failedCount }
    });

    importSessions.delete(importId);

    return res.json({
      success: true,
      importId,
      jobId: importJob.jobId,
      targetEntity,
      createdCount,
      updatedCount,
      failedCount,
      errors,
      message: `Successfully processed ${createdCount + updatedCount} ${targetEntity} records.`
    });
  } catch (error) {
    console.error('commitXlsx error:', error);
    return res.status(500).json({ success: false, message: error.message, code: 'XLSX_COMMIT_ERROR' });
  }
};

// ── 2. IMPORT JSON PIPELINE ──────────────────────────────────────────

// POST /api/admin/imports/json/preview
const previewJson = async (req, res) => {
  try {
    const { data, targetEntity = 'students', metadata = {} } = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or empty JSON array provided', code: 'INVALID_JSON' });
    }

    const headers = Object.keys(data[0] || {});
    const importId = uuidv4();

    const sessionData = {
      importId,
      fileType: 'json',
      targetEntity: targetEntity.toLowerCase(),
      headers,
      rawRows: data,
      metadata,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000
    };

    importSessions.set(importId, sessionData);

    return res.json({
      success: true,
      importId,
      targetEntity: targetEntity.toLowerCase(),
      headers,
      totalRows: data.length,
      sampleRows: data.slice(0, 10),
      expiresInMinutes: 30
    });
  } catch (error) {
    console.error('previewJson error:', error);
    return res.status(500).json({ success: false, message: error.message, code: 'JSON_PREVIEW_ERROR' });
  }
};

// POST /api/admin/imports/json/validate
const validateJson = async (req, res) => {
  // Leverage common validation logic
  return validateXlsx(req, res);
};

// POST /api/admin/imports/json/commit
const commitJson = async (req, res) => {
  // Leverage common commit logic
  return commitXlsx(req, res);
};

// ── 3. IMPORT JOBS MANAGEMENT ────────────────────────────────────────

// GET /api/admin/imports
const getImportJobs = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, jobs] = await Promise.all([
      ImportJob.countDocuments(),
      ImportJob.find().sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean()
    ]);

    return res.json({
      success: true,
      jobs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/imports/:id
const getImportJobById = async (req, res) => {
  try {
    const job = await ImportJob.findOne({ $or: [{ _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : null }, { jobId: req.params.id }] }).lean();
    if (!job) return res.status(404).json({ success: false, message: 'Import job not found' });
    return res.json({ success: true, job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/imports/:id/errors
const getImportJobErrors = async (req, res) => {
  try {
    const job = await ImportJob.findOne({ $or: [{ _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : null }, { jobId: req.params.id }] }).lean();
    if (!job) return res.status(404).json({ success: false, message: 'Import job not found' });
    return res.json({ success: true, errors: job.errors || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/imports/:id/cancel
const cancelImportJob = async (req, res) => {
  try {
    const job = await ImportJob.findOne({ $or: [{ _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : null }, { jobId: req.params.id }] });
    if (!job) return res.status(404).json({ success: false, message: 'Import job not found' });
    job.status = 'cancelled';
    await job.save();
    return res.json({ success: true, message: 'Import job cancelled', job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── 4. DATA EXPORT (XLSX & JSON) ─────────────────────────────────────

// GET /api/admin/export/:entity
const exportData = async (req, res) => {
  try {
    const { entity } = req.params;
    const { format = 'xlsx', department, series, session, status, search } = req.query;
    const cleanEntity = entity.toLowerCase();

    let data = [];
    let filename = `export_${cleanEntity}_${Date.now()}`;

    const query = {};
    if (department && department !== 'ALL') query.department = department.toUpperCase();
    if (series) query.series = series;
    if (session) query.session = session;
    if (status) query.status = status;

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { rollNumber: { $regex: s, $options: 'i' } },
        { teacherId: { $regex: s, $options: 'i' } },
        { courseCode: { $regex: s, $options: 'i' } }
      ];
    }

    if (cleanEntity === 'students') {
      const docs = await Student.find(query).select('-password -__v').lean();
      data = docs.map(d => ({
        rollNumber: d.rollNumber,
        registrationNumber: d.registrationNumber || '',
        name: d.name,
        department: d.department,
        series: d.series,
        session: d.session || '',
        semester: d.semester || '',
        email: d.email || '',
        contactNo: d.contactNo || '',
        status: d.status || 'active',
        regularStatus: d.regularStatus || 'Regular'
      }));
    } else if (cleanEntity === 'teachers') {
      const docs = await Teacher.find(query).select('-password -__v').lean();
      data = docs.map(d => ({
        teacherId: d.teacherId,
        name: d.name,
        department: d.department,
        designation: d.designation || '',
        email: d.email || '',
        contactNo: d.contactNo || '',
        dutyStatus: d.dutyStatus || 'ON_DUTY'
      }));
    } else if (cleanEntity === 'courses') {
      const courseQuery = {};
      if (department && department !== 'ALL') courseQuery.departmentCode = department.toUpperCase();
      const docs = await Course.find(courseQuery).select('-__v').lean();
      data = docs.map(d => ({
        courseCode: d.courseCode,
        courseName: d.courseName,
        credit: d.credit,
        courseType: d.courseType,
        department: d.departmentCode || '',
        status: d.status || 'active'
      }));
    } else if (cleanEntity === 'academic-sessions') {
      const docs = await AcademicSession.find().lean();
      data = docs.map(d => ({ name: d.name, startDate: d.startDate, endDate: d.endDate, status: d.status }));
    } else if (cleanEntity === 'teaching-assignments') {
      const docs = await TeacherAssignment.find().populate('teacher course').lean();
      data = docs.map(d => ({
        teacher: d.teacherName || d.teacherId,
        course: d.courseCode,
        academicSession: d.academicSession,
        series: d.series,
        section: d.section,
        status: d.status
      }));
    } else if (cleanEntity === 'supervision') {
      const docs = await SupervisionAssignment.find().populate('studentId teacherId').lean();
      data = docs.map(d => ({
        studentRoll: d.studentRoll || d.studentId?.rollNumber,
        studentName: d.studentName || d.studentId?.name,
        teacherName: d.teacherName || d.teacherId?.name,
        type: d.type,
        status: d.status
      }));
    } else if (cleanEntity === 'electives') {
      const docs = await ElectiveOffering.find().lean();
      data = docs.map(d => ({
        academicSession: d.academicSession,
        series: d.series,
        status: d.status
      }));
    } else {
      return res.status(400).json({ success: false, message: `Unsupported export entity "${entity}"` });
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      return res.json(data);
    }

    // Default: XLSX format
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, cleanEntity.slice(0, 31));
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'no-cache'
    });
    return res.send(buffer);
  } catch (error) {
    console.error('exportData error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── 5. SAFE DELETION WITH REFERENTIAL INTEGRITY (Section 16 & 17) ────

// Helper to inspect if Student has academic dependencies
const checkStudentDependencies = async (student) => {
  const [attCount, perfCount, resCount, supCount, elecCount, projCount] = await Promise.all([
    Attendance.countDocuments({ $or: [{ studentId: student.rollNumber }, { student: student._id }] }),
    Performance.countDocuments({ $or: [{ studentId: student.rollNumber }, { rollNumber: student.rollNumber }] }),
    FinalResult.countDocuments({ $or: [{ studentId: student.rollNumber }, { rollNumber: student.rollNumber }] }),
    SupervisionAssignment.countDocuments({ studentId: student._id }),
    ElectiveSelection.countDocuments({ $or: [{ studentId: student._id }, { roll: student.rollNumber }] }),
    Project.countDocuments({ $or: [{ 'students.student': student._id }, { 'students.rollNumber': student.rollNumber }] })
  ]);

  const reasons = [];
  if (attCount > 0) reasons.push(`${attCount} attendance records`);
  if (perfCount > 0) reasons.push(`${perfCount} performance/mark entries`);
  if (resCount > 0) reasons.push(`${resCount} final result records`);
  if (supCount > 0) reasons.push(`${supCount} supervision allocations`);
  if (elecCount > 0) reasons.push(`${elecCount} elective selections`);
  if (projCount > 0) reasons.push(`${projCount} project assignments`);

  return { hasDependencies: reasons.length > 0, reasons };
};

// DELETE /api/admin/students/:id (Safe)
const deleteStudentSafe = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const { hasDependencies, reasons } = await checkStudentDependencies(student);
    if (hasDependencies && !req.query.force) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DEPENDENCY_EXISTS',
          message: `This student has active academic records (${reasons.join(', ')}) and cannot be permanently deleted. Archive or deactivate instead.`
        }
      });
    }

    // Delete associated User account
    await User.deleteMany({
      $or: [
        { loginIdentifierLower: student.rollNumber.toLowerCase() },
        { profileRef: student._id }
      ]
    });

    await student.deleteOne();

    await logAudit({
      req,
      action: 'DELETE_STUDENT',
      entity: 'Student',
      entityId: student._id,
      details: `Permanently deleted student ${student.name} (${student.rollNumber})`,
      oldValues: { rollNumber: student.rollNumber, name: student.name }
    });

    return res.json({ success: true, message: `Student ${student.rollNumber} permanently deleted.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper to inspect if Course has academic dependencies
const checkCourseDependencies = async (course) => {
  const [assignCount, offeringCount, elecCount, attCount, resCount] = await Promise.all([
    TeacherAssignment.countDocuments({ $or: [{ courseId: course._id }, { courseCode: course.courseCode }] }),
    CourseOffering.countDocuments({ courseId: course._id }),
    ElectiveOffering.countDocuments({ courseId: course._id }),
    Attendance.countDocuments({ courseCode: course.courseCode }),
    FinalResult.countDocuments({ courseCode: course.courseCode })
  ]);

  const reasons = [];
  if (assignCount > 0) reasons.push(`${assignCount} teaching assignments`);
  if (offeringCount > 0) reasons.push(`${offeringCount} active course offerings`);
  if (elecCount > 0) reasons.push(`${elecCount} elective course offerings`);
  if (attCount > 0) reasons.push(`${attCount} attendance records`);
  if (resCount > 0) reasons.push(`${resCount} final result records`);

  return { hasDependencies: reasons.length > 0, reasons };
};

// DELETE /api/admin/courses/:id (Safe)
const deleteCourseSafe = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const { hasDependencies, reasons } = await checkCourseDependencies(course);
    if (hasDependencies && !req.query.force) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DEPENDENCY_EXISTS',
          message: `This course has active academic records (${reasons.join(', ')}) and cannot be permanently deleted. Archive it instead.`
        }
      });
    }

    await course.deleteOne();

    await logAudit({
      req,
      action: 'DELETE_COURSE',
      entity: 'Course',
      entityId: course._id,
      details: `Permanently deleted course ${course.courseCode} - ${course.courseName}`,
      oldValues: { courseCode: course.courseCode, courseName: course.courseName }
    });

    return res.json({ success: true, message: `Course ${course.courseCode} permanently deleted.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/bulk-delete
const bulkDeleteSafe = async (req, res) => {
  try {
    const { entity = 'students', ids = [] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No IDs provided for bulk deletion' });
    }

    const successful = [];
    const failed = [];
    const skipped = [];

    if (entity === 'students') {
      const students = await Student.find({ _id: { $in: ids } });
      for (const student of students) {
        const { hasDependencies, reasons } = await checkStudentDependencies(student);
        if (hasDependencies) {
          skipped.push({ id: student._id, rollNumber: student.rollNumber, reason: `Has active records: ${reasons.join(', ')}` });
        } else {
          try {
            await User.deleteMany({
              $or: [
                { loginIdentifierLower: student.rollNumber.toLowerCase() },
                { profileRef: student._id }
              ]
            });
            await student.deleteOne();
            successful.push({ id: student._id, rollNumber: student.rollNumber });
          } catch (err) {
            failed.push({ id: student._id, error: err.message });
          }
        }
      }
    } else if (entity === 'courses') {
      const courses = await Course.find({ _id: { $in: ids } });
      for (const course of courses) {
        const { hasDependencies, reasons } = await checkCourseDependencies(course);
        if (hasDependencies) {
          skipped.push({ id: course._id, courseCode: course.courseCode, reason: `Has active records: ${reasons.join(', ')}` });
        } else {
          try {
            await course.deleteOne();
            successful.push({ id: course._id, courseCode: course.courseCode });
          } catch (err) {
            failed.push({ id: course._id, error: err.message });
          }
        }
      }
    } else {
      return res.status(400).json({ success: false, message: `Bulk delete not supported for entity "${entity}"` });
    }

    await logAudit({
      req,
      action: 'BULK_DELETE',
      entity,
      details: `Bulk deleted ${successful.length} records. Skipped ${skipped.length} due to dependencies. Failed ${failed.length}.`,
      newValues: { successfulCount: successful.length, skippedCount: skipped.length, failedCount: failed.length }
    });

    return res.json({
      success: true,
      successful,
      failed,
      skipped,
      message: `Deleted ${successful.length} records. ${skipped.length} skipped due to academic records.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── 6. ADMIN COURSE MASTER DATA (Section 18) ──────────────────────────

// POST /api/admin/courses
const createCourse = async (req, res) => {
  try {
    const { courseCode, courseName, credit, creditHours, departmentCode, courseType, isElective, description, status } = req.body;
    if (!courseCode || !courseName) {
      return res.status(400).json({ success: false, message: 'Course Code and Course Name are required' });
    }

    const cleanCode = courseCode.trim().toUpperCase();
    const existing = await Course.findOne({ courseCode: cleanCode });
    if (existing) {
      return res.status(400).json({ success: false, message: `Course ${cleanCode} already exists` });
    }

    const deptDoc = departmentCode ? await Department.findOne({ code: departmentCode.trim().toUpperCase() }) : null;

    const course = await Course.create({
      courseCode: cleanCode,
      courseName: courseName.trim(),
      credit: parseFloat(credit) || 3.0,
      creditHours: parseFloat(creditHours || credit) || 3.0,
      departmentCode: departmentCode ? departmentCode.trim().toUpperCase() : 'ETE',
      department: deptDoc ? deptDoc._id : null,
      courseType: courseType || 'Theory',
      isElective: isElective !== undefined ? isElective : false,
      description: description || '',
      status: status || 'active'
    });

    await logAudit({
      req,
      action: 'CREATE_COURSE',
      entity: 'Course',
      entityId: course._id,
      details: `Created master course ${course.courseCode} - ${course.courseName}`,
      newValues: course.toObject()
    });

    return res.status(201).json({ success: true, course });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/courses/:id
const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('department faculty');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    return res.json({ success: true, course });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/admin/courses/:id
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const allowedFields = ['courseName', 'credit', 'creditHours', 'departmentCode', 'courseType', 'isElective', 'description', 'status', 'syllabus'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) course[field] = req.body[field];
    });

    if (req.body.departmentCode) {
      const deptDoc = await Department.findOne({ code: req.body.departmentCode.trim().toUpperCase() });
      if (deptDoc) course.department = deptDoc._id;
    }

    await course.save();

    await logAudit({
      req,
      action: 'UPDATE_COURSE',
      entity: 'Course',
      entityId: course._id,
      details: `Updated master course ${course.courseCode}`,
      newValues: course.toObject()
    });

    return res.json({ success: true, course });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/courses/bulk-update
const bulkUpdateCourses = async (req, res) => {
  try {
    const { courseIds = [], updates = {} } = req.body;
    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No course IDs provided' });
    }

    const allowed = ['status', 'isElective', 'courseType', 'credit'];
    const safeUpdates = {};
    allowed.forEach(k => {
      if (updates[k] !== undefined) safeUpdates[k] = updates[k];
    });

    const result = await Course.updateMany({ _id: { $in: courseIds } }, { $set: safeUpdates });

    return res.json({ success: true, modifiedCount: result.modifiedCount, message: `Updated ${result.modifiedCount} courses.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  previewXlsx,
  validateXlsx,
  commitXlsx,
  previewJson,
  validateJson,
  commitJson,
  getImportJobs,
  getImportJobById,
  getImportJobErrors,
  cancelImportJob,
  exportData,
  deleteStudentSafe,
  deleteCourseSafe,
  bulkDeleteSafe,
  createCourse,
  getCourseById,
  updateCourse,
  bulkUpdateCourses
};
