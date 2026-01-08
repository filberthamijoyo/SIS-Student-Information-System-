import { prisma } from '../config/prisma';
import { Prisma, Semester, CourseStatus } from '@prisma/client';

/**
 * Course Service
 * Handles course-related operations
 */

export interface CourseFilters {
  search?: string;
  department?: string;
  semester?: Semester;
  year?: number;
  credits?: number;
  status?: CourseStatus;
  availableOnly?: boolean;
}

/**
 * Get all courses with filters
 */
export async function getAllCourses(filters: CourseFilters = {}) {
  const where: Prisma.coursesWhereInput = {};

  // Build where clause
  if (filters.search) {
    where.OR = [
      { course_code: { contains: filters.search, mode: 'insensitive' } },
      { course_name: { contains: filters.search, mode: 'insensitive' } },
      { department: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  if (filters.department) {
    where.department = filters.department;
  }

  if (filters.semester) {
    where.semester = filters.semester;
  }

  if (filters.year) {
    where.year = filters.year;
  }

  if (filters.credits) {
    where.credits = filters.credits;
  }

  if (filters.status) {
    where.status = filters.status;
  } else {
    where.status = { in: [CourseStatus.ACTIVE, CourseStatus.FULL] };
  }

  // Note: availableOnly filter requires post-query filtering or raw SQL
  // Removed invalid Prisma syntax that was causing 500 errors

  const courses = await prisma.courses.findMany({
    where,
    include: {
      users: {
        select: {
          id: true,
          full_name: true,
          email: true
        }
      },
      time_slots: true,
      _count: {
        select: {
          enrollments: {
            where: {
              status: 'CONFIRMED'
            }
          }
        }
      }
    },
    orderBy: [
      { department: 'asc' },
      { course_code: 'asc' }
    ]
  });

  return courses;
}

/**
 * Get course by ID
 */
export async function getCourseById(id: number) {
  const course = await prisma.courses.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          full_name: true,
          email: true,
          department: true
        }
      },
      time_slots: true,
      enrollments: {
        where: {
          status: 'CONFIRMED'
        },
        select: {
          id: true,
          status: true,
          enrolled_at: true,
          users: {
            select: {
              user_identifier: true,
              full_name: true
            }
          }
        }
      }
    }
  });

  if (!course) {
    throw new Error('Course not found');
  }

  return course;
}

/**
 * Search courses
 */
export async function searchCourses(query: string) {
  const courses = await prisma.courses.findMany({
    where: {
      OR: [
        { course_code: { contains: query, mode: 'insensitive' } },
        { course_name: { contains: query, mode: 'insensitive' } },
        { department: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ],
      status: { in: [CourseStatus.ACTIVE, CourseStatus.FULL] }
    },
    include: {
      users: {
        select: {
          full_name: true
        }
      },
      time_slots: true
    },
    take: 50
  });

  return courses;
}

/**
 * Get departments
 */
export async function getDepartments() {
  const departments = await prisma.courses.findMany({
    select: {
      department: true
    },
    distinct: ['department'],
    orderBy: {
      department: 'asc'
    }
  });

  return departments.map((d: any) => d.department);
}

/**
 * Create course (admin only)
 */
export async function createCourse(data: any) {
  const course = await prisma.courses.create({
    data: {
      course_code: data.courseCode,
      course_name: data.courseName,
      department: data.department,
      credits: data.credits,
      max_capacity: data.maxCapacity,
      description: data.description,
      prerequisites: data.prerequisites,
      semester: data.semester,
      year: data.year,
      status: data.status || CourseStatus.ACTIVE,
      instructor_id: data.instructorId,
      updated_at: new Date(),
      time_slots: data.timeSlots ? {
        create: data.timeSlots.map((slot: any) => ({
          ...slot,
          type: (slot.type || 'LECTURE').toUpperCase()
        }))
      } : undefined
    },
    include: {
      users: {
        select: {
          full_name: true
        }
      },
      time_slots: true
    }
  });

  return course;
}

/**
 * Update course (admin only)
 */
export async function updateCourse(id: number, data: any) {
  const course = await prisma.courses.update({
    where: { id },
    data: {
      course_code: data.courseCode,
      course_name: data.courseName,
      department: data.department,
      credits: data.credits,
      max_capacity: data.maxCapacity,
      description: data.description,
      prerequisites: data.prerequisites,
      semester: data.semester,
      year: data.year,
      status: data.status,
      instructor_id: data.instructorId
    },
    include: {
      users: {
        select: {
          full_name: true
        }
      },
      time_slots: true
    }
  });

  return course;
}

/**
 * Delete course (admin only)
 */
export async function deleteCourse(id: number) {
  // Check if course has enrollments
  const enrollmentCount = await prisma.enrollments.count({
    where: {
      course_id: id,
      status: { in: ['CONFIRMED', 'WAITLISTED'] }
    }
  });

  if (enrollmentCount > 0) {
    throw new Error('Cannot delete course with active enrollments');
  }

  await prisma.courses.delete({
    where: { id }
  });

  return { success: true };
}
