/**
 * RUET Official Grading System Utility
 */
export const calculateRUETGrade = (marks, maxMarks = 65) => {
  if (marks === null || marks === undefined || isNaN(marks)) {
    return { grade: 'F', gradePoint: 0.00 };
  }

  const percentage = (marks / maxMarks) * 100;

  if (percentage >= 80) return { grade: 'A+', gradePoint: 4.00 };
  if (percentage >= 75) return { grade: 'A',  gradePoint: 3.75 };
  if (percentage >= 70) return { grade: 'A-', gradePoint: 3.50 };
  if (percentage >= 65) return { grade: 'B+', gradePoint: 3.25 };
  if (percentage >= 60) return { grade: 'B',  gradePoint: 3.00 };
  if (percentage >= 55) return { grade: 'B-', gradePoint: 2.75 };
  if (percentage >= 50) return { grade: 'C+', gradePoint: 2.50 };
  if (percentage >= 45) return { grade: 'C',  gradePoint: 2.25 };
  if (percentage >= 40) return { grade: 'D',  gradePoint: 2.00 };
  return { grade: 'F', gradePoint: 0.00 };
};
