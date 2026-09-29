/**
 * Student XLSX Import Controller
 * Handles the complete robust Admin Data Management & Import Pipeline:
 * Multi-sheet upload → Column Mapping → Selective Field Import → Duplicate Detection
 * → Preview Summary → Transaction-safe BulkWrite → Audit & History → Error Report Download
 */
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');

const Student = require('../models/Student');
const Department = require('../models/Department');
const Series = require('../models/Series');
const ImportJob = require('../models/ImportJob');
const ImportMappingTemplate = require('../models/ImportMappingTemplate');
const { logAudit } = require('../middleware/auditMiddleware');
const {
  inspectWorkbook,
  parseXlsxBuffer,
  autoDetectMapping,
  applyMapping,
  validateRow,
  generateTemplate,
  generateErrorReport
} = require('../utils/xlsxParser');
const { getSessionFromSeries } = require('../utils/academicUtils');

// ── Multer Setup (memory storage) ─────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.xlsx', '.xls'].includes(ext)) {
      return cb(new Error(`Invalid file type "${ext}". Only .xlsx and .xls are allowed.`));
    }
    cb(null, true);
  }
});

const uploadMiddleware = upload.single('file');

const CHUNK_SIZE = 500;

async function bulkWriteChunk(operations) {
  if (operations.length === 0) return { nUpserted: 0, nModified: 0, nInserted: 0 };
  const result = await Student.bulkWrite(operations, { ordered: false });
  return {
    nUpserted: result.nUpserted || result.upsertedCount || 0,
    nModified: result.nModified || result.modifiedCount || 0,
    nInserted: result.nInserted || result.insertedCount || 0
  };
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
// Step 1: Upload + Inspect Sheets + Parse chosen/first sheet
const parseUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded', code: 'NO_FILE' });
    }

    const { sheetNames, sheetsInfo } = inspectWorkbook(req.file.buffer);
    const requestedSheet = req.body.sheetName || sheetNames[0];
    const userHeaderRow = req.body.headerRowIndex !== undefined ? parseInt(req.body.headerRowIndex, 10) : null;
    const { headers, rows, sheetName, detectedHeaderRow, candidateHeaderRows } = parseXlsxBuffer(req.file.buffer, requestedSheet, userHeaderRow);
    const autoMapping = autoDetectMapping(headers);

    // Auto-detect series from filename or first few rolls
    let detectedSeries = '';
    const nameMatch = req.file.originalname.match(/(\d{2})/);
    if (nameMatch) {
      detectedSeries = nameMatch[1];
    } else if (rows.length > 0) {
      const firstRollHeader = Object.keys(autoMapping).find(k => autoMapping[k] === 'rollNumber');
      if (firstRollHeader && rows[0][firstRollHeader]) {
        const rollStr = String(rows[0][firstRollHeader]).trim();
        if (rollStr.length >= 2 && /^\d{2}/.test(rollStr)) {
          detectedSeries = rollStr.slice(0, 2);
        }
      }
    }

    const departments = await Department.find({ status: 'active' }).select('code name').lean();
    const deptCodes = departments.map(d => d.code);

    // Auto-detect department: from admin profile, filename, or first few rolls
    let detectedDepartment = req.user?.departmentCode || '';
    if (!detectedDepartment && req.user?.department) {
      const dDoc = await Department.findById(req.user.department).select('code').lean();
      if (dDoc) detectedDepartment = dDoc.code;
    }
    if (!detectedDepartment && rows.length > 0) {
      const firstRollHeader = Object.keys(autoMapping).find(k => autoMapping[k] === 'rollNumber');
      if (firstRollHeader && rows[0][firstRollHeader]) {
        const rStr = String(rows[0][firstRollHeader]).trim().replace(/\D/g, '');
        if (rStr.length >= 4) {
          const RUET_ROLL_DEPT_MAP = {
            '01': 'CE', '02': 'EEE', '03': 'ME', '04': 'CSE', '05': 'ETE',
            '06': 'IPE', '07': 'CME', '08': 'MTE', '09': 'CHE', '10': 'MSE',
            '11': 'ARCH', '12': 'BECM', '13': 'URP'
          };
          const code = RUET_ROLL_DEPT_MAP[rStr.slice(2, 4)];
          if (code && deptCodes.includes(code)) detectedDepartment = code;
        }
      }
    }

    return res.json({
      success: true,
      data: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        sheetNames,
        sheetsInfo,
        selectedSheet: sheetName,
        totalRows: rows.length,
        totalColumns: headers.length,
        headers,
        autoMapping,
        detectedSeries,
        detectedDepartment,
        detectedSession: detectedSeries ? getSessionFromSeries(detectedSeries) : '',
        detectedHeaderRow,
        candidateHeaderRows: candidateHeaderRows || [],
        sampleRows: rows.slice(0, 100), // provide first 100 rows for instant preview
        allRows: rows,
        availableDepartments: deptCodes
      }
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message, code: 'PARSE_ERROR' });
  }
};

// ── POST /api/import/students/preview ────────────────────────────────────────
// Step 2 & 3: Validate, Selective Mapping, Duplicate Detection, Summary
const previewImport = async (req, res) => {
  try {
    const {
      rows: rawRows,
      mapping,
      selectedFields,
      duplicateMatchingField = 'rollNumber',
      duplicateAction = 'skip',
      importMode = 'upsert',
      overrides = {},
      selectedRowIndices = null
    } = req.body;

    if (!rawRows || !Array.isArray(rawRows) || rawRows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows provided', code: 'NO_ROWS' });
    }
    if (!mapping || Object.keys(mapping).length === 0) {
      return res.status(400).json({ success: false, message: 'Column mapping is required', code: 'NO_MAPPING' });
    }

    // Filter to selected row indices if admin toggled specific rows
    const rowsToProcess = (selectedRowIndices && Array.isArray(selectedRowIndices) && selectedRowIndices.length > 0)
      ? rawRows.filter(r => selectedRowIndices.includes(r._rowIndex))
      : rawRows;

    const departments = await Department.find({ status: 'active' }).select('code').lean();
    const validDeptCodes = departments.map(d => d.code);

    let adminDeptCode = req.user?.departmentCode || '';
    if (!adminDeptCode && req.user?.department) {
      const adminDeptDoc = await Department.findById(req.user.department).select('code').lean();
      if (adminDeptDoc) adminDeptCode = adminDeptDoc.code;
    }
    if (!overrides.department && adminDeptCode) {
      overrides.department = adminDeptCode;
    }

    // Apply selective mapping (Requirement 9: only selected fields are mapped)
    const mappedRows = applyMapping(rowsToProcess, mapping, selectedFields);

    const validRows = [];
    const invalidRows = [];
    const rowErrors = [];

    for (const row of mappedRows) {
      const { valid, data, errors } = validateRow(row, row._rowIndex, validDeptCodes, overrides, adminDeptCode);
      if (valid) {
        validRows.push({ ...data, _rowIndex: row._rowIndex });
      } else {
        invalidRows.push({ rowIndex: row._rowIndex, rollNumber: row.rollNumber || '', name: row.name || '', errors });
        errors.forEach(err => {
          rowErrors.push({
            row: row._rowIndex,
            field: err.field,
            rollNumber: row.rollNumber || '',
            message: err.message
          });
        });
      }
    }

    // In-file duplicate detection based on duplicateMatchingField
    const keyInFile = new Map();
    const fileDuplicates = [];
    const deduplicatedValid = [];

    const getMatchValue = (item, fieldKey) => {
      if (fieldKey === 'registrationNumber') return item.registrationNumber || item.registrationNo || '';
      if (fieldKey === 'email') return (item.email || item.studentEmail || '').toLowerCase();
      return item.rollNumber || '';
    };

    for (const row of validRows) {
      const matchVal = getMatchValue(row, duplicateMatchingField);
      if (matchVal && keyInFile.has(matchVal)) {
        fileDuplicates.push({
          rowIndex: row._rowIndex,
          field: duplicateMatchingField,
          value: matchVal,
          message: `Duplicate in file: ${duplicateMatchingField} "${matchVal}" already appeared at row ${keyInFile.get(matchVal)}`
        });
        rowErrors.push({
          row: row._rowIndex,
          field: duplicateMatchingField,
          rollNumber: row.rollNumber || '',
          message: `Duplicate in file: ${duplicateMatchingField} "${matchVal}"`
        });
      } else {
        if (matchVal) keyInFile.set(matchVal, row._rowIndex);
        deduplicatedValid.push(row);
      }
    }

    // Check database for existing records using duplicateMatchingField
    const matchValues = deduplicatedValid
      .map(r => getMatchValue(r, duplicateMatchingField))
      .filter(v => !!v);

    let existingDbStudents = [];
    if (matchValues.length > 0) {
      const dbQuery = {};
      if (duplicateMatchingField === 'registrationNumber') {
        dbQuery.registrationNumber = { $in: matchValues };
      } else if (duplicateMatchingField === 'email') {
        dbQuery.email = { $in: matchValues.map(e => e.toLowerCase()) };
      } else {
        dbQuery.rollNumber = { $in: matchValues };
      }

      existingDbStudents = await Student.find(dbQuery)
        .select('rollNumber registrationNumber email name department series semester session regularStatus')
        .lean();
    }

    const existingDbMap = new Map();
    existingDbStudents.forEach(s => {
      const k = getMatchValue(s, duplicateMatchingField);
      if (k) existingDbMap.set(k, s);
    });

    const newStudents = [];
    const existingStudentsDiff = [];

    for (const row of deduplicatedValid) {
      const k = getMatchValue(row, duplicateMatchingField);
      if (k && existingDbMap.has(k)) {
        const existingDoc = existingDbMap.get(k);
        existingStudentsDiff.push({
          excelRow: row._rowIndex,
          matchKey: duplicateMatchingField,
          matchValue: k,
          existingStudent: {
            roll: existingDoc.rollNumber,
            name: existingDoc.name,
            semester: existingDoc.semester || 'N/A',
            series: existingDoc.series,
            department: existingDoc.department
          },
          excelStudent: {
            roll: row.rollNumber,
            name: row.name,
            semester: row.semester || 'N/A',
            series: row.series,
            department: row.department
          }
        });
      } else {
        newStudents.push(row);
      }
    }

    // Determine final counts based on duplicateAction
    let willBeAdded = newStudents.length;
    let willBeUpdated = 0;
    let willBeSkipped = 0;

    if (duplicateAction === 'update') {
      willBeUpdated = existingStudentsDiff.length;
      willBeSkipped = 0;
    } else if (duplicateAction === 'create_new') {
      willBeAdded += existingStudentsDiff.length;
    } else {
      // default: 'skip'
      willBeSkipped = existingStudentsDiff.length;
    }

    return res.json({
      success: true,
      data: {
        summary: {
          totalRows: rawRows.length,
          processedRows: rowsToProcess.length,
          validRows: deduplicatedValid.length,
          invalidRows: invalidRows.length,
          fileDuplicates: fileDuplicates.length,
          newStudents: newStudents.length,
          existingStudents: existingStudentsDiff.length,
          willBeAdded,
          willBeUpdated,
          willBeSkipped
        },
        duplicateMatchingField,
        duplicateAction,
        importMode,
        existingDiff: existingStudentsDiff.slice(0, 100),
        rowErrors: rowErrors.slice(0, 200),
        totalErrors: rowErrors.length,
        sampleNew: newStudents.slice(0, 5),
        sampleExisting: existingStudentsDiff.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Import Preview Error:', error);
    return res.status(500).json({ success: false, message: error.message, code: 'PREVIEW_ERROR' });
  }
};

// ── POST /api/import/students/execute ────────────────────────────────────────
// Step 4: Transaction-safe Bulk Execution
const executeImport = async (req, res) => {
  const jobId = `IMP-${uuidv4().slice(0, 8).toUpperCase()}`;
  let importJob = null;

  try {
    const {
      fileName,
      fileSize,
      sheetName = 'Students',
      rows: rawRows,
      mapping,
      selectedFields,
      duplicateMatchingField = 'rollNumber',
      duplicateAction = 'skip',
      importMode = 'upsert',
      overrides = {},
      selectedRowIndices = null
    } = req.body;

    if (!rawRows || !Array.isArray(rawRows) || rawRows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows provided', code: 'NO_ROWS' });
    }

    const adminId = req.user._id;
    const adminName = req.user.name || req.user.username || 'Admin';
    const dept = overrides.department || (req.user.departmentCode ? req.user.departmentCode.toUpperCase() : 'ETE');
    const series = overrides.series || '';

    // Create persistent ImportJob
    importJob = await ImportJob.create({
      jobId,
      fileName: fileName || 'students.xlsx',
      fileSize: fileSize || 0,
      sheetName,
      series,
      adminId,
      adminName,
      department: dept,
      importMode,
      columnMapping: mapping,
      selectedFields: selectedFields || [],
      duplicateMatchingField,
      status: 'processing',
      startedAt: new Date()
    });

    const rowsToProcess = (selectedRowIndices && Array.isArray(selectedRowIndices) && selectedRowIndices.length > 0)
      ? rawRows.filter(r => selectedRowIndices.includes(r._rowIndex))
      : rawRows;

    const departments = await Department.find({ status: 'active' }).select('_id code faculty').lean();
    const deptMap = {};
    departments.forEach(d => { deptMap[d.code] = d; });
    const validDeptCodes = departments.map(d => d.code);

    let adminDeptCode = req.user?.departmentCode || '';
    if (!adminDeptCode && req.user?.department) {
      const adminDeptDoc = await Department.findById(req.user.department).select('code').lean();
      if (adminDeptDoc) adminDeptCode = adminDeptDoc.code;
    }
    if (!overrides.department && adminDeptCode) {
      overrides.department = adminDeptCode;
    }

    // Apply mapping with selected fields only!
    const mappedRows = applyMapping(rowsToProcess, mapping, selectedFields);

    const validRows = [];
    const rowErrors = [];
    let invalidCount = 0;

    for (const row of mappedRows) {
      const { valid, data, errors } = validateRow(row, row._rowIndex, validDeptCodes, overrides, adminDeptCode);
      if (valid) {
        validRows.push({ ...data, _rowIndex: row._rowIndex });
      } else {
        invalidCount++;
        errors.forEach(e => {
          rowErrors.push({ row: row._rowIndex, field: e.field, message: e.message });
        });
      }
    }

    // Deduplicate in-file
    const keyMap = new Map();
    const deduplicatedValid = [];
    let fileDupCount = 0;

    const getMatchValue = (item, fieldKey) => {
      if (fieldKey === 'registrationNumber') return item.registrationNumber || '';
      if (fieldKey === 'email') return (item.email || '').toLowerCase();
      return item.rollNumber || '';
    };

    for (const row of validRows) {
      const val = getMatchValue(row, duplicateMatchingField);
      if (val && keyMap.has(val)) {
        fileDupCount++;
        rowErrors.push({ row: row._rowIndex, field: duplicateMatchingField, message: `Duplicate in file: "${val}"` });
      } else {
        if (val) keyMap.set(val, row._rowIndex);
        deduplicatedValid.push(row);
      }
    }

    // Query DB for existing matches
    const allMatchVals = deduplicatedValid.map(r => getMatchValue(r, duplicateMatchingField)).filter(Boolean);
    let existingStudents = [];
    if (allMatchVals.length > 0) {
      const q = {};
      if (duplicateMatchingField === 'registrationNumber') q.registrationNumber = { $in: allMatchVals };
      else if (duplicateMatchingField === 'email') q.email = { $in: allMatchVals };
      else q.rollNumber = { $in: allMatchVals };

      existingStudents = await Student.find(q).select('_id rollNumber registrationNumber email').lean();
    }

    const existingMap = new Map();
    existingStudents.forEach(s => {
      const v = getMatchValue(s, duplicateMatchingField);
      if (v) existingMap.set(v, s);
    });

    // Pre-hash default passwords for new students
    const newItems = deduplicatedValid.filter(r => !existingMap.has(getMatchValue(r, duplicateMatchingField)));
    const passwordHashMap = {};
    await Promise.all(
      newItems.map(async (item) => {
        if (!passwordHashMap[item.rollNumber]) {
          passwordHashMap[item.rollNumber] = await bcrypt.hash(item.rollNumber, 10);
        }
      })
    );

    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    // Chunked bulk operations
    const chunks = [];
    for (let i = 0; i < deduplicatedValid.length; i += CHUNK_SIZE) {
      chunks.push(deduplicatedValid.slice(i, i + CHUNK_SIZE));
    }

    for (const chunk of chunks) {
      const operations = [];

      for (const row of chunk) {
        const { _rowIndex, ...studentData } = row;
        const matchKey = getMatchValue(studentData, duplicateMatchingField);
        const isExisting = existingMap.has(matchKey);

        const deptDoc = deptMap[studentData.department];

        // Build document storing only defined/selected fields
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
        if (studentData.registrationNumber !== undefined) updateDoc.registrationNumber = studentData.registrationNumber;
        if (studentData.email !== undefined) updateDoc.email = studentData.email;
        if (studentData.contactNo !== undefined) updateDoc.contactNo = studentData.contactNo;
        if (studentData.regularStatus !== undefined) updateDoc.regularStatus = studentData.regularStatus;
        if (studentData.semester !== undefined) updateDoc.semester = studentData.semester;
        if (studentData.section !== undefined) updateDoc.section = studentData.section;
        if (studentData.batch !== undefined) updateDoc.batch = studentData.batch;
        if (studentData.gender !== undefined) updateDoc.gender = studentData.gender;
        if (studentData.bloodGroup !== undefined) updateDoc.bloodGroup = studentData.bloodGroup;
        if (studentData.address !== undefined) updateDoc.address = studentData.address;

        // Extract custom fields (any key that isn't a core schema field)
        const CORE_FIELDS = new Set([
          'rollNumber', 'name', 'department', 'series', 'session', 'status',
          'registrationNumber', 'email', 'contactNo', 'regularStatus',
          'semester', 'section', 'batch', 'gender', 'bloodGroup', 'address'
        ]);
        const customFields = {};
        for (const [key, val] of Object.entries(studentData)) {
          if (!CORE_FIELDS.has(key) && val !== undefined && val !== '') {
            customFields[key] = val;
          }
        }
        if (Object.keys(customFields).length > 0) {
          updateDoc.customFields = customFields;
        }

        if (isExisting) {
          if (duplicateAction === 'skip') {
            totalSkipped++;
            continue;
          }

          if (duplicateAction === 'update') {
            const filter = {};
            if (duplicateMatchingField === 'registrationNumber') filter.registrationNumber = matchKey;
            else if (duplicateMatchingField === 'email') filter.email = matchKey;
            else filter.rollNumber = studentData.rollNumber;

            // Merge customFields into existing student using dot notation
            const setDoc = { ...updateDoc };
            if (Object.keys(customFields).length > 0) {
              delete setDoc.customFields;
              for (const [cfKey, cfVal] of Object.entries(customFields)) {
                setDoc[`customFields.${cfKey}`] = cfVal;
              }
            }

            operations.push({
              updateOne: {
                filter,
                update: { $set: setDoc },
                upsert: false
              }
            });
          }
        } else {
          // New student insert
          const defaultPassword = passwordHashMap[studentData.rollNumber] || studentData.rollNumber;
          const setOnInsertDoc = {
            password: defaultPassword,
            role: 'student',
            enrolledCourses: []
          };
          if (updateDoc.contactNo === undefined) setOnInsertDoc.contactNo = studentData.contactNo || '';
          if (updateDoc.email === undefined) setOnInsertDoc.email = studentData.email || '';
          if (updateDoc.registrationNumber === undefined) setOnInsertDoc.registrationNumber = studentData.registrationNumber || '';

          operations.push({
            updateOne: {
              filter: { rollNumber: studentData.rollNumber },
              update: {
                $setOnInsert: setOnInsertDoc,
                $set: updateDoc
              },
              upsert: true
            }
          });
        }
      }

      if (operations.length > 0) {
        try {
          const result = await bulkWriteChunk(operations);
          totalInserted += result.nUpserted + result.nInserted;
          totalUpdated += result.nModified;
        } catch (bulkErr) {
          const writeErrors = bulkErr.writeErrors || [];
          totalFailed += writeErrors.length;
          totalInserted += (bulkErr.result?.nUpserted || 0) + (bulkErr.result?.nInserted || 0);
          totalUpdated += (bulkErr.result?.nModified || 0);
          writeErrors.forEach(we => {
            rowErrors.push({ row: we.index + 1, message: we.errmsg || 'Write error' });
          });
        }
      }
    }

    importJob.status = 'completed';
    importJob.completedAt = new Date();
    importJob.stats = {
      totalRows: rawRows.length,
      validRows: deduplicatedValid.length,
      invalidRows: invalidCount,
      duplicateRows: fileDupCount,
      existingStudents: existingMap.size,
      newStudents: newItems.length,
      inserted: totalInserted,
      updated: totalUpdated,
      skipped: totalSkipped,
      failed: totalFailed
    };
    importJob.rowErrors = rowErrors.slice(0, 100);
    await importJob.save();

    await logAudit({
      req,
      action: 'IMPORT_STUDENTS',
      entity: 'Student',
      entityId: importJob._id,
      details: `Imported students [${duplicateAction}]: ${totalInserted} added, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalFailed} failed. File: ${fileName || 'students.xlsx'}`,
      newValues: importJob.stats
    });

    return res.json({
      success: true,
      message: `Import completed: ${totalInserted} added, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalFailed} failed`,
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
    console.error('Import Execution Error:', error);
    return res.status(500).json({ success: false, message: 'Import failed: ' + error.message, code: 'IMPORT_ERROR', jobId });
  }
};

// ── POST /api/import/download-error-report ────────────────────────────────────
// Requirement 13, 45: Download Error Report Excel
const downloadErrorReport = async (req, res) => {
  try {
    const { errors, jobId } = req.body;
    let errorRows = errors || [];

    if ((!errorRows || errorRows.length === 0) && jobId) {
      const job = await ImportJob.findOne({ jobId }).lean();
      if (job && job.rowErrors) {
        errorRows = job.rowErrors;
      }
    }

    if (!errorRows || errorRows.length === 0) {
      return res.status(400).json({ success: false, message: 'No error records found to export' });
    }

    const buffer = generateErrorReport(errorRows);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Import_Error_Report_${jobId || Date.now()}.xlsx"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'no-cache'
    });
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate error report: ' + error.message });
  }
};

// ── Saved Mapping Templates (Requirement 42) ──────────────────────────────────
// GET /api/import/mapping-templates
const getMappingTemplates = async (req, res) => {
  try {
    const templates = await ImportMappingTemplate.find().sort({ updatedAt: -1 }).lean();
    const formatted = templates.map(t => ({
      ...t,
      templateName: t.name,
      columnMapping: t.mapping
    }));
    return res.json({ success: true, data: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/import/mapping-templates
const saveMappingTemplate = async (req, res) => {
  try {
    const name = req.body.templateName || req.body.name;
    const mapping = req.body.columnMapping || req.body.mapping;
    const { department, selectedFields, duplicateMatchingField, duplicateAction, series } = req.body;

    if (!name || !mapping) {
      return res.status(400).json({ success: false, message: 'Template name and mapping are required' });
    }

    const template = await ImportMappingTemplate.findOneAndUpdate(
      { name: name.trim() },
      {
        name: name.trim(),
        department: department || '',
        mapping,
        selectedFields: selectedFields || [],
        duplicateMatchingField: duplicateMatchingField || 'rollNumber',
        duplicateAction: duplicateAction || 'skip',
        createdBy: req.user._id
      },
      { upsert: true, new: true }
    );

    const responseData = {
      ...template.toObject(),
      templateName: template.name,
      columnMapping: template.mapping
    };

    return res.status(201).json({ success: true, data: responseData, message: 'Template saved successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/import/mapping-templates/:id
const deleteMappingTemplate = async (req, res) => {
  try {
    await ImportMappingTemplate.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Template removed' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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
    if (department) query.department = department.toUpperCase();

    const [total, jobs] = await Promise.all([
      ImportJob.countDocuments(query),
      ImportJob.find(query)
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
    return res.json({ success: true, data: job });
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

// ── GET /api/import/students/export ───────────────────────────────────────────
// Export student database to Excel with optional column selection and custom fields
const exportStudents = async (req, res) => {
  try {
    const { department, series, semester, status, regularStatus, section, search, columns, ids } = req.query;
    const query = {};
    if (department) query.department = department.toUpperCase();
    if (series) query.series = series;
    if (semester) query.semester = semester;
    if (status) query.status = status;
    if (regularStatus) query.regularStatus = regularStatus;
    if (section) query.section = section.toUpperCase();
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { rollNumber: { $regex: s, $options: 'i' } },
        { registrationNumber: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } }
      ];
    }
    // Export specific IDs (selected students)
    if (ids) {
      const idList = ids.split(',').filter(Boolean);
      if (idList.length > 0) {
        query._id = { $in: idList };
      }
    }

    const students = await Student.find(query)
      .select('-password -__v')
      .sort({ series: -1, rollNumber: 1 })
      .lean();

    // All available core column definitions
    const ALL_COLUMNS = {
      rollNumber: { header: 'Roll Number', getter: s => s.rollNumber },
      name: { header: 'Student Name', getter: s => s.name },
      email: { header: 'Email', getter: s => s.email || '' },
      registrationNumber: { header: 'Registration No', getter: s => s.registrationNumber || '' },
      contactNo: { header: 'Phone', getter: s => s.contactNo || '' },
      department: { header: 'Department', getter: s => s.department },
      series: { header: 'Series', getter: s => s.series },
      semester: { header: 'Semester', getter: s => s.semester || '' },
      session: { header: 'Academic Session', getter: s => s.session || '' },
      regularStatus: { header: 'Regular Status', getter: s => s.regularStatus || 'Regular' },
      status: { header: 'Status', getter: s => s.status || 'active' },
      section: { header: 'Section', getter: s => s.section || '' },
      batch: { header: 'Batch', getter: s => s.batch || '' },
      gender: { header: 'Gender', getter: s => s.gender || '' },
      bloodGroup: { header: 'Blood Group', getter: s => s.bloodGroup || '' },
      address: { header: 'Address', getter: s => s.address || '' }
    };

    // Determine which columns to export
    let selectedColumns;
    if (columns) {
      selectedColumns = columns.split(',').filter(Boolean);
    } else {
      selectedColumns = ['rollNumber', 'name', 'email', 'registrationNumber', 'contactNo', 'department', 'series', 'semester', 'session', 'regularStatus', 'status'];
    }

    // Collect all custom field keys across all students
    const customFieldKeys = new Set();
    students.forEach(s => {
      if (s.customFields && typeof s.customFields === 'object') {
        Object.keys(s.customFields).forEach(k => customFieldKeys.add(k));
      }
    });

    // Build headers and row data
    const headers = [];
    const getters = [];

    for (const col of selectedColumns) {
      if (ALL_COLUMNS[col]) {
        headers.push(ALL_COLUMNS[col].header);
        getters.push(ALL_COLUMNS[col].getter);
      } else if (customFieldKeys.has(col)) {
        headers.push(col);
        getters.push(s => (s.customFields && s.customFields[col]) || '');
      }
    }

    // Also include any custom fields not explicitly selected but present
    if (!columns) {
      for (const cfk of customFieldKeys) {
        if (!selectedColumns.includes(cfk)) {
          headers.push(cfk);
          getters.push(s => (s.customFields && s.customFields[cfk]) || '');
        }
      }
    }

    const rows = students.map(s => getters.map(fn => fn(s)));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, 'RUET Students');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="RUET_Students_Export_${Date.now()}.xlsx"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'no-cache'
    });
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Export failed: ' + error.message });
  }
};

module.exports = {
  uploadMiddleware,
  downloadTemplate,
  parseUpload,
  previewImport,
  executeImport,
  downloadErrorReport,
  getMappingTemplates,
  saveMappingTemplate,
  deleteMappingTemplate,
  getImportHistory,
  getImportJobDetail,
  getSessionForSeries,
  exportStudents
};
