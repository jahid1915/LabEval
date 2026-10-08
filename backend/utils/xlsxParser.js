/**
 * XLSX Parser Utility for Student Import
 * Handles workbook inspection, multi-sheet reading, column mapping, selective field mapping, validation, and error reporting.
 */
const XLSX = require('xlsx');
const { getSessionFromSeries, isValidSeries, isValidSession } = require('./academicUtils');

// ── Default Column Mapping ────────────────────────────────────────────────────
// Maps normalized header aliases → database field names
const DEFAULT_COLUMN_ALIASES = {
  // Student ID / Roll
  'student id': 'rollNumber',
  'student_id': 'rollNumber',
  'studentid': 'rollNumber',
  'roll': 'rollNumber',
  'roll no': 'rollNumber',
  'roll no.': 'rollNumber',
  'roll number': 'rollNumber',
  'roll_number': 'rollNumber',
  'rollno': 'rollNumber',
  'rollnumber': 'rollNumber',
  'id': 'rollNumber',
  'student no': 'rollNumber',
  'student no.': 'rollNumber',

  // Registration
  'registration number': 'registrationNumber',
  'registration no': 'registrationNumber',
  'registration no.': 'registrationNumber',
  'registration_number': 'registrationNumber',
  'registration_no': 'registrationNumber',
  'registratioin number': 'registrationNumber',
  'registratioin no': 'registrationNumber',
  'registratioin no.': 'registrationNumber',
  'registratioin': 'registrationNumber',
  'reg number': 'registrationNumber',
  'reg no': 'registrationNumber',
  'reg no.': 'registrationNumber',
  'reg_no': 'registrationNumber',
  'regno': 'registrationNumber',
  'registrationno': 'registrationNumber',
  'registration': 'registrationNumber',

  // Name
  'name': 'name',
  'full name': 'name',
  'fullname': 'name',
  'student name': 'name',
  'student_name': 'name',
  'studentname': 'name',
  'name of student': 'name',
  'student name bangla': 'nameBangla',
  'student name (bangla)': 'nameBangla',
  'name bangla': 'nameBangla',
  'name (bangla)': 'nameBangla',
  'bangla name': 'nameBangla',

  // Parents
  'father\'s name': 'fatherName',
  'fathers name': 'fatherName',
  'father name': 'fatherName',
  'father': 'fatherName',
  'mother\'s name': 'motherName',
  'mothers name': 'motherName',
  'mother name': 'motherName',
  'mother': 'motherName',

  // Email
  'email': 'email',
  'student email': 'email',
  'student_email': 'email',
  'studentemail': 'email',
  'email address': 'email',
  'e-mail': 'email',
  'emailaddress': 'email',

  // Phone / Contact
  'phone': 'contactNo',
  'phone number': 'contactNo',
  'phonenumber': 'contactNo',
  'contact': 'contactNo',
  'contact no': 'contactNo',
  'contact no.': 'contactNo',
  'contactno': 'contactNo',
  'mobile': 'contactNo',
  'mobile no': 'contactNo',
  'mobile number': 'contactNo',
  'cell': 'contactNo',

  // Department
  'department': 'department',
  'dept': 'department',
  'dept.': 'department',
  'department code': 'department',
  'departmentcode': 'department',

  // Series
  'series': 'series',
  'batch series': 'series',
  'batchseries': 'series',
  'admission series': 'series',
  'student series': 'series',
  'admission year': 'series',

  // Year (study level)
  'year': 'year',
  'study year': 'year',
  'academic year': 'year',
  'level': 'year',

  // Session
  'session': 'session',
  'academic session': 'session',
  'academicsession': 'session',
  'academic_session': 'session',

  // Batch
  'batch': 'batch',
  'group': 'batch',
  'lab batch': 'batch',
  'lab group': 'batch',

  // Semester
  'semester': 'semester',
  'current semester': 'semester',
  'current_semester': 'semester',
  'sem': 'semester',
  'term': 'semester',

  // Section
  'section': 'section',
  'class section': 'section',
  'classsection': 'section',

  // Regular / Irregular Status
  'regular status': 'regularStatus',
  'regular_status': 'regularStatus',
  'regularstatus': 'regularStatus',
  'regular / irregular': 'regularStatus',
  'regularity': 'regularStatus',

  // Status
  'status': 'status',
  'student status': 'status',
  'active status': 'status',

  // Demographic / Profile fields
  'gender': 'gender',
  'sex': 'gender',
  'blood group': 'bloodGroup',
  'bloodgroup': 'bloodGroup',
  'blood': 'bloodGroup',
  'date of birth': 'dob',
  'dateofbirth': 'dob',
  'birth date': 'dob',
  'dob': 'dob',
  'nationality': 'nationality',
  'admission date': 'admissionDate',
  'admissiondate': 'admissionDate',
  'date of admission': 'admissionDate',
  'city': 'city',
  'district': 'city',
  'home district': 'city',
  'home city': 'city',
  'country': 'country',
  'address': 'address',
  'present address': 'address',
  'permanent address': 'address'
};

/**
 * Normalize a header string for alias lookup
 */
const normalizeHeader = (header) => {
  if (!header) return '';
  return String(header)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[*]/g, '');  // Remove asterisks
};

/**
 * Auto-detect column mapping from Excel headers
 * 
 * @param {string[]} headers - Raw headers from Excel
 * @returns {Object} - Map of { excelHeader: dbField }
 */
const autoDetectMapping = (headers) => {
  const mapping = {};
  for (const header of headers) {
    const normalized = normalizeHeader(header);
    if (DEFAULT_COLUMN_ALIASES[normalized]) {
      mapping[header] = DEFAULT_COLUMN_ALIASES[normalized];
    }
  }
  return mapping;
};

/**
 * Detect the real header row index in raw sheet array.
 * Often row 1 has a merged group title (e.g. "BASIC INFO" with 1-5 cells),
 * while row 2 contains the actual column headers (16+ columns: Student Name, Roll Number, etc.).
 */
const isDataCell = (val) => {
  const s = String(val).trim();
  if (/@/.test(s)) return true; // email address
  if (/^\d{2}[-./]\d{2}[-./]\d{2,4}$/.test(s)) return true; // date of birth
  if (/^\d{6,10}$/.test(s)) return true; // roll or reg number
  return false;
};

const findBestHeaderRow = (rawData) => {
  if (!rawData || rawData.length === 0) return 0;

  const keywords = [
    'name', 'roll', 'id', 'student', 'reg', 'email', 'phone', 'contact', 'mobile',
    'dept', 'department', 'series', 'session', 'batch', 'sem', 'semester', 'gender',
    'sex', 'blood', 'father', 'mother', 'address', 'status', 'dob', 'birth',
    'date', 'city', 'district', 'nationality', 'country', 'year', 'admission'
  ];

  let bestRowIdx = 0;
  let maxScore = -1;
  const limit = Math.min(10, rawData.length);

  for (let r = 0; r < limit; r++) {
    const row = rawData[r];
    if (!row || !Array.isArray(row)) continue;

    const nonBlankCells = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
    if (nonBlankCells.length === 0) continue;

    let keywordMatches = 0;
    let dataCellCount = 0;
    for (const cell of nonBlankCells) {
      const lower = String(cell).toLowerCase().trim();
      if (keywords.some(k => lower.includes(k))) {
        keywordMatches++;
      }
      if (isDataCell(cell)) {
        dataCellCount++;
      }
    }

    // Heavy penalty for obvious data rows containing emails, dates, or roll numbers
    const score = (keywordMatches * 20) + nonBlankCells.length - (dataCellCount * 100);
    if (score > maxScore) {
      maxScore = score;
      bestRowIdx = r;
    }
  }

  return bestRowIdx;
};

/**
 * Inspect workbook and return list of sheet names and summary info
 * 
 * @param {Buffer} buffer - XLSX file buffer
 * @returns {{ sheetNames: string[], sheetsInfo: Array<{ name: string, rowCount: number, columnCount: number, headers: string[] }> }}
 */
const inspectWorkbook = (buffer) => {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch (e) {
    throw new Error(`Failed to parse Excel workbook: ${e.message}`);
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Excel file has no worksheets');
  }

  const sheetsInfo = workbook.SheetNames.map(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return { name: sheetName, rowCount: 0, columnCount: 0, headers: [] };

    const rawData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false
    });

    if (!rawData || rawData.length === 0) {
      return { name: sheetName, rowCount: 0, columnCount: 0, headers: [] };
    }

    const headerRowIdx = findBestHeaderRow(rawData);

    // Compute maximum column width across all rows
    let maxCols = 0;
    for (const r of rawData) {
      if (Array.isArray(r) && r.length > maxCols) maxCols = r.length;
    }

    const headerRow = rawData[headerRowIdx] || [];
    const headers = [];
    for (let i = 0; i < maxCols; i++) {
      const val = String(headerRow[i] || '').trim();
      headers.push(val !== '' ? val : `Column ${i + 1}`);
    }

    const nonBlankRows = rawData.slice(headerRowIdx + 1).filter(r =>
      Array.isArray(r) && r.some(c => c !== null && c !== undefined && String(c).trim() !== '')
    );

    return {
      name: sheetName,
      rowCount: nonBlankRows.length,
      columnCount: headers.length,
      headers
    };
  });

  return {
    sheetNames: workbook.SheetNames,
    sheetsInfo
  };
};

/**
 * Parse an XLSX buffer into an array of raw row objects for a specific sheet
 * 
 * @param {Buffer} buffer - XLSX file buffer
 * @param {string} [targetSheetName] - Specific worksheet to parse (defaults to first)
 * @param {number|null} [userHeaderRowIdx] - Optional user override for 0-indexed header row
 * @returns {{ headers: string[], rows: Object[], sheetName: string, allSheetNames: string[], detectedHeaderRow: number, candidateHeaderRows: Array }}
 */
const parseXlsxBuffer = (buffer, targetSheetName = null, userHeaderRowIdx = null) => {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch (e) {
    throw new Error(`Failed to parse XLSX file: ${e.message}`);
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Excel file has no worksheets');
  }

  const allSheetNames = workbook.SheetNames;
  const sheetName = targetSheetName && allSheetNames.includes(targetSheetName)
    ? targetSheetName
    : allSheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Cannot read sheet: ${sheetName}`);
  }

  // Convert to array of arrays
  const rawData = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false
  });

  if (!rawData || rawData.length === 0) {
    throw new Error(`Excel sheet "${sheetName}" is empty`);
  }

  // Determine header row: use user selection or smart detection
  let headerRowIdx;
  if (userHeaderRowIdx !== null && userHeaderRowIdx !== undefined && !isNaN(userHeaderRowIdx) && userHeaderRowIdx >= 0 && userHeaderRowIdx < rawData.length) {
    headerRowIdx = parseInt(userHeaderRowIdx, 10);
  } else {
    headerRowIdx = findBestHeaderRow(rawData);
  }

  // Calculate maximum column count across all rows in this sheet
  let maxCols = 0;
  for (const r of rawData) {
    if (Array.isArray(r) && r.length > maxCols) {
      maxCols = r.length;
    }
  }

  const headerRow = rawData[headerRowIdx] || [];
  const headers = [];
  for (let i = 0; i < maxCols; i++) {
    const val = String(headerRow[i] || '').trim();
    headers.push(val !== '' ? val : `Column ${i + 1}`);
  }

  if (headers.length === 0) {
    throw new Error(`No column headers found in sheet "${sheetName}"`);
  }

  // Build candidate header rows for UI switcher (only include rows that realistically look like headers)
  const candidateHeaderRows = [];
  const candLimit = Math.min(6, rawData.length);
  for (let r = 0; r < candLimit; r++) {
    const row = rawData[r];
    if (Array.isArray(row)) {
      const nonBlank = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
      if (nonBlank.length === 0) continue;

      let dataCellCount = 0;
      for (const cell of nonBlank) {
        if (isDataCell(cell)) dataCellCount++;
      }

      // If a row has emails, birthdates, or student roll numbers, it is a DATA row, not a header row
      if (dataCellCount > 0 && r > 0) continue;

      const samples = nonBlank.slice(0, 6);
      candidateHeaderRows.push({
        rowNumber: r + 1, // 1-indexed for display: Row 1, Row 2
        rowIndex: r,      // 0-indexed for API/code: 0, 1
        preview: samples.join(' | ') + (nonBlank.length > 6 ? '...' : ''),
        cellCount: nonBlank.length
      });
    }
  }

  // Convert remaining rows to objects using headers
  const rows = [];
  let dataRowSeq = 1;
  for (let i = headerRowIdx + 1; i < rawData.length; i++) {
    const rawRow = rawData[i];
    // Keep ONLY rows that contain actual data (skip completely blank or whitespace-only rows)
    const hasActualData = Array.isArray(rawRow) && rawRow.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
    if (!hasActualData) {
      continue;
    }

    const rowObj = {};
    headers.forEach((header, colIdx) => {
      const cellVal = rawRow[colIdx];
      rowObj[header] = cellVal !== null && cellVal !== undefined ? String(cellVal).trim() : '';
    });
    rows.push({ _rowIndex: dataRowSeq++, _excelRow: i + 1, ...rowObj }); // Sequence starts from 1
  }

  return {
    headers,
    rows,
    sheetName,
    allSheetNames,
    detectedHeaderRow: headerRowIdx + 1,
    candidateHeaderRows
  };
};

/**
 * Apply column mapping and selective fields filter to convert raw rows
 * Requirement 9: Only selected fields enter the database!
 * 
 * @param {Object[]} rows - Raw rows from parseXlsxBuffer
 * @param {Object} mapping - { excelHeader: dbField }
 * @param {string[]} [selectedFields] - Optional array of dbFields chosen by Admin
 * @returns {Object[]} - Mapped rows containing only selected dbField keys
 */
const applyMapping = (rows, mapping = {}, selectedFields = null) => {
  const selectedSet = selectedFields && Array.isArray(selectedFields) && selectedFields.length > 0
    ? new Set(selectedFields)
    : null;

  return rows.map(row => {
    const mapped = { _rowIndex: row._rowIndex };
    // Preserve existing direct keys if present and not internal
    for (const [key, val] of Object.entries(row)) {
      if (key !== '_rowIndex' && val !== undefined) {
        if (!selectedSet || selectedSet.has(key)) {
          mapped[key] = val;
        }
      }
    }
    // Apply explicit mappings from mapping object
    if (mapping && typeof mapping === 'object') {
      for (const [excelHeader, dbField] of Object.entries(mapping)) {
        if (dbField && row[excelHeader] !== undefined) {
          if (!selectedSet || selectedSet.has(dbField)) {
            mapped[dbField] = row[excelHeader];
          }
        }
      }
    }
    return mapped;
  });
};

// ── Allowed enum values ───────────────────────────────────────────────────────
const ALLOWED_STATUSES = ['active', 'graduated', 'inactive', 'suspended'];
const ALLOWED_REGULAR_STATUSES = ['Regular', 'Irregular'];

/**
 * Validate and normalize a single student row
 * 
 * @param {Object} row - Mapped row object (with dbField keys)
 * @param {number} rowIndex - Original row number for error reporting
 * @param {string[]} validDepartments - Known valid department codes
 * @param {Object} [overrides] - Admin series / department / session manual overrides
 * @returns {{ valid: boolean, data: Object|null, errors: Array<{ field: string, message: string }> }}
 */
const validateRow = (row, rowIndex, validDepartments = [], overrides = {}, defaultDept = '') => {
  const errors = [];
  const data = {};

  // rollNumber — REQUIRED
  const roll = String(row.rollNumber || '').trim();
  if (!roll) {
    errors.push({ field: 'rollNumber', message: 'Roll Number (Student ID) is required' });
  } else {
    data.rollNumber = roll.toUpperCase();
  }

  // name / studentName — REQUIRED
  const name = String(row.name || row.studentName || '').trim();
  if (!name) {
    errors.push({ field: 'name', message: 'Student Name is required' });
  } else if (name.length < 2) {
    errors.push({ field: 'name', message: 'Student Name is too short (min 2 characters)' });
  } else if (name.length > 100) {
    errors.push({ field: 'name', message: 'Student Name is too long (max 100 characters)' });
  } else {
    data.name = name;
  }

  // department — from row, override, auto-detect from roll, or defaultDept (admin's department)
  let dept = (overrides.department || String(row.department || '').trim() || defaultDept || '').toUpperCase();

  // If still empty, attempt RUET roll-number department code auto-detection (e.g. 2104001 -> 04 -> CSE, 2105001 -> 05 -> ETE)
  if (!dept && data.rollNumber && data.rollNumber.length >= 4) {
    const rollDigits = data.rollNumber.replace(/\D/g, '');
    if (rollDigits.length >= 4) {
      const deptCodeNum = rollDigits.slice(2, 4);
      const RUET_ROLL_DEPT_MAP = {
        '01': 'CE',
        '02': 'EEE',
        '03': 'ME',
        '04': 'CSE',
        '05': 'ETE',
        '06': 'IPE',
        '07': 'CME',
        '08': 'MTE',
        '09': 'CHE',
        '10': 'MSE',
        '11': 'ARCH',
        '12': 'BECM',
        '13': 'URP'
      };
      const candidateDept = RUET_ROLL_DEPT_MAP[deptCodeNum];
      if (candidateDept && (validDepartments.length === 0 || validDepartments.includes(candidateDept))) {
        dept = candidateDept;
      }
    }
  }

  // If still empty and validDepartments has only 1 active department, use it
  if (!dept && validDepartments.length === 1) {
    dept = validDepartments[0];
  }

  if (!dept) {
    errors.push({ field: 'department', message: 'Department is required (or select series/dept override)' });
  } else if (validDepartments.length > 0 && !validDepartments.includes(dept)) {
    const matched = validDepartments.find(vd => vd.toLowerCase() === dept.toLowerCase());
    if (matched) {
      data.department = matched;
    } else {
      errors.push({ field: 'department', message: `Invalid department "${dept}". Valid: ${validDepartments.join(', ')}` });
    }
  } else {
    data.department = dept;
  }

  // series — from row or override (Requirement 10: series-wise import with manual override)
  let series = overrides.series || String(row.series || '').trim();
  if (!series && data.rollNumber && data.rollNumber.length >= 2) {
    // Attempt auto-detection from roll (e.g. 2204001 -> "22", 2501001 -> "25")
    const leading2 = data.rollNumber.slice(0, 2);
    if (/^\d{2}$/.test(leading2)) {
      series = leading2;
    }
  }
  if (!series) {
    errors.push({ field: 'series', message: 'Series is required (or select in import settings)' });
  } else if (!isValidSeries(series)) {
    errors.push({ field: 'series', message: `Invalid series "${series}". Must be a 2-digit year code (e.g. 22, 23, 25)` });
  } else {
    data.series = series.padStart(2, '0');
  }

  // session / academicSession — optional or auto-derived
  if (overrides.academicSession || overrides.session) {
    data.session = overrides.academicSession || overrides.session;
  } else if (row.session || row.academicSession) {
    const sess = String(row.session || row.academicSession).trim();
    if (!isValidSession(sess)) {
      errors.push({ field: 'session', message: `Invalid session "${sess}". Expected format: "2025-2026" or "2025-26"` });
    } else {
      data.session = sess;
    }
  } else if (data.series) {
    data.session = getSessionFromSeries(data.series);
  }

  // registrationNumber / registrationNo — STRICTLY REQUIRED (initial student password, zero fallback)
  const regNo = String(row.registrationNumber || row.registrationNo || '').trim();
  if (!regNo) {
    errors.push({ field: 'registrationNumber', message: 'Registration Number is required (used as initial password)' });
  } else {
    data.registrationNumber = regNo;
  }

  // email / studentEmail — optional but validate format if present
  const email = String(row.email || row.studentEmail || '').trim().toLowerCase();
  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: 'email', message: `Invalid email format "${email}"` });
    } else {
      data.email = email;
    }
  }

  // contactNo / phone — optional
  const phone = String(row.contactNo || row.phone || '').trim();
  if (phone) {
    data.contactNo = phone;
  }

  // section — optional
  if (row.section) {
    data.section = String(row.section).trim().toUpperCase();
  }

  // batch — optional
  if (row.batch) {
    data.batch = String(row.batch).trim();
  }

  // semester / currentSemester — optional (e.g. 1-1, 1-2, 2-1, 2-2, 3-1, 3-2, 4-1, 4-2)
  const semester = String(row.semester || row.currentSemester || '').trim();
  if (semester) {
    data.semester = semester;
  }

  // regularStatus — optional, default Regular
  const regStatus = String(row.regularStatus || '').trim();
  if (regStatus) {
    const formatted = regStatus.charAt(0).toUpperCase() + regStatus.slice(1).toLowerCase();
    if (!ALLOWED_REGULAR_STATUSES.includes(formatted)) {
      errors.push({ field: 'regularStatus', message: `Invalid regular status "${regStatus}". Allowed: Regular, Irregular` });
    } else {
      data.regularStatus = formatted;
    }
  } else {
    data.regularStatus = 'Regular';
  }

  // gender, bloodGroup, address (optional)
  if (row.gender) data.gender = String(row.gender).trim();
  if (row.bloodGroup) data.bloodGroup = String(row.bloodGroup).trim();
  if (row.address) data.address = String(row.address).trim();

  // status — optional, default active
  if (row.status) {
    const s = String(row.status).trim().toLowerCase();
    if (!ALLOWED_STATUSES.includes(s)) {
      errors.push({ field: 'status', message: `Invalid status "${row.status}". Allowed: ${ALLOWED_STATUSES.join(', ')}` });
    } else {
      data.status = s;
    }
  } else {
    data.status = 'active';
  }

  // Preserve all custom / dynamic fields
  const KNOWN_CORE_KEYS = new Set([
    'rollNumber', 'name', 'studentName', 'department', 'series', 'session', 'academicSession',
    'registrationNumber', 'registrationNo', 'email', 'studentEmail', 'contactNo', 'phone',
    'section', 'batch', 'semester', 'currentSemester', 'regularStatus', 'gender',
    'bloodGroup', 'address', 'status', '_rowIndex'
  ]);

  for (const [key, val] of Object.entries(row)) {
    if (!KNOWN_CORE_KEYS.has(key) && val !== undefined && val !== null && String(val).trim() !== '') {
      data[key] = typeof val === 'string' ? val.trim() : val;
    }
  }

  return {
    valid: errors.length === 0,
    data: data || {},
    errors
  };
};

/**
 * Generate a downloadable XLSX error report for invalid rows
 * 
 * @param {Array<{ row: number, rollNumber?: string, studentName?: string, errors: Array<{ field?: string, message: string }> | string[] }>} errorRows
 * @returns {Buffer}
 */
const generateErrorReport = (errorRows) => {
  const wb = XLSX.utils.book_new();

  const headers = ['Excel Row #', 'Roll Number', 'Student Name', 'Field With Issue', 'Error Description'];

  const rows = [];
  for (const item of errorRows) {
    const errList = Array.isArray(item.errors) ? item.errors : [item.message || 'Validation error'];
    for (const err of errList) {
      const field = typeof err === 'object' ? err.field || 'General' : 'General';
      const msg = typeof err === 'object' ? err.message : String(err);
      rows.push([
        item.row || item.rowIndex || '-',
        item.rollNumber || item.roll || '-',
        item.studentName || item.name || '-',
        field,
        msg
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 25 }, { wch: 20 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Import Errors');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Generate a downloadable XLSX template buffer
 * 
 * @returns {Buffer}
 */
const generateTemplate = () => {
  const wb = XLSX.utils.book_new();

  // ── Data Sheet ──────────────────────────────────────────────────────────────
  const headers = [
    'Roll Number*', 'Student Name*', 'Department*', 'Series*',
    'Registration No', 'Student Email', 'Phone',
    'Current Semester', 'Academic Session', 'Regular Status', 'Batch', 'Section', 'Status'
  ];

  const exampleRow = [
    '2501001', 'Mohammad Rahim', 'ETE', '25',
    '2025001', 'rahim25@student.ruet.ac.bd', '01700000001',
    '1-1', '2025-2026', 'Regular', 'A', 'A', 'active'
  ];

  const dataWs = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  dataWs['!cols'] = headers.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, dataWs, 'Students');

  // ── Instructions Sheet ──────────────────────────────────────────────────────
  const instructions = [
    ['LabEval Student Import Template — Instructions'],
    [''],
    ['REQUIRED FIELDS (marked with *)'],
    ['Roll Number*', 'Unique student roll number (e.g. 2501001)'],
    ['Student Name*', 'Full name of the student (2-100 characters)'],
    ['Department*', 'Department code (e.g. ETE, CSE, EEE, ECE)'],
    ['Series*', '2-digit year series code (e.g. 22, 23, 24, 25)'],
    [''],
    ['OPTIONAL FIELDS'],
    ['Registration No', 'Student registration number (if available)'],
    ['Student Email', 'Valid student email address'],
    ['Phone', 'Contact phone number'],
    ['Current Semester', 'Semester (e.g. 1-1, 1-2, 2-1, 2-2, 3-1, 3-2, 4-1, 4-2)'],
    ['Academic Session', 'Academic session (e.g. 2025-2026)'],
    ['Regular Status', 'Regular or Irregular (default: Regular)'],
    ['Batch', 'Lab batch assignment (e.g. A, B)'],
    ['Section', 'Class section (e.g. A, B)'],
    ['Status', 'Student status: active | graduated | inactive | suspended (default: active)'],
    [''],
    ['DYNAMIC COLUMN MAPPING SUPPORTED'],
    ['• The admin panel allows you to map ANY Excel column to ANY database field!'],
    ['• You can selectively choose which columns to import into the database.'],
    ['• Duplicate detection can match on Roll Number, Registration Number, or Email.']
  ];

  const instrWs = XLSX.utils.aoa_to_sheet(instructions);
  instrWs['!cols'] = [{ wch: 28 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, instrWs, 'Instructions');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = {
  inspectWorkbook,
  parseXlsxBuffer,
  autoDetectMapping,
  applyMapping,
  validateRow,
  generateTemplate,
  generateErrorReport,
  normalizeHeader,
  DEFAULT_COLUMN_ALIASES,
  ALLOWED_STATUSES,
  ALLOWED_REGULAR_STATUSES
};
