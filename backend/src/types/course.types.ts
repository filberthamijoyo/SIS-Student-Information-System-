/**
 * Day of Week Type
 */
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

/**
 * Course Status Type
 */
export type CourseStatus = 'active' | 'inactive' | 'cancelled';

/**
 * Semester Type
 */
export type Semester = 'Fall' | 'Spring' | 'Summer';

/**
 * Time Slot Interface - Represents a specific meeting time for a course
 */
export interface TimeSlot {
  id: number;
  course_id: number;
  day_of_week: DayOfWeek;
  start_time: string; // Format: "HH:MM:SS"
  end_time: string;   // Format: "HH:MM:SS"
  location: string;
  type?: string;      // "LECTURE" or "TUTORIAL", defaults to "LECTURE"
  created_at: Date;
  updated_at: Date;
}

/**
 * Course Interface - Represents a course offering
 */
export interface Course {
  id: number;
  course_code: string;
  course_name: string;
  description: string;
  credits: number;
  instructor_id: number;
  department: string;
  semester: Semester;
  year: number;
  max_enrollment: number;
  current_enrollment: number;
  status: CourseStatus;
  prerequisites?: string; // JSON string of prerequisite course codes
  created_at: Date;
  updated_at: Date;
}

/**
 * Course with Time Slots - Course joined with its time slots
 */
export interface CourseWithSlots extends Course {
  time_slots: TimeSlot[];
  instructor_name?: string;
  instructor_email?: string;
}

/**
 * Course with Enrollment Info - Course with additional enrollment details
 */
export interface CourseWithEnrollmentInfo extends CourseWithSlots {
  is_full: boolean;
  available_seats: number;
  waitlist_count?: number;
}

/**
 * Course Create Request
 */
export interface CourseCreateRequest {
  course_code: string;
  course_name: string;
  description: string;
  credits: number;
  instructor_id: number;
  department: string;
  semester: Semester;
  year: number;
  max_enrollment: number;
  prerequisites?: string[];
  time_slots: TimeSlotCreateRequest[];
}

/**
 * Course Update Request
 */
export interface CourseUpdateRequest {
  course_name?: string;
  description?: string;
  max_enrollment?: number;
  status?: CourseStatus;
  prerequisites?: string[];
}

/**
 * Time Slot Create Request
 */
export interface TimeSlotCreateRequest {
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  location: string;
  type?: string; // "LECTURE" or "TUTORIAL", defaults to "LECTURE"
}

/**
 * Course Search Filters
 */
export interface CourseSearchFilters {
  department?: string;
  semester?: Semester;
  year?: number;
  instructor_id?: number;
  course_code?: string;
  course_name?: string;
  min_credits?: number;
  max_credits?: number;
  status?: CourseStatus;
  has_available_seats?: boolean;
}

/**
 * Course Statistics
 */
export interface CourseStatistics {
  course_id: number;
  course_code: string;
  course_name: string;
  total_enrolled: number;
  max_enrollment: number;
  enrollment_percentage: number;
  waitlist_count: number;
  drop_count: number;
}
