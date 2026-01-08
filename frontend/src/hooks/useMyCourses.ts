import { useQuery } from '@tanstack/react-query';
import { enrollmentAPI } from '../services/api';

export interface NormalizedTimeSlot {
  id?: number;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  type?: string;
}

export interface NormalizedCourse {
  id: number;
  code: string;
  name: string;
  credits: number;
  department: string;
  semester?: string;
  year?: number;
  instructor?: string | null;
  timeSlots: NormalizedTimeSlot[];
}

export interface NormalizedEnrollment {
  id: number;
  status: string;
  course: NormalizedCourse;
}

interface UseMyCoursesOptions {
  currentTermOnly?: boolean;
  enabled?: boolean;
}

function normalizeEnrollment(raw: any): NormalizedEnrollment {
  const course = raw.courses ?? {};
  return {
    id: raw.id,
    status: raw.status,
    course: {
      id: course.id,
      code: course.course_code,
      name: course.course_name,
      credits: course.credits,
      department: course.department,
      semester: course.semester,
      year: course.year,
      instructor: course.users?.full_name ?? null,
      timeSlots: (course.time_slots ?? []).map((slot: any) => ({
        id: slot.id,
        dayOfWeek: slot.day_of_week,
        startTime: slot.start_time,
        endTime: slot.end_time,
        location: slot.location,
        type: slot.type,
      })),
    },
  };
}

export function useMyCourses(options: UseMyCoursesOptions = {}) {
  const { currentTermOnly = false, enabled = true } = options;

  return useQuery<NormalizedEnrollment[]>({
    queryKey: ['my-courses', currentTermOnly ? 'current' : 'all'],
    enabled,
    queryFn: async () => {
      const response = await enrollmentAPI.getMyCourses(currentTermOnly);
      const enrollments = response.data.data ?? [];
      return enrollments.map(normalizeEnrollment);
    },
  });
}







