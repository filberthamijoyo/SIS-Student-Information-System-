import { pool } from '../config/database';
import { TimeSlot } from '../types/course.types';
import { EnrollmentConflict, EnrollmentValidationResult } from '../types/enrollment.types';

const isSchedulableSlot = (slot: TimeSlot): boolean => {
  if (!slot.type) {
    return true;
  }
  const normalized = slot.type.toUpperCase();
  return normalized === 'LECTURE' || normalized === 'TUTORIAL';
};

export const doTimeSlotsOverlap = (
  slot1: TimeSlot,
  slot2: TimeSlot
): boolean => {
  if (!isSchedulableSlot(slot1) || !isSchedulableSlot(slot2)) {
    return false;
  }

  // Check if they are on the same day
  if (slot1.day_of_week !== slot2.day_of_week) {
    return false;
  }

  // Convert time strings to minutes for easier comparison
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const slot1Start = timeToMinutes(slot1.start_time);
  const slot1End = timeToMinutes(slot1.end_time);
  const slot2Start = timeToMinutes(slot2.start_time);
  const slot2End = timeToMinutes(slot2.end_time);

  // Check for overlap
  return (
    (slot1Start < slot2End && slot1End > slot2Start) ||
    (slot2Start < slot1End && slot2End > slot1Start)
  );
};

/**
 * Check for time conflicts with student's existing enrollments
 */
export const checkTimeConflicts = async (
  studentId: number,
  courseId: number
): Promise<EnrollmentConflict[]> => {
  const conflicts: EnrollmentConflict[] = [];

  try {
    // Get time slots for the course to be enrolled in
    const newCourseSlots = await pool.query(
      'SELECT * FROM time_slots WHERE course_id = $1',
      [courseId]
    );

    // Get student's currently enrolled courses and their time slots
    const enrolledCourses = await pool.query(
      `SELECT c.id, c.course_code, c.course_name, ts.*
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       JOIN time_slots ts ON c.id = ts.course_id
       WHERE e.student_id = $1 AND e.status = 'enrolled'`,
      [studentId]
    );

    // Check each new time slot against existing time slots
    for (const newSlot of newCourseSlots.rows) {
      for (const existingSlot of enrolledCourses.rows) {
        if (doTimeSlotsOverlap(newSlot, existingSlot)) {
          conflicts.push({
            type: 'time_conflict',
            message: `Time conflict with ${existingSlot.course_code} on ${newSlot.day_of_week}`,
            conflicting_course_id: existingSlot.id,
            conflicting_course_code: existingSlot.course_code,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error checking time conflicts:', error);
  }

  return conflicts;
};

/**
 * Check if student has completed prerequisites for a course
 */
export const checkPrerequisites = async (
  studentId: number,
  courseId: number
): Promise<EnrollmentConflict[]> => {
  const conflicts: EnrollmentConflict[] = [];

  try {
    // Get course prerequisites
    const courseResult = await pool.query(
      'SELECT prerequisites FROM courses WHERE id = $1',
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return conflicts;
    }

    const prerequisites = courseResult.rows[0].prerequisites;

    if (!prerequisites) {
      return conflicts;
    }

    // Parse prerequisites (assuming it's stored as JSON array of course codes)
    const prereqCodes: string[] = typeof prerequisites === 'string'
      ? JSON.parse(prerequisites)
      : prerequisites;

    if (prereqCodes.length === 0) {
      return conflicts;
    }

    // Get student's completed courses (with passing grades)
    const completedCourses = await pool.query(
      `SELECT c.course_code
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.student_id = $1
         AND e.status = 'enrolled'
         AND e.grade IS NOT NULL
         AND e.grade NOT IN ('F', 'NP')`,
      [studentId]
    );

    const completedCourseCodes = completedCourses.rows.map(row => row.course_code);

    // Check for missing prerequisites
    const missingPrereqs = prereqCodes.filter(
      prereq => !completedCourseCodes.includes(prereq)
    );

    if (missingPrereqs.length > 0) {
      conflicts.push({
        type: 'prerequisite_missing',
        message: `Missing prerequisites: ${missingPrereqs.join(', ')}`,
        missing_prerequisites: missingPrereqs,
      });
    }
  } catch (error) {
    console.error('Error checking prerequisites:', error);
  }

  return conflicts;
};

/**
 * Check if student has exceeded credit limit
 */
export const checkCreditLimit = async (
  studentId: number,
  courseId: number,
  maxCredits: number = 18
): Promise<EnrollmentConflict[]> => {
  const conflicts: EnrollmentConflict[] = [];

  try {
    // Get credits for the new course
    const courseResult = await pool.query(
      'SELECT credits FROM courses WHERE id = $1',
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return conflicts;
    }

    const newCourseCredits = courseResult.rows[0].credits;

    // Calculate student's current enrolled credits
    const currentCreditsResult = await pool.query(
      `SELECT COALESCE(SUM(c.credits), 0) as total_credits
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.student_id = $1 AND e.status = 'enrolled'`,
      [studentId]
    );

    const currentCredits = parseInt(currentCreditsResult.rows[0].total_credits);
    const totalCredits = currentCredits + newCourseCredits;

    if (totalCredits > maxCredits) {
      conflicts.push({
        type: 'credit_limit_exceeded',
        message: `Credit limit exceeded. Current: ${currentCredits}, Adding: ${newCourseCredits}, Max: ${maxCredits}`,
        current_credits: currentCredits,
        max_credits: maxCredits,
      });
    }
  } catch (error) {
    console.error('Error checking credit limit:', error);
  }

  return conflicts;
};

/**
 * Check if student is already enrolled in the course
 */
export const checkAlreadyEnrolled = async (
  studentId: number,
  courseId: number
): Promise<EnrollmentConflict[]> => {
  const conflicts: EnrollmentConflict[] = [];

  try {
    const result = await pool.query(
      `SELECT status FROM enrollments
       WHERE student_id = $1 AND course_id = $2
         AND status IN ('enrolled', 'waitlisted', 'pending')`,
      [studentId, courseId]
    );

    if (result.rows.length > 0) {
      conflicts.push({
        type: 'already_enrolled',
        message: `Already ${result.rows[0].status} in this course`,
      });
    }
  } catch (error) {
    console.error('Error checking enrollment status:', error);
  }

  return conflicts;
};

/**
 * Check if course is full
 */
export const checkCourseFull = async (
  courseId: number
): Promise<EnrollmentConflict[]> => {
  const conflicts: EnrollmentConflict[] = [];

  try {
    const result = await pool.query(
      `SELECT current_enrollment, max_enrollment
       FROM courses
       WHERE id = $1`,
      [courseId]
    );

    if (result.rows.length === 0) {
      return conflicts;
    }

    const { current_enrollment, max_enrollment } = result.rows[0];

    if (current_enrollment >= max_enrollment) {
      conflicts.push({
        type: 'course_full',
        message: 'Course is full. You will be added to the waitlist.',
      });
    }
  } catch (error) {
    console.error('Error checking course capacity:', error);
  }

  return conflicts;
};

/**
 * Comprehensive enrollment validation
 * Checks all possible conflicts and returns validation result
 */
export const validateEnrollment = async (
  studentId: number,
  courseId: number
): Promise<EnrollmentValidationResult> => {
  const allConflicts: EnrollmentConflict[] = [];

  // Run all validation checks
  const [
    alreadyEnrolledConflicts,
    timeConflicts,
    prerequisiteConflicts,
    creditLimitConflicts,
    courseFullConflicts,
  ] = await Promise.all([
    checkAlreadyEnrolled(studentId, courseId),
    checkTimeConflicts(studentId, courseId),
    checkPrerequisites(studentId, courseId),
    checkCreditLimit(studentId, courseId),
    checkCourseFull(courseId),
  ]);

  // Combine all conflicts
  allConflicts.push(
    ...alreadyEnrolledConflicts,
    ...timeConflicts,
    ...prerequisiteConflicts,
    ...creditLimitConflicts
  );

  // Course being full is a warning, not a blocking conflict
  const warnings: string[] = [];
  if (courseFullConflicts.length > 0) {
    warnings.push(...courseFullConflicts.map(c => c.message));
  }

  return {
    valid: allConflicts.length === 0,
    conflicts: allConflicts,
    warnings,
  };
};
