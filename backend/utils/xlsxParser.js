/**
 * XLSX Parser Utility for Student Import
 * Handles workbook reading, column mapping, validation, and normalization
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
  'rollno': 'rollNumber',
  'rollnumber': 'rollNumber',
  'id': 'rollNumber',
  'student no': 'rollNumber',
  'student no.': 'rollNumber',

  // Registration
  'registration number': 'registrationNumber',
  'registration no': 'registrationNumber',
  'registration no.': 'registrationNumber',
  'reg number': 'registrationNumber',
  'reg no': 'registrationNumber',
  'reg no.': 'registrationNumber',
  'regno': 'registrationNumber',
  'registrationno': 'registrationNumber',
  'registrationnumber': 'registrationNumber',

  // Name
  'name': 'name',
  'full name': 'name',
  'fullname': 'name',
  'student name': 'name',
  'studentname': 'name',

  // Email
  'email': 'email',
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
  'year': 'series',
  'admission year': 'series',

  // Session
  'session': 'session',
  'academic session': 'session',
  'academicsession': 'session',

  // Batch
  'batch': 'batch',
  'group': 'batch',
  'lab batch': 'batch',
  'lab group': 'batch',

  // Semester
  'semester': 'semester',
  'sem': 'semester',
  'term': 'semester',

  // Section
  'section': 'section',
  'class section': 'section',
  'classsection': 'section',

  // Status
  'status': 'status',
  'student status': 'status',
  'active status': 'status'
};

/**
 * Normalize a header string for alias lookup
 */
const normalizeHeader = (header) => {
  if (!header) return '';
  return String(header)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[*]/g, '');  // Remove asterisks from required-field markers
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
 * Parse an XLSX buffer into an array of raw row objects
 * 
 * @param {Buffer} buffer - XLSX file buffer
 * @returns {{ headers: string[], rows: Object[], sheetName: string }}
 */
const parseXlsxBuffer = (buffer) => {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch (e) {
    throw new Error(`Failed to parse XLSX file: ${e.message}`);
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Excel file has no worksheets');
  }

  // Use first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`Cannot read sheet: ${sheetName}`);
  }

  // Convert to array of arrays to get headers from first row
  const rawData = XLSX.utils.sheet_to_json(sheet, {
    header: 1,    // Return array of arrays
    defval: '',   // Default value for empty cells
    raw: false    // Format numbers as strings
  });

  if (!rawData || rawData.length === 0) {
    throw new Error('Excel sheet is empty');
  }

  // Extract headers from first non-empty row
  let headerRowIdx = 0;
  while (headerRowIdx < rawData.length && rawData[headerRowIdx].every(cell => cell === '' || cell === null)) {
    headerRowIdx++;
  }

  if (headerRowIdx >= rawData.length) {
    throw new Error('No header row found in Excel file');
  }

  const headers = rawData[headerRowIdx].map(h => String(h || '').trim()).filter(h => h !== '');

  if (headers.length === 0) {
    throw new Error('No column headers found in Excel file');
  }

  // Convert remaining rows to objects using headers
  const rows = [];
  for (let i = headerRowIdx + 1; i < rawData.length; i++) {
    const rawRow = rawData[i];
    // Skip completely empty rows
    if (rawRow.every(cell => cell === '' || cell === null || cell === undefined)) {
      continue;
    }

    const rowObj = {};
    headers.forEach((header, colIdx) => {
      const cellVal = rawRow[colIdx];
      rowObj[header] = cellVal !== null && cellVal !== undefined ? String(cellVal).trim() : '';
    });
    rows.push({ _rowIndex: i + 1, ...rowObj }); // 1-indexed for display
  }

  return { headers, rows, sheetName };
};

/**
 * Apply column mapping to convert raw rows to database-ready objects
 * 
 * @param {Object[]} rows - Raw rows from parseXlsxBuffer
 * @param {Object} mapping - { excelHeader: dbField }
 * @returns {Object[]} - Mapped rows with dbField keys
 */
const applyMapping = (rows, mapping) => {
  return rows.map(row => {
    const mapped = { _rowIndex: row._rowIndex };
    for (const [excelHeader, dbField] of Object.entries(mapping)) {
      if (dbField && row[excelHeader] !== undefined) {
        mapped[dbField] = row[excelHeader];
      }
    }
    return mapped;
  });
};

// ── Allowed enum values ───────────────────────────────────────────────────────
const ALLOWED_STATUSES = ['active', 'graduated', 'inactive', 'suspended'];

/**
 * Validate and normalize a single student row
 * 
 * @param {Object} row - Mapped row object (with dbField keys)
 * @param {number} rowIndex - Original row number for error reporting
 * @param {string[]} validDepartments - Known valid department codes
 * @returns {{ valid: boolean, data: Object|null, errors: string[] }}
 */
const validateRow = (row, rowIndex, validDepartments = []) => {
  const errors = [];
  const data = {};

  // rollNumber — REQUIRED
  const roll = String(row.rollNumber || '').trim();
  if (!roll) {
    errors.push('Roll Number (Student ID) is required');
  } else {
    data.rollNumber = roll.toUpperCase();
  }

  // name — REQUIRED
  const name = String(row.name || '').trim();
  if (!name) {
    errors.push('Name is required');
  } else if (name.length < 2) {
    errors.push('Name is too short (minimum 2 characters)');
  } else if (name.length > 100) {
    errors.push('Name is too long (maximum 100 characters)');
  } else {
    data.name = name;
  }

  // department — REQUIRED
  const dept = String(row.department || '').trim().toUpperCase();
  if (!dept) {
    errors.push('Department is required');
  } else if (validDepartments.length > 0 && !validDepartments.includes(dept)) {
    errors.push(`Invalid department "${dept}". Valid: ${validDepartments.join(', ')}`);
  } else {
    data.department = dept;
  }

  // series — REQUIRED
  const series = String(row.series || '').trim();
  if (!series) {
    errors.push('Series is required');
  } else if (!isValidSeries(series)) {
    errors.push(`Invalid series "${series}". Must be a 2-digit year code (e.g. 22, 23)`);
  } else {
    data.series = series.padStart(2, '0');
  }

  // session — optional, auto-derived from series if not provided
  if (row.session) {
    const session = String(row.session).trim();
    if (!isValidSession(session)) {
      errors.push(`Invalid session "${session}". Expected format: "2022-23"`);
    } else {
      data.session = session;
    }
  } else if (data.series) {
    data.session = getSessionFromSeries(data.series);
  }

  // registrationNumber — optional
  if (row.registrationNumber) {
    data.registrationNumber = String(row.registrationNumber).trim();
  }

  // email — optional but validate format
  if (row.email) {
    const email = String(row.email).trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Invalid email format "${email}"`);
    } else if (email) {
      data.email = email;
    }
  }

  // contactNo — optional
  if (row.contactNo) {
    const phone = String(row.contactNo).trim();
    if (phone) data.contactNo = phone;
  }

  // section — optional
  if (row.section) {
    data.section = String(row.section).trim().toUpperCase();
  }

  // batch — optional
  if (row.batch) {
    data.batch = String(row.batch).trim();
  }

  // semester — optional
  if (row.semester) {
    data.semester = String(row.semester).trim();
  }

  // status — optional, default active
  if (row.status) {
    const s = String(row.status).trim().toLowerCase();
    if (!ALLOWED_STATUSES.includes(s)) {
      errors.push(`Invalid status "${row.status}". Allowed: ${ALLOWED_STATUSES.join(', ')}`);
    } else {
      data.status = s;
    }
  } else {
    data.status = 'active';
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? data : null,
    errors
  };
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
    'Roll Number*', 'Name*', 'Department*', 'Series*',
    'Registration Number', 'Email', 'Phone',
    'Session', 'Batch', 'Semester', 'Section', 'Status'
  ];

  const exampleRow = [
    '2204001', 'Mohammad Rahim', 'ETE', '22',
    '220401', 'rahim@student.ruet.ac.bd', '01700000001',
    '2022-23', 'A', '3-1', 'A', 'active'
  ];

  const dataWs = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

  // Style header row (bold, wider columns)
  dataWs['!cols'] = headers.map(() => ({ wch: 22 }));

  XLSX.utils.book_append_sheet(wb, dataWs, 'Students');

  // ── Instructions Sheet ──────────────────────────────────────────────────────
  const instructions = [
    ['LabEval Student Import Template — Instructions'],
    [''],
    ['REQUIRED FIELDS (marked with *)'],
    ['Roll Number*', 'Unique student roll number (e.g. 2204001)'],
    ['Name*', 'Full name of the student (2-100 characters)'],
    ['Department*', 'Department code in uppercase (e.g. ETE, CSE, EEE, ECE)'],
    ['Series*', '2-digit year series code (e.g. 22, 23, 24, 25)'],
    [''],
    ['OPTIONAL FIELDS'],
    ['Registration Number', 'Student registration number (if available)'],
    ['Email', 'Valid email address (e.g. student@ruet.ac.bd)'],
    ['Phone', 'Contact phone number (e.g. 01700000001)'],
    ['Session', 'Academic session — auto-derived from series (e.g. 2022-23)'],
    ['Batch', 'Lab batch assignment (e.g. A, B, 1, 2)'],
    ['Semester', 'Current semester (e.g. 3-1, 3-2, 4-1)'],
    ['Section', 'Class section (e.g. A, B)'],
    ['Status', 'Student status: active | graduated | inactive | suspended (default: active)'],
    [''],
    ['SERIES → SESSION MAPPING'],
    ['Series 22 → Session 2022-23'],
    ['Series 23 → Session 2023-24'],
    ['Series 24 → Session 2024-25'],
    ['Series 25 → Session 2025-26'],
    ['Series 26 → Session 2026-27'],
    [''],
    ['NOTES'],
    ['• Remove this sheet before importing (or ignore it — it won\'t affect import)'],
    ['• Column headers must match exactly or use the column mapper in the import UI'],
    ['• Duplicate roll numbers within the file will be flagged as errors'],
    ['• Use Dry Run mode to preview changes without modifying the database'],
    ['• Default password for new students: their roll number (they can change it)'],
  ];

  const instrWs = XLSX.utils.aoa_to_sheet(instructions);
  instrWs['!cols'] = [{ wch: 28 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, instrWs, 'Instructions');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = {
  parseXlsxBuffer,
  autoDetectMapping,
  applyMapping,
  validateRow,
  generateTemplate,
  normalizeHeader,
  DEFAULT_COLUMN_ALIASES,
  ALLOWED_STATUSES
};
