/**
 * RUET Standard Grading System Calculator
 */

function calculateRUETGrade(totalMarks, maxMarks = 65) {
  if (totalMarks === null || totalMarks === undefined || isNaN(totalMarks)) {
    return { grade: 'F', gradePoint: 0.00, percentage: 0 };
  }

  const effectiveMax = maxMarks > 0 ? maxMarks : 65;
  const percentage = (Number(totalMarks) / effectiveMax) * 100;
  const roundedPct = Math.round(percentage * 100) / 100;

  if (roundedPct >= 80) return { grade: 'A+', gradePoint: 4.00, percentage: roundedPct };
  if (roundedPct >= 75) return { grade: 'A',  gradePoint: 3.75, percentage: roundedPct };
  if (roundedPct >= 70) return { grade: 'A-', gradePoint: 3.50, percentage: roundedPct };
  if (roundedPct >= 65) return { grade: 'B+', gradePoint: 3.25, percentage: roundedPct };
  if (roundedPct >= 60) return { grade: 'B',  gradePoint: 3.00, percentage: roundedPct };
  if (roundedPct >= 55) return { grade: 'B-', gradePoint: 2.75, percentage: roundedPct };
  if (roundedPct >= 50) return { grade: 'C+', gradePoint: 2.50, percentage: roundedPct };
  if (roundedPct >= 45) return { grade: 'C',  gradePoint: 2.25, percentage: roundedPct };
  if (roundedPct >= 40) return { grade: 'D',  gradePoint: 2.00, percentage: roundedPct };
  return { grade: 'F', gradePoint: 0.00, percentage: roundedPct };
}

module.exports = { calculateRUETGrade };
