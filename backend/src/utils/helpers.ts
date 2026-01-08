import { PaginationMeta, PaginationQuery } from '../types/api.types';

/**
 * Calculate pagination metadata
 */
export const calculatePagination = (
  page: number,
  limit: number,
  total: number
): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

/**
 * Parse pagination query parameters
 */
export const parsePaginationQuery = (query: any): PaginationQuery => {
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100); // Max 100 items per page
  const sortBy = query.sortBy || 'created_at';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  return {
    page: Math.max(page, 1),
    limit,
    sortBy,
    sortOrder,
  };
};

/**
 * Format date to ISO string
 */
export const formatDate = (date: Date): string => {
  return date.toISOString();
};

/**
 * Get current timestamp
 */
export const getCurrentTimestamp = (): Date => {
  return new Date();
};

/**
 * Check if enrollment period is active
 */
export const isEnrollmentPeriodActive = (): boolean => {
  const now = new Date();
  const startDate = new Date(process.env.ENROLLMENT_START_DATE || '2024-01-01');
  const endDate = new Date(process.env.ENROLLMENT_END_DATE || '2024-12-31');

  return now >= startDate && now <= endDate;
};

/**
 * Generate random string for tokens
 */
export const generateRandomString = (length: number = 32): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
};

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Convert time string to minutes since midnight
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes since midnight to time string
 */
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
};

/**
 * Calculate time difference in minutes
 */
export const timeDifferenceInMinutes = (startTime: string, endTime: string): number => {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
};

/**
 * Format course code (e.g., "CSC3170" -> "CSC 3170")
 */
export const formatCourseCode = (code: string): string => {
  const match = code.match(/([A-Z]+)(\d+)/);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  return code;
};

/**
 * Sleep/delay function for async operations
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry async function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError!;
};

/**
 * Remove sensitive data from user object
 */
export const removeSensitiveData = <T extends Record<string, any>>(
  obj: T,
  sensitiveFields: string[] = ['password', 'password_hash', 'token']
): Partial<T> => {
  const cleaned = { ...obj };

  sensitiveFields.forEach(field => {
    delete cleaned[field];
  });

  return cleaned;
};

/**
 * Check if value is a valid integer
 */
export const isValidInteger = (value: any): boolean => {
  return Number.isInteger(Number(value)) && !isNaN(value);
};

/**
 * Normalize string for search (lowercase, trim, remove extra spaces)
 */
export const normalizeSearchString = (str: string): string => {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
};

/**
 * Get semester name from month
 */
export const getSemesterFromMonth = (month: number): string => {
  if (month >= 8 && month <= 12) return 'Fall';
  if (month >= 1 && month <= 5) return 'Spring';
  return 'Summer';
};

/**
 * Get current semester and year
 * Returns { semester: 'FALL' | 'SPRING' | 'SUMMER', year: number }
 */
export const getCurrentTerm = (): { semester: 'FALL' | 'SPRING' | 'SUMMER'; year: number } => {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  
  let semester: 'FALL' | 'SPRING' | 'SUMMER';
  let academicYear: number;
  
  if (month >= 8 && month <= 12) {
    // Fall semester (Aug-Dec) - belongs to the current year
    semester = 'FALL';
    academicYear = year;
  } else if (month >= 1 && month <= 5) {
    // Spring semester (Jan-May) - belongs to the previous calendar year
    semester = 'SPRING';
    academicYear = year;
  } else {
    // Summer semester (Jun-Jul) - belongs to the previous calendar year
    semester = 'SUMMER';
    academicYear = year;
  }
  
  return { semester, year: academicYear };
};

/**
 * Calculate GPA from grades
 */
export const calculateGPA = (grades: string[]): number => {
  const gradePoints: { [key: string]: number } = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D': 1.0, 'F': 0.0,
  };

  if (grades.length === 0) return 0.0;

  const totalPoints = grades.reduce((sum, grade) => {
    return sum + (gradePoints[grade] || 0);
  }, 0);

  return Number((totalPoints / grades.length).toFixed(2));
};

/**
 * Chunk array into smaller arrays
 */
export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
};
