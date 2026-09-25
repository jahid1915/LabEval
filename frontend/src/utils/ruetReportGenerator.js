import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Loads image from public path and converts to base64
 */
const loadLogoBase64 = async () => {
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = (e) => reject(e);
      img.src = '/RUET.png';
    });
  } catch {
    return null;
  }
};

/**
 * Generate Professional RUET Academic Mark Sheet PDF
 */
/**
 * Generate Professional RUET Academic Mark Sheet PDF
 * Matches exact RUET institutional layout with motto, header, and side-by-side evaluation table
 */
export const generateRUETPDFReport = async ({
  courseCode = 'EEE 3154',
  courseName = 'Sessional based on EEE 3153',
  department = 'ETE',
  departmentName = 'Electronics & Telecommunication Engineering',
  facultyName = 'Faculty of Electrical & Computer Engineering',
  series = '22',
  semester = '3-1',
  session = '2024-2025',
  teacher = {
    name: 'Md Abu Ismail Siddique',
    designation: 'Assistant Professor',
    department: 'ETE'
  },
  results = [],
  maxMarks = 65,
  layoutConfig = {}
}) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logoBase64 = await loadLogoBase64();

  const pageWidth = doc.internal.pageSize.width; // 297 mm
  const centerX = pageWidth / 2;

  // Active configuration defaults
  const mode = layoutConfig.mode || 'side-by-side';
  const motto = layoutConfig.motto ?? "Heaven's light is our guide";
  const showMotto = layoutConfig.showMotto ?? true;
  const includeName = layoutConfig.includeName ?? false;
  const includeGrade = layoutConfig.includeGrade ?? false;
  const includeGP = layoutConfig.includeGP ?? false;
  const crit = {
    quiz: layoutConfig.criteria?.quiz ?? 20,
    labReport: layoutConfig.criteria?.labReport ?? 15,
    labViva: layoutConfig.criteria?.labViva ?? 10,
    labTest: layoutConfig.criteria?.labTest ?? 20,
    openEnded: layoutConfig.criteria?.openEnded ?? 0,
    attendance: layoutConfig.criteria?.attendance ?? 10,
    others: layoutConfig.criteria?.others ?? 0,
  };
  const effectiveMaxMarks = layoutConfig.maxMarks ?? (crit.quiz + crit.labReport + crit.labViva + crit.labTest + crit.openEnded + crit.attendance + crit.others || maxMarks);

  // RUET Emblem on top-left
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 16, 7, 21, 21);
  }

  // Row 1: Motto (if enabled)
  if (showMotto && motto) {
    doc.setFont('times', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(motto, centerX, 11.5, { align: 'center' });
  }

  // Row 2: University Name
  doc.setFont('times', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Rajshahi University of Engineering & Technology', centerX, 17.5, { align: 'center' });

  // Row 3: Department
  doc.setFont('times', 'normal');
  doc.setFontSize(11.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Department of ${departmentName}`, centerX, 23.5, { align: 'center' });

  // Separator line 1
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.35);
  doc.line(16, 26.5, pageWidth - 16, 26.5);

  // Row 4: Lab Marks on
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('Lab Marks on', centerX, 31, { align: 'center' });

  // Row 5: Course code and title
  doc.setFont('times', 'bold');
  doc.setFontSize(11.5);
  doc.text(`${courseCode} ( ${courseName} )`, centerX, 36, { align: 'center' });

  // Separator line 2
  doc.setLineWidth(0.35);
  doc.line(16, 39, pageWidth - 16, 39);

  // Sub-header metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Series: ${series}    |    Semester: ${semester}    |    Session: ${session}    |    Course Teacher: ${teacher.name} (${teacher.designation || 'Teacher'}, Dept. of ${department})`,
    centerX,
    43,
    { align: 'center' }
  );

  const startY = 46;

  // Sort students by roll number
  const sorted = [...results].sort((a, b) => {
    const rA = String(a.student?.rollNumber || a.rollNumber || a.roll || '');
    const rB = String(b.student?.rollNumber || b.rollNumber || b.roll || '');
    return rA.localeCompare(rB);
  });

  if (mode === 'single-table') {
    // ──────────────── SINGLE FULL TABLE MODE ────────────────
    const headRow1 = ['SL', 'Roll'];
    const headRow2 = ['', ''];
    if (includeName) { headRow1.push('Student Name'); headRow2.push(''); }
    headRow1.push('Quiz', 'Lab Report', 'Lab Viva', 'Lab Test', 'Open Ended', 'Atnd.', 'Total');
    headRow2.push(`[${crit.quiz}]`, `[${crit.labReport}]`, `[${crit.labViva}]`, `[${crit.labTest}]`, `[${crit.openEnded}]`, `[${crit.attendance}]`, `[${effectiveMaxMarks}]`);
    if (includeGrade) { headRow1.push('Grade'); headRow2.push(''); }
    if (includeGP) { headRow1.push('GP'); headRow2.push(''); }

    const bodyRows = sorted.map((item, idx) => {
      const roll = item.student?.rollNumber || item.rollNumber || item.roll || '';
      const name = item.student?.name || item.studentName || item.name || '';
      const q = item.quizMark ?? item.quizMarks ?? item.quiz ?? 0;
      const rep = item.reportMark ?? item.reportMarks ?? item.labReport ?? 0;
      const viv = item.vivaMark ?? item.vivaMarks ?? item.labViva ?? 0;
      const t = item.testMark ?? item.testMarks ?? item.labTest ?? 0;
      const oe = item.openEndedMark ?? item.openEndedMarks ?? item.openEnded ?? 'A';
      const att = item.attendanceMark ?? item.attendanceMarks ?? item.attendance ?? 0;
      const tot = item.totalMark ?? item.totalMarks ?? item.total ?? (Number(q) + Number(rep) + Number(viv) + Number(t) + (oe === 'A' ? 0 : Number(oe)) + Number(att));
      const grade = item.grade || 'F';
      const gp = item.gradePoint !== undefined ? Number(item.gradePoint).toFixed(2) : '0.00';

      const row = [(idx + 1).toString(), String(roll)];
      if (includeName) row.push(name);
      row.push(String(q), String(rep), String(viv), String(t), String(oe), String(att), String(tot));
      if (includeGrade) row.push(grade);
      if (includeGP) row.push(gp);
      return row;
    });

    autoTable(doc, {
      head: [headRow1, headRow2],
      body: bodyRows,
      startY,
      margin: { left: 16, right: 16 },
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.5, halign: 'center', textColor: [15, 23, 42], lineWidth: 0.15 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 }
    });
  } else {
    // ──────────────── SIDE-BY-SIDE 2-COLUMN MODE ────────────────
    const halfCount = Math.max(1, Math.ceil(sorted.length / 2));
    const leftGroup = sorted.slice(0, halfCount);
    const rightGroup = sorted.slice(halfCount);

    const tableHead = [
      [
        { content: 'Roll', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        'Quiz', 'Lab Report', 'Lab Viva', 'Lab Test', 'Open Ended', 'Atnd.', 'Total',
        { content: '', rowSpan: 2, styles: { cellWidth: 4, fillColor: [255, 255, 255], lineWidth: 0 } },
        { content: 'Roll', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        'Quiz', 'Lab Report', 'Lab Viva', 'Lab Test', 'Open Ended', 'Atnd.', 'Total'
      ],
      [
        `[${crit.quiz}]`, `[${crit.labReport}]`, `[${crit.labViva}]`, `[${crit.labTest}]`, `[${crit.openEnded}]`, `[${crit.attendance}]`, `[${effectiveMaxMarks}]`,
        `[${crit.quiz}]`, `[${crit.labReport}]`, `[${crit.labViva}]`, `[${crit.labTest}]`, `[${crit.openEnded}]`, `[${crit.attendance}]`, `[${effectiveMaxMarks}]`
      ]
    ];

    const tableBody = [];
    for (let i = 0; i < halfCount; i++) {
      const l = leftGroup[i];
      const r = rightGroup[i];

      const getCells = (item) => {
        if (!item) return ['', '', '', '', '', '', '', ''];
        const roll = item.student?.rollNumber || item.rollNumber || item.roll || '';
        const q = item.quizMark ?? item.quizMarks ?? item.quiz ?? 0;
        const rep = item.reportMark ?? item.reportMarks ?? item.labReport ?? 0;
        const viv = item.vivaMark ?? item.vivaMarks ?? item.labViva ?? 0;
        const t = item.testMark ?? item.testMarks ?? item.labTest ?? 0;
        const oe = item.openEndedMark ?? item.openEndedMarks ?? item.openEnded ?? 'A';
        const att = item.attendanceMark ?? item.attendanceMarks ?? item.attendance ?? 0;
        const tot = item.totalMark ?? item.totalMarks ?? item.total ?? (Number(q) + Number(rep) + Number(viv) + Number(t) + (oe === 'A' ? 0 : Number(oe)) + Number(att));

        return [String(roll), String(q), String(rep), String(viv), String(t), String(oe), String(att), String(tot)];
      };

      tableBody.push([...getCells(l), '', ...getCells(r)]);
    }

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY,
      margin: { left: 16, right: 16 },
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        halign: 'center',
        textColor: [15, 23, 42],
        lineColor: [100, 116, 139],
        lineWidth: 0.15
      },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
        1: { halign: 'center', cellWidth: 14 },
        2: { halign: 'center', cellWidth: 17 },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'center', cellWidth: 17 },
        6: { halign: 'center', cellWidth: 14 },
        7: { halign: 'center', fontStyle: 'bolditalic', cellWidth: 16 },
        8: { cellWidth: 4, fillColor: [255, 255, 255], lineWidth: 0 },
        9: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
        10: { halign: 'center', cellWidth: 14 },
        11: { halign: 'center', cellWidth: 17 },
        12: { halign: 'center', cellWidth: 15 },
        13: { halign: 'center', cellWidth: 15 },
        14: { halign: 'center', cellWidth: 17 },
        15: { halign: 'center', cellWidth: 14 },
        16: { halign: 'center', fontStyle: 'bolditalic', cellWidth: 16 }
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8,
        lineWidth: 0.2,
        lineColor: [71, 85, 105]
      },
      alternateRowStyles: { fillColor: [255, 255, 255] }
    });
  }

  // Signature Block on final page
  const finalY = (doc.lastAutoTable.finalY || startY) + 14;
  const pageHeight = doc.internal.pageSize.height;

  let sigY = finalY;
  if (sigY > pageHeight - 32) {
    doc.addPage();
    sigY = 28;
  }

  // Teacher signature block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('----------------------------------------------------', 35, sigY);
  doc.setFont('helvetica', 'bold');
  doc.text(teacher.name, 35, sigY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(teacher.designation || 'Course Teacher', 35, sigY + 9);
  doc.text(`Dept. of ${department}, RUET`, 35, sigY + 13);

  // Department Head signature block
  doc.text('----------------------------------------------------', 200, sigY);
  doc.setFont('helvetica', 'bold');
  doc.text('Head of the Department', 200, sigY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Department of ${departmentName}`, 200, sigY + 9);
  doc.text('RUET, Rajshahi-6204', 200, sigY + 13);

  const cleanFileCode = courseCode.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`RUET_${cleanFileCode}_Marks_${series}Series.pdf`);
};

/**
 * Generate Professional RUET Academic Mark Sheet XLSX
 * Configurable dynamically by the teacher
 */
export const generateRUETXLSXReport = ({
  courseCode = 'EEE 3154',
  courseName = 'Sessional Based on EEE 3153',
  department = 'ETE',
  departmentName = 'Electronics & Telecommunication Engineering',
  facultyName = 'Faculty of Electrical & Computer Engineering',
  series = '22',
  semester = '3-1',
  session = '2024-2025',
  teacher = {
    name: 'Md Abu Ismail Siddique',
    designation: 'Assistant Professor',
    department: 'ETE'
  },
  results = [],
  maxMarks = 65,
  layoutConfig = {}
}) => {
  const wb = XLSX.utils.book_new();

  const mode = layoutConfig.mode || 'side-by-side';
  const motto = layoutConfig.motto ?? "Heaven's light is our guide";
  const showMotto = layoutConfig.showMotto ?? true;
  const includeName = layoutConfig.includeName ?? false;
  const includeGrade = layoutConfig.includeGrade ?? false;
  const includeGP = layoutConfig.includeGP ?? false;
  const crit = {
    quiz: layoutConfig.criteria?.quiz ?? 20,
    labReport: layoutConfig.criteria?.labReport ?? 15,
    labViva: layoutConfig.criteria?.labViva ?? 10,
    labTest: layoutConfig.criteria?.labTest ?? 20,
    openEnded: layoutConfig.criteria?.openEnded ?? 0,
    attendance: layoutConfig.criteria?.attendance ?? 10,
    others: layoutConfig.criteria?.others ?? 0,
  };
  const effectiveMaxMarks = layoutConfig.maxMarks ?? (crit.quiz + crit.labReport + crit.labViva + crit.labTest + crit.openEnded + crit.attendance + crit.others || maxMarks);

  // Sort students by roll number
  const sorted = [...results].sort((a, b) => {
    const rA = String(a.student?.rollNumber || a.rollNumber || a.roll || '');
    const rB = String(b.student?.rollNumber || b.rollNumber || b.roll || '');
    return rA.localeCompare(rB);
  });

  const rows = [];

  // Row 1: Motto
  if (showMotto && motto) rows.push([motto]);
  // Row 2: University Name
  rows.push(['Rajshahi University of Engineering & Technology']);
  // Row 3: Department
  rows.push([`Department of ${departmentName}`]);
  // Row 4: Lab Marks on
  rows.push(['Lab Marks on']);
  // Row 5: Course title
  rows.push([`${courseCode} ( ${courseName} )`]);
  // Row 6: Spacing / sub-info
  rows.push([`Series: ${series}   |   Semester: ${semester}   |   Academic Session: ${session}   |   Teacher: ${teacher.name}`]);
  // Row 7: Blank spacer
  rows.push([]);

  if (mode === 'single-table') {
    // ──────────────── SINGLE CONTINUOUS TABLE (XLSX) ────────────────
    const h1 = ['SL', 'Roll'];
    const h2 = ['', ''];
    if (includeName) { h1.push('Student Name'); h2.push(''); }
    h1.push('Quiz', 'Lab Report', 'Lab Viva', 'Lab Test', 'Open Ended', 'Atnd.', 'Total');
    h2.push(`[${crit.quiz}]`, `[${crit.labReport}]`, `[${crit.labViva}]`, `[${crit.labTest}]`, `[${crit.openEnded}]`, `[${crit.attendance}]`, `[${effectiveMaxMarks}]`);
    if (includeGrade) { h1.push('Grade'); h2.push(''); }
    if (includeGP) { h1.push('GP'); h2.push(''); }

    rows.push(h1);
    rows.push(h2);

    sorted.forEach((item, idx) => {
      const roll = item.student?.rollNumber || item.rollNumber || item.roll || '';
      const name = item.student?.name || item.studentName || item.name || '';
      const q = item.quizMark ?? item.quizMarks ?? item.quiz ?? 0;
      const rep = item.reportMark ?? item.reportMarks ?? item.labReport ?? 0;
      const viv = item.vivaMark ?? item.vivaMarks ?? item.labViva ?? 0;
      const t = item.testMark ?? item.testMarks ?? item.labTest ?? 0;
      const oe = item.openEndedMark ?? item.openEndedMarks ?? item.openEnded ?? 'A';
      const att = item.attendanceMark ?? item.attendanceMarks ?? item.attendance ?? 0;
      const tot = item.totalMark ?? item.totalMarks ?? item.total ?? (Number(q) + Number(rep) + Number(viv) + Number(t) + (oe === 'A' ? 0 : Number(oe)) + Number(att));
      const grade = item.grade || 'F';
      const gp = item.gradePoint !== undefined ? item.gradePoint : 0.00;

      const r = [idx + 1, roll];
      if (includeName) r.push(name);
      r.push(q, rep, viv, t, oe, att, tot);
      if (includeGrade) r.push(grade);
      if (includeGP) r.push(gp);
      rows.push(r);
    });
  } else {
    // ──────────────── SIDE BY SIDE 2-COLUMN TABLE (XLSX) ────────────────
    const halfCount = Math.max(1, Math.ceil(sorted.length / 2));
    const leftGroup = sorted.slice(0, halfCount);
    const rightGroup = sorted.slice(halfCount);

    // Header Row 1: Column Names
    rows.push([
      'Roll', 'Quiz', 'Lab Report', 'Lab Viva', 'Lab Test', 'Open Ended', 'Atnd.', 'Total',
      '', // divider
      'Roll', 'Quiz', 'Lab Report', 'Lab Viva', 'Lab Test', 'Open Ended', 'Atnd.', 'Total'
    ]);

    // Header Row 2: Max marks in brackets
    rows.push([
      '', `[${crit.quiz}]`, `[${crit.labReport}]`, `[${crit.labViva}]`, `[${crit.labTest}]`, `[${crit.openEnded}]`, `[${crit.attendance}]`, `[${effectiveMaxMarks}]`,
      '',
      '', `[${crit.quiz}]`, `[${crit.labReport}]`, `[${crit.labViva}]`, `[${crit.labTest}]`, `[${crit.openEnded}]`, `[${crit.attendance}]`, `[${effectiveMaxMarks}]`
    ]);

    for (let i = 0; i < halfCount; i++) {
      const l = leftGroup[i];
      const r = rightGroup[i];

      const getRowCells = (item) => {
        if (!item) return ['', '', '', '', '', '', '', ''];
        const roll = item.student?.rollNumber || item.rollNumber || item.roll || '';
        const q = item.quizMark ?? item.quizMarks ?? item.quiz ?? 0;
        const rep = item.reportMark ?? item.reportMarks ?? item.labReport ?? 0;
        const viv = item.vivaMark ?? item.vivaMarks ?? item.labViva ?? 0;
        const t = item.testMark ?? item.testMarks ?? item.labTest ?? 0;
        const oe = item.openEndedMark ?? item.openEndedMarks ?? item.openEnded ?? 'A';
        const att = item.attendanceMark ?? item.attendanceMarks ?? item.attendance ?? 0;
        const tot = item.totalMark ?? item.totalMarks ?? item.total ?? (Number(q) + Number(rep) + Number(viv) + Number(t) + (oe === 'A' ? 0 : Number(oe)) + Number(att));

        return [roll, q, rep, viv, t, oe, att, tot];
      };

      rows.push([...getRowCells(l), '', ...getRowCells(r)]);
    }
  }

  // Footer spacing and signature blocks
  rows.push([]);
  rows.push([]);
  rows.push([
    '', '---------------------------------------', '', '', '', '', '', '',
    '',
    '', '---------------------------------------'
  ]);
  rows.push([
    '', teacher.name, '', '', '', '', '', '',
    '',
    '', 'Head of Department'
  ]);
  rows.push([
    '', teacher.designation || 'Assistant Professor', '', '', '', '', '', '',
    '',
    '', `Dept. of ${department}, RUET`
  ]);
  rows.push([
    '', `Dept. of ${department}, RUET`, '', '', '', '', '', '',
    '',
    '', 'Rajshahi University of Engineering & Technology'
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Merges for centered institutional headers
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 16 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 16 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 16 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 16 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 16 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 16 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Lab Marks');
  const cleanFileCode = courseCode.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `RUET_${cleanFileCode}_Marks_${series}Series.xlsx`);
};


/**
 * Generate Student Semester Academic Transcript / Grade Report PDF
 */
export const generateStudentAcademicTranscriptPDF = async ({
  student,
  semester = '3-2',
  session = '2024-2025',
  courses = []
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoBase64 = await loadLogoBase64();

  let startY = 14;

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 14, startY, 20, 20);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('RAJSHAHI UNIVERSITY OF ENGINEERING & TECHNOLOGY', 38, startY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Office of the Controller of Examinations', 38, startY + 9);
  doc.setFont('helvetica', 'bold');
  doc.text(`SEMESTER GRADE & COURSE REPORT — ${semester} SEMESTER`, 38, startY + 14);

  startY += 26;

  // Student Info Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, 182, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Student Name:`, 18, startY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${student.name}`, 44, startY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text(`Roll Number:`, 120, startY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${student.rollNumber}`, 145, startY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text(`Department:`, 18, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${student.department}`, 44, startY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text(`Series:`, 120, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${student.series} Series`, 145, startY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text(`Semester:`, 18, startY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`${semester}`, 44, startY + 18);

  doc.setFont('helvetica', 'bold');
  doc.text(`Session:`, 120, startY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`${session}`, 145, startY + 18);

  startY += 28;

  // Course & Result Table
  const tableHead = [[
    'SL',
    'Course Code',
    'Course Title',
    'Type',
    'Credit',
    'Course Teacher',
    'Grade',
    'Grade Point'
  ]];

  let totalCredits = 0;
  let totalGradePoints = 0;

  const tableBody = courses.map((c, i) => {
    const cred = Number(c.credit) || 1.5;
    const gp = c.gradePoint !== null && c.gradePoint !== undefined ? Number(c.gradePoint) : null;
    if (gp !== null) {
      totalCredits += cred;
      totalGradePoints += (gp * cred);
    }
    return [
      (i + 1).toString().padStart(2, '0'),
      c.courseCode,
      c.courseName,
      c.courseType || (c.isSessional ? 'Sessional' : 'Theory'),
      cred.toFixed(2),
      c.teacher?.name || 'Assigned Faculty',
      c.grade || (c.detailedMarks?.grade || '—'),
      gp !== null ? gp.toFixed(2) : '—'
    ];
  });

  const sgpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : 'N/A';

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.15
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', fontStyle: 'bold', cellWidth: 24 },
      2: { halign: 'left', cellWidth: 54 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'left', cellWidth: 36 },
      6: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
      7: { halign: 'center', fontStyle: 'bold', cellWidth: 18 }
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  const tableFinalY = doc.lastAutoTable.finalY + 8;

  // SGPA Summary Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, tableFinalY, 182, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Semester GPA (SGPA):  ${sgpa}`, 20, tableFinalY + 9);
  doc.text(`Total Credits Completed:  ${totalCredits.toFixed(2)}`, 110, tableFinalY + 9);

  // Signatures
  const sigY = tableFinalY + 36;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('_____________________________________', 20, sigY);
  doc.text('Prepared & Verified By', 20, sigY + 5);

  doc.text('_____________________________________', 125, sigY);
  doc.text('Controller of Examinations / Head of Dept.', 125, sigY + 5);
  doc.text('RUET, Rajshahi-6204', 125, sigY + 9);

  doc.save(`RUET_Transcript_${student.rollNumber}_${semester}.pdf`);
};

/**
 * Generate RUET Department Course Allocation Report (PDF)
 */
export const generateRUETDepartmentCourseReportPDF = async ({
  departmentCode = 'ETE',
  departmentName = 'Electronics & Telecommunication Engineering',
  facultyName = 'Faculty of Electrical & Computer Engineering',
  academicSession = '2024-2025',
  courses = []
}) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logoBase64 = await loadLogoBase64();

  let startY = 12;

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 14, startY, 18, 18);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('RAJSHAHI UNIVERSITY OF ENGINEERING & TECHNOLOGY (RUET)', 148, startY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(facultyName || 'Faculty of Electrical & Computer Engineering', 148, startY + 9, { align: 'center' });
  doc.text(`Department of ${departmentName} (${departmentCode})`, 148, startY + 14, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(180, 83, 9);
  doc.text(`SESSIONAL COURSE CATALOG & TEACHER ASSIGNMENT ROSTER [${academicSession}]`, 148, startY + 20, { align: 'center' });

  const tableData = courses.map((c, idx) => [
    idx + 1,
    c.courseCode,
    c.courseName || c.title,
    'Sessional',
    'Laboratory / Practical',
    c.credits ? Number(c.credits).toFixed(2) : '3.00',
    c.semesterLevel || c.semester || '3-2',
    c.assignedTeacher ? `${c.assignedTeacher.name} (${c.assignedTeacher.teacherId})` : 'Unassigned',
    c.isAssigned ? 'ASSIGNED' : 'PENDING'
  ]);

  autoTable(doc, {
    startY: startY + 24,
    head: [['SL', 'Course Code', 'Course Title', 'Type', 'Format', 'Credits', 'Semester', 'Assigned Teacher', 'Status']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.15
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', fontStyle: 'bold', cellWidth: 24 },
      2: { halign: 'left', cellWidth: 70 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 24 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', cellWidth: 18 },
      7: { halign: 'left', cellWidth: 62 },
      8: { halign: 'center', fontStyle: 'bold', cellWidth: 24 }
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  const finalY = doc.lastAutoTable.finalY + 16;
  const pageHeight = doc.internal.pageSize.getHeight();
  const sigY = finalY > pageHeight - 25 ? pageHeight - 15 : finalY;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('_____________________________________', 24, sigY);
  doc.text('Course Coordinator / Allocation Committee', 24, sigY + 5);

  doc.text('_____________________________________', 210, sigY);
  doc.text(`Head of Department (${departmentCode})`, 210, sigY + 5);
  doc.text('RUET, Rajshahi-6204', 210, sigY + 9);

  doc.save(`RUET_${departmentCode}_Course_Allocation_${academicSession}.pdf`);
};

/**
 * Generate RUET Department Course Allocation Report (XLSX)
 */
export const generateRUETDepartmentCourseReportXLSX = ({
  departmentCode = 'ETE',
  departmentName = 'Electronics & Telecommunication Engineering',
  facultyName = 'Faculty of Electrical & Computer Engineering',
  academicSession = '2024-2025',
  courses = []
}) => {
  const wb = XLSX.utils.book_new();

  const rows = [
    ['RAJSHAHI UNIVERSITY OF ENGINEERING & TECHNOLOGY (RUET)'],
    [facultyName || 'Faculty of Electrical & Computer Engineering'],
    [`Department of ${departmentName} (${departmentCode})`],
    [`SESSIONAL COURSE CATALOG & TEACHER ALLOCATION [${academicSession}]`],
    [],
    ['SL', 'Course Code', 'Course Title', 'Course Type', 'Format', 'Credits', 'Semester', 'Assigned Teacher', 'Teacher ID', 'Status']
  ];

  courses.forEach((c, idx) => {
    rows.push([
      idx + 1,
      c.courseCode,
      c.courseName || c.title,
      'Sessional',
      'Laboratory / Practical',
      c.credits ? Number(c.credits).toFixed(2) : '3.00',
      c.semesterLevel || c.semester || '3-2',
      c.assignedTeacher?.name || 'Unassigned',
      c.assignedTeacher?.teacherId || 'N/A',
      c.isAssigned ? 'Assigned' : 'Unassigned'
    ]);
  });

  rows.push([]);
  rows.push([]);
  rows.push(['___________________________', '', '', '', '', '', '___________________________']);
  rows.push(['Course Allocation Committee', '', '', '', '', '', `Head, Department of ${departmentCode}`]);
  rows.push(['RUET, Rajshahi', '', '', '', '', '', 'RUET, Rajshahi']);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 38 },
    { wch: 12 },
    { wch: 16 },
    { wch: 10 },
    { wch: 12 },
    { wch: 28 },
    { wch: 14 },
    { wch: 14 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, `${departmentCode} Courses`);
  XLSX.writeFile(wb, `RUET_${departmentCode}_Courses_${academicSession}.xlsx`);
};
