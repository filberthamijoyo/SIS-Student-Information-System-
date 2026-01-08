type Semester = 'FALL' | 'SPRING' | 'SUMMER';

/**
 * Formats a semester enum value to its display name
 * @param semester - The semester enum value (FALL, SPRING, SUMMER)
 * @returns The formatted semester name (Term 1, Term 2, Summer)
 */
export function formatSemester(semester: Semester | string): string {
  switch (semester) {
    case 'FALL':
      return 'Term 1';
    case 'SPRING':
      return 'Term 2';
    case 'SUMMER':
      return 'Summer';
    default:
      return semester;
  }
}

/**
 * Formats a semester and year into a display string
 * @param semester - The semester enum value
 * @param year - The year
 * @returns Formatted string like "Term 1 2024"
 */
export function formatSemesterYear(semester: Semester | string, year: number): string {
  return `${formatSemester(semester)} ${year}`;
}

/**
 * Formats a term string (e.g., "FALL 2024" or "SPRING 2025") to display format
 * @param termString - The term string in format "SEMESTER YEAR"
 * @returns Formatted string like "Term 1 2024"
 */
export function formatTermString(termString: string): string {
  const parts = termString.split(' ');
  if (parts.length >= 2) {
    const semester = parts[0];
    const year = parts.slice(1).join(' '); // Handle cases where year might have spaces
    return `${formatSemester(semester)} ${year}`;
  }
  return termString; // Return as-is if format is unexpected
}

/**
 * Gets the semester order for sorting (FALL=1, SPRING=2, SUMMER=3)
 * @param semester - The semester string
 * @returns Numeric order value
 */
function getSemesterOrder(semester: string): number {
  const upperSemester = semester.toUpperCase();
  if (upperSemester === 'FALL') return 1;
  if (upperSemester === 'SPRING') return 2;
  if (upperSemester === 'SUMMER') return 3;
  return 99; // Unknown semesters go last
}

/**
 * Extracts year from a term string (e.g., "FALL 2024" -> 2024)
 * @param termString - The term string in format "SEMESTER YEAR"
 * @returns The year as a number, or 0 if not found
 */
function extractYear(termString: string): number {
  const parts = termString.split(' ');
  if (parts.length >= 2) {
    const yearStr = parts[parts.length - 1]; // Last part should be the year
    const year = parseInt(yearStr, 10);
    return isNaN(year) ? 0 : year;
  }
  return 0;
}

/**
 * Sorts term strings chronologically (by year, then by semester)
 * @param termA - First term string (e.g., "FALL 2024")
 * @param termB - Second term string (e.g., "SPRING 2024")
 * @returns Comparison result for sorting
 */
export function sortTermsChronologically(termA: string, termB: string): number {
  const yearA = extractYear(termA);
  const yearB = extractYear(termB);
  
  // First sort by year
  if (yearA !== yearB) {
    return yearA - yearB;
  }
  
  // If same year, sort by semester order
  const partsA = termA.split(' ');
  const partsB = termB.split(' ');
  const semesterA = partsA[0] || '';
  const semesterB = partsB[0] || '';
  
  return getSemesterOrder(semesterA) - getSemesterOrder(semesterB);
}

