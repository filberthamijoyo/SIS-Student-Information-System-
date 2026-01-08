// Academic Calendar Types
export interface AcademicEvent {
  id: number;
  event_type: string;
  term: 'FALL' | 'SPRING' | 'SUMMER';
  year: number;
  start_date: string;
  end_date?: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface AddDropStatus {
  isOpen: boolean;
  period: AcademicEvent | null;
}

// Add/Drop Types
export interface AddDropRequest {
  id: number;
  student_id: number;
  course_id: number;
  request_type: 'ADD' | 'DROP';
  request_date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
  approved_by?: number;
  approved_date?: string;
  rejection_reason?: string;
  is_late_request: boolean;
  created_at?: string;
  // Joined fields from course
  course_name?: string;
  course_code?: string;
  department?: string;
  credits?: number;
  semester?: string;
  year?: number;
  // Additional joined fields
  approver_name?: string;
  student_name?: string;
  major?: string;
  year_level?: number;
}

export interface SubmitRequestData {
  student_id: number;
  course_id: number;
  request_type: 'ADD' | 'DROP';
  reason: string;
  is_late_request?: boolean;
}

export interface ApproveRequestData {
  approved_by: number;
}

export interface RejectRequestData {
  approved_by: number;
  rejection_reason: string;
}

// Major Change Types
export interface MajorChangeRequest {
  id: number;
  student_id: number;
  current_major?: string;
  requested_major: string;
  current_school?: string;
  requested_school: string;
  gpa: number;
  units_completed: number;
  request_date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  supporting_documents?: string;
  approval_decision?: string;
  decision_date?: string;
  created_at?: string;
  // Additional joined fields
  student_name?: string;
  student_email?: string;
  year_level?: number;
  approver_name?: string;
}

export interface SubmitMajorChangeData {
  student_id: number;
  requested_major: string;
  requested_school: string;
  gpa: number;
  units_completed: number;
  supporting_documents?: string;
}

export interface DecideMajorChangeData {
  status: 'APPROVED' | 'REJECTED';
  approval_decision: string;
  approver_id: number;
}

// Course Evaluation Types
export interface CourseEvaluation {
  id: number;
  student_id: number;
  course_id: number;
  term: 'FALL' | 'SPRING' | 'SUMMER';
  year: number;
  overall_rating: number;
  instructor_rating: number;
  course_content_rating: number;
  workload_rating: number;
  comments?: string;
  is_anonymous: boolean;
  submitted_at: string;
  created_at?: string;
  // Joined fields
  course_code?: string;
  course_name?: string;
  department?: string;
}

export interface CourseStats {
  course: {
    course_code: string;
    course_name: string;
    department: string;
  };
  statistics: {
    total_responses: number;
    average_overall_rating: string;
    average_instructor_rating: string;
    average_course_content_rating: string;
    average_workload_rating: string;
  };
  comments: Array<{
    comments: string;
    submitted_at: string;
    student_name: string;
  }>;
}

export interface PendingEvaluation {
  id: number;
  course_code: string;
  course_name: string;
  department: string;
  semester: string;
  year: number;
  credits: number;
  instructor_name?: string;
}

export interface SubmitEvaluationData {
  student_id: number;
  course_id: number;
  term: 'FALL' | 'SPRING' | 'SUMMER';
  year: number;
  overall_rating: number;
  instructor_rating: number;
  course_content_rating: number;
  workload_rating: number;
  comments?: string;
  is_anonymous?: boolean;
}
