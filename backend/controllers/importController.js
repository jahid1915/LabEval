/**
 * Student XLSX Import Controller
 * Handles the full import pipeline:
 *   Upload → Parse → Validate → Preview/Dry-Run → BulkWrite → Summary
 */
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Student = require('../models/Student');
const Department = require('../models/Department');
const Series = require('../models/Series');
const ImportJob = require('../models/ImportJob');
const { logAudit } = require('../middleware/auditMiddleware');
const { parseXlsxBuffer, autoDetectMapping, applyMapping, validateRow, generateTemplate } = require('../utils/xlsxParser');
const { getSessionFromSeries } = require('../utils/academicUtils');
const bcrypt = require('bcryptjs');

// ── Multer Setup (memory storage — no disk writes) ────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,  // 10 MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    const allowedExts = ['.xlsx', '.xls'];
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream'
    ];
    if (!allowedExts.includes(ext)) {
      return cb(new Error(`Invalid file type "${ext}". Only .xlsx and .xls are allowed.`));
    }
    // Be lenient about MIME type (browsers report inconsistently)
    cb(null, true);
  }
});

// ── Export multer middleware ───────────────────────────────────────────────────
const uploadMiddleware = upload.single('file');

// ── Chunked BulkWrite ─────────────────────────────────────────────────────────
const CHUNK_SIZE = 500;

async function bulkWriteChunk(operations) {
  if (operations.length === 0) return { nUpserted: 0, nModified: 0 };
  const result = await Student.bulkWrite(operations, { ordered: false });
  return {
    nUpserted: result.nUpserted || 0,
    nModified: result.nModified || 0
  };
}

// ── Helper: Hash password ─────────────────────────────────────────────────────
async function hashPassword(plainText) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

// ── GET /api/import/template ──────────────────────────────────────────────────
const downloadTemplate = async (req, res) => {
  try {
    const buffer = generateTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="LabEval_Student_Import_Template.xlsx"',
      'Content-Length': buffer.length,
      'Cache-Control': 'no-cache'
    });
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate template', code: 'TEMPLATE_ERROR' });
  }
};

// ── POST /api/import/students/parse ──────────────────────────────────────────
// Step 1: Upload + Parse + Auto-detect mapping
const parseUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded', code: 'NO_FILE' });
    }

    const { headers, rows, sheetName } = parseXlsxBuffer(req.file.buffer);
    const autoMapping = autoDetectMapping(headers);

    // Get all department codes for validation hints
    const departments = await Department.find({ status: 'active' }).select('code').lean();
    const deptCodes = departments.map(d => d.code);

    return res.json({
      success: true,
      data: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        sheetName,
        totalRows: rows.length,
        headers,
        autoMapping,
        sampleRows: rows.slice(0, 5).map(r => {
          // Remove internal _rowIndex for client display
          const { _rowIndex, ...rest } = r;
          return rest;
        }),
        availableDepartments: deptCodes
      }
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message, code: 'PARSE_ERROR' });
  }
};

// ── POST /api/import/students/preview ────────────────────────────────────────
// Step 2: Apply mapping, validate all rows, check DB for duplicates
const previewImport = async (req, res) => {
  try {
    const { fileName, fileSize, rows: rawRows, mapping, importMode = 'upsert' } = req.body;

    if (!rawRows || !Array.isArray(rawRows) || rawRows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows provided', code: 'NO_ROWS' });
    }
    if (!mapping || Object.keys(mapping).length === 0) {
      return res.status(400).json({ success: false, message: 'Column mapping is required', code: 'NO_MAPPING' });
    }

    // Get department codes for validation
    const departments = await Department.find({ status: 'active' }).select('code').lean();
    const validDeptCodes = departments.map(d => d.code);

    // Apply mapping
    const mappedRows = applyMapping(rawRows, mapping);

    // Validate each row
    const validRows = [];
    const invalidRows = [];
    const rowErrors = [];

    for (const row of mappedRows) {
      const { valid, data, errors } = validateRow(row, row._rowIndex, validDeptCodes);
      if (valid) {
        validRows.push({ ...data, _rowIndex: row._rowIndex });
      } else {
        invalidRows.push({ rowIndex: row._rowIndex, errors });
        errors.forEach(msg => {
          rowErrors.push({ row: row._rowIndex, message: msg });
        });
      }
    }

    // Detect in-file duplicates (by rollNumber)
    const rollsInFile = new Map();
    const duplicateRows = [];
    const deduplicatedValid = [];

    for (const row of validRows) {
      if (rollsInFile.has(row.rollNumber)) {
        duplicateRows.push({
          rowIndex: row._rowIndex,
          message: `Duplicate in file: roll number "${row.rollNumber}" already seen at row ${rollsInFile.get(row.rollNumber)}`
        });
        rowErrors.push({
          row: row._rowIndex,
          message: `⚠ Duplicate in file: roll number "${row.rollNumber}"`
        });
      } else {
        rollsInFile.set(row.rollNumber, row._rowIndex);
        deduplicatedValid.push(row);
      }
    }

    // Check against existing DB records
    const rollNumbers = deduplicatedValid.map(r => r.rollNumber);
    const existingStudents = rollNumbers.length > 0
      ? await Student.find({ rollNumber: { $in: rollNumbers } }).select('rollNumber name department series').lean()
      : [];

    const existingRollSet = new Set(existingStudents.map(s => s.rollNumber));

    const newStudents = deduplicatedValid.filter(r => !existingRollSet.has(r.rollNumber));
    const updateStudents = deduplicatedValid.filter(r => existingRollSet.has(r.rollNumber));

    // Calculate what will actually happen based on importMode
    let toInsert = 0, toUpdate = 0, toSkip = 0;
    switch (importMode) {
      case 'add_new':
        toInsert = newStudents.length;
        toSkip = updateStudents.length; // existing skipped
        break;
      case 'update_existing':
        toUpdate = updateStudents.length;
        toSkip = newStudents.length; // new skipped
        break;
      case 'upsert':
        toInsert = newStudents.length;
        toUpdate = updateStudents.length;
        break;
      case 'dry_run':
        toInsert = newStudents.length;
        toUpdate = updateStudents.length;
        break;
    }

    return res.json({
      success: true,
      data: {
        summary: {
          totalRows: rawRows.length,
          validRows: deduplicatedValid.length,
          invalidRows: invalidRows.length,
          duplicateRows: duplicateRows.length,
          existingStudents: updateStudents.length,
          newStudents: newStudents.length,
          toInsert,
          toUpdate,
          toSkip
        },
        importMode,
        errors: rowErrors.slice(0, 200),  // Cap at 200 errors for response size
        totalErrors: rowErrors.length,
        sampleNew: newStudents.slice(0, 5).map(({ _rowIndex, ...r }) => r),
        sampleUpdate: updateStudents.slice(0, 5).map(({ _rowIndex, ...r }) => r),
        isDryRun: importMode === 'dry_run'
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, code: 'PREVIEW_ERROR' });
  }
};

// ── POST /api/import/students/execute ────────────────────────────────────────
// Step 3: Actually perform the import (or confirm dry run result)
const executeImport = async (req, res) => {
  const jobId = `IMP-${uuidv4().slice(0, 8).toUpperCase()}`;
  let importJob = null;

  try {
    const { fileName, fileSize, rows: rawRows, mapping, importMode = 'upsert', department: adminDept } = req.body;

    if (!rawRows || !Array.isArray(rawRows) || rawRows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows provided', code: 'NO_ROWS' });
    }

    const adminId = req.user._id;
    const adminName = req.user.name;
    const deptFilter = adminDept || (req.user.departmentCode ? req.user.departmentCode.toUpperCase() : null);

    // Create ImportJob record
    importJob = await ImportJob.create({
      jobId,
      fileName: fileName || 'unknown.xlsx',
      fileSize: fileSize || 0,
      adminId,
      adminName,
      department: deptFilter || '',
      importMode,
      columnMapping: mapping,
      status: 'processing',
      startedAt: new Date()
    });

    if (importMode === 'dry_run') {
      // Dry run — just validate, no DB write
      importJob.status = 'completed';
      importJob.completedAt = new Date();
      await importJob.save();
      return res.json({
        success: true,
        message: 'Dry run completed — no changes made to database',
        jobId,
        isDryRun: true
      });
    }

    // Get department docs for reference resolution
    const departments = await Department.find({ status: 'active' }).select('_id code faculty').lean();
    const deptMap = {};
    departments.forEach(d => { deptMap[d.code] = d; });

    const validDeptCodes = departments.map(d => d.code);

    // Apply mapping
    const mappedRows = applyMapping(rawRows, mapping);

    // Validate rows
    const validRows = [];
    const rowErrors = [];
    let invalidCount = 0;

    for (const row of mappedRows) {
      const { valid, data, errors } = validateRow(row, row._rowIndex, validDeptCodes);
      if (valid) {
        validRows.push({ ...data, _rowIndex: row._rowIndex });
      } else {
        invalidCount++;
        errors.forEach(msg => rowErrors.push({ row: row._rowIndex, message: msg }));
      }
    }

    // Deduplicate in-file
    const rollsInFile = new Map();
    const deduplicatedValid = [];
    let dupCount = 0;

    for (const row of validRows) {
      if (rollsInFile.has(row.rollNumber)) {
        dupCount++;
        rowErrors.push({ row: row._rowIndex, message: `Duplicate in file: "${row.rollNumber}"` });
      } else {
        rollsInFile.set(row.rollNumber, row._rowIndex);
        deduplicatedValid.push(row);
      }
    }

    // Check existing
    const rollNumbers = deduplicatedValid.map(r => r.rollNumber);
    const existingStudents = rollNumbers.length > 0
      ? await Student.find({ rollNumber: { $in: rollNumbers } }).select('rollNumber _id').lean()
      : [];
    const existingRollSet = new Set(existingStudents.map(s => s.rollNumber));

    // Pre-hash passwords for new students (bulkWrite does not run pre-save hooks)
    const newRollNumbers = [...new Set(rollNumbers.filter(r => !existingRollSet.has(r)))];
    const passwordHashMap = {};
    await Promise.all(
      newRollNumbers.map(async (roll) => {
        passwordHashMap[roll] = await bcrypt.hash(roll, 10);
      })
    );

    // Build bulkWrite operations in chunks
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    const chunks = [];
    for (let i = 0; i < deduplicatedValid.length; i += CHUNK_SIZE) {
      chunks.push(deduplicatedValid.slice(i, i + CHUNK_SIZE));
    }

    for (const chunk of chunks) {
      const operations = [];

      for (const row of chunk) {
        const { _rowIndex, ...studentData } = row;
        const isExisting = existingRollSet.has(studentData.rollNumber);

        // Resolve department ref
        const deptDoc = deptMap[studentData.department];

        // Build update document
        const updateDoc = {
          name: studentData.name,
          series: studentData.series,
          department: studentData.department,
          session: studentData.session || getSessionFromSeries(studentData.series) || '',
          status: studentData.status || 'active'
        };

        if (deptDoc) {
          updateDoc.departmentRef = deptDoc._id;
          updateDoc.facultyRef = deptDoc.faculty;
        }
        if (studentData.registrationNumber) updateDoc.registrationNumber = studentData.registrationNumber;
        if (studentData.email) updateDoc.email = studentData.email;
        if (studentData.contactNo) updateDoc.contactNo = studentData.contactNo;
        if (studentData.section) updateDoc.section = studentData.section;
        if (studentData.batch) updateDoc.batch = studentData.batch;
        if (studentData.semester) updateDoc.semester = studentData.semester;

        if (importMode === 'add_new' && isExisting) {
          totalSkipped++;
          continue;
        }

        if (importMode === 'update_existing' && !isExisting) {
          totalSkipped++;
          continue;
        }

        if (!isExisting) {
          // For new students: set bcrypt-hashed password = rollNumber
          const defaultPassword = passwordHashMap[studentData.rollNumber] || studentData.rollNumber;
          operations.push({
            updateOne: {
              filter: { rollNumber: studentData.rollNumber },
              update: {
                $setOnInsert: {
                  password: defaultPassword,
                  role: 'student',
                  contactNo: studentData.contactNo || 'N/A',
                  email: studentData.email || '',
                  registrationNumber: studentData.registrationNumber || '',
                  enrolledCourses: []
                },
                $set: updateDoc
              },
              upsert: true
            }
          });
        } else {
          // Update existing — do NOT overwrite password
          operations.push({
            updateOne: {
              filter: { rollNumber: studentData.rollNumber },
              update: { $set: updateDoc },
              upsert: false
            }
          });
        }
      }

      if (operations.length > 0) {
        try {
          const result = await bulkWriteChunk(operations);
          totalInserted += result.nUpserted;
          totalUpdated += result.nModified;
        } catch (bulkErr) {
          // Handle individual write errors
          const writeErrors = bulkErr.writeErrors || [];
          totalFailed += writeErrors.length;
          totalInserted += (bulkErr.result?.nUpserted || 0);
          totalUpdated += (bulkErr.result?.nModified || 0);
          writeErrors.forEach(we => {
            rowErrors.push({ row: we.index + 1, message: we.errmsg || 'Write error' });
          });
        }
      }
    }

    // Update ImportJob
    importJob.status = 'completed';
    importJob.completedAt = new Date();
    importJob.stats = {
      totalRows: rawRows.length,
      validRows: deduplicatedValid.length,
      invalidRows: invalidCount,
      duplicateRows: dupCount,
      existingStudents: existingRollSet.size,
      newStudents: deduplicatedValid.filter(r => !existingRollSet.has(r.rollNumber)).length,
      inserted: totalInserted,
      updated: totalUpdated,
      skipped: totalSkipped,
      failed: totalFailed
    };
    importJob.rowErrors = rowErrors.slice(0, 100); // Store up to 100 errors in job
    await importJob.save();

    await logAudit({
      req,
      action: 'XLSX_IMPORT_STUDENTS',
      entity: 'ImportJob',
      entityId: importJob._id,
      details: `XLSX Import [${importMode}]: ${totalInserted} inserted, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalFailed} failed. File: ${fileName || 'unknown'}`,
      newValues: importJob.stats
    });

    return res.json({
      success: true,
      message: `Import completed: ${totalInserted} inserted, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalFailed} failed`,
      jobId,
      stats: importJob.stats,
      errors: rowErrors.slice(0, 50),
      totalErrors: rowErrors.length
    });

  } catch (error) {
    if (importJob) {
      importJob.status = 'failed';
      importJob.errorMessage = error.message;
      importJob.completedAt = new Date();
      await importJob.save().catch(() => {});
    }
    console.error('[Import Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Import failed: ' + error.message,
      code: 'IMPORT_ERROR',
      jobId
    });
  }
};

// ── GET /api/import/history ────────────────────────────────────────────────────
const getImportHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, department } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    // Department isolation
    const deptFilter = req.user.departmentCode && req.user.role !== 'super_admin'
      ? req.user.departmentCode.toUpperCase()
      : (department ? department.toUpperCase() : null);
    if (deptFilter) query.department = deptFilter;

    const [total, jobs] = await Promise.all([
      ImportJob.countDocuments(query),
      ImportJob.find(query)
        .select('-errors -columnMapping')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    return res.json({
      success: true,
      data: jobs,
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

// ── GET /api/import/history/:jobId ────────────────────────────────────────────
const getImportJobDetail = async (req, res) => {
  try {
    const job = await ImportJob.findOne({ jobId: req.params.jobId }).lean();
    if (!job) return res.status(404).json({ success: false, message: 'Import job not found' });

    // Department isolation check
    const deptFilter = req.user.departmentCode && req.user.role !== 'super_admin'
      ? req.user.departmentCode.toUpperCase()
      : null;
    if (deptFilter && job.department && job.department !== deptFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Normalize field name for frontend consistency
    const normalized = { ...job, errors: job.rowErrors || [] };
    delete normalized.rowErrors;
    return res.json({ success: true, data: normalized });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/import/series-session/:series ────────────────────────────────────
const getSessionForSeries = async (req, res) => {
  try {
    const { series } = req.params;
    const session = getSessionFromSeries(series);
    if (!session) {
      return res.status(400).json({ success: false, message: `Invalid series: ${series}` });
    }
    return res.json({ success: true, data: { series, session } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  uploadMiddleware,
  downloadTemplate,
  parseUpload,
  previewImport,
  executeImport,
  getImportHistory,
  getImportJobDetail,
  getSessionForSeries
};
