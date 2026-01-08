/**
 * Enrollment Status Type
 */
export type EnrollmentStatus = 'enrolled' | 'waitlisted' | 'dropped' | 'pending';

/**
 * Grade Type
 */
export type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F' | 'P' | 'NP' | null;

/**
 * Enrollment Interface - Represents a student's enrollment in a course
 */
export interface Enrollment {
  id: number;
  student_id: number;
  course_id: number;
  status: EnrollmentStatus;
  enrolled_at: Date;
  dropped_at?: Date;
  waitlist_position?: number;
  grade?: Grade;
  created_at: Date;
  updated_at: Date;
}

/**
 * Enrollment with Course Details
 */
export interface EnrollmentWithCourse extends Enrollment {
  course_code: string;
  course_name: string;
  credits: number;
  semester: string;
  year: number;
  instructor_name: string;
}

/**
 * Enrollment with Student Details
 */
export interface EnrollmentWithStudent extends Enrollment {
  student_email: string;
  student_first_name: string;
  student_last_name: string;
  student_number: string;
  major?: string;
}

/**
 * Enrollment Request
 */
export interface EnrollmentRequest {
  course_id: number;
}

/**
 * Enrollment Response
 */
export interface EnrollmentResponse {
  success: boolean;
  message: string;
  data?: {
    enrollment: Enrollment;
    status: EnrollmentStatus;
    waitlist_position?: number;
    queue_position?: number;
  };
}

/**
 * Drop Course Request
 */
export interface DropCourseRequest {
  course_id: number;
  reason?: string;
}

/**
 * Batch Enrollment Request
 */
export interface BatchEnrollmentRequest {
  course_ids: number[];
}

/**
 * Enrollment Conflict
 */
export interface EnrollmentConflict {
  type: 'time_conflict' | 'prerequisite_missing' | 'credit_limit_exceeded' | 'already_enrolled' | 'course_full';
  message: string;
  conflicting_course_id?: number;
  conflicting_course_code?: string;
  missing_prerequisites?: string[];
  current_credits?: number;
  max_credits?: number;
}

/**
 * Enrollment Validation Result
 */
export interface EnrollmentValidationResult {
  valid: boolean;
  conflicts: EnrollmentConflict[];
  warnings?: string[];
}

/**
 * Student Enrollment Summary
 */
export interface StudentEnrollmentSummary {
  student_id: number;
  total_enrolled: number;
  total_credits: number;
  total_waitlisted: number;
  semester: string;
  year: number;
  enrollments: EnrollmentWithCourse[];
}

/**
 * Waitlist Entry
 */
export interface WaitlistEntry {
  id: number;
  student_id: number;
  course_id: number;
  position: number;
  added_at: Date;
  student_name: string;
  student_email: string;
}

/**
 * Grade Assignment Request
 */
export interface GradeAssignmentRequest {
  enrollment_id: number;
  grade: Grade;
}

/**
 * Enrollment Queue Job Data
 */
export interface EnrollmentQueueJobData {
  student_id: number;
  course_id: number;
  enrollment_id?: number;
  attempt: number;
  timestamp: Date;
}
