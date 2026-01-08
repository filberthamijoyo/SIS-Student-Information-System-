import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types/express.types';
import { CourseCreateRequest, CourseUpdateRequest } from '../types/course.types';
import { BadRequestError, NotFoundError, ConflictError } from '../middleware/errorHandler';
import { deleteCached, CACHE_KEYS } from '../config/redis';
import {
  Prisma,
  EnrollmentStatus,
  GradeStatus,
  StudentStatus,
  CourseStatus,
  Role,
  Semester,
  DayOfWeek,
} from '@prisma/client';

const getFirstQueryValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const parseIntegerParam = (value: string | string[] | undefined): number | undefined => {
  const raw = getFirstQueryValue(value);
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }

  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseSemesterParam = (value: string | string[] | undefined): Semester | undefined => {
  const raw = getFirstQueryValue(value)?.toUpperCase();
  if (!raw) {
    return undefined;
  }

  return (Object.values(Semester) as string[]).includes(raw) ? (raw as Semester) : undefined;
};

const safeJsonParse = (jsonString: string | null | undefined): any => {
  if (!jsonString) {
    return null;
  }
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing JSON:', error, 'String:', jsonString);
    return null;
  }
};

/**
 * ===================
 * COURSE MANAGEMENT
 * ===================
 */

/**
 * Create a new course
 * POST /api/admin/courses
 */
export const createCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      course_code,
      course_name,
      description,
      credits,
      instructor_id,
      department,
      semester,
      year,
      max_enrollment,
      prerequisites,
      time_slots,
    }: CourseCreateRequest = req.body;

    // Check if course code already exists for this semester/year
    const existing = await prisma.courses.findFirst({
      where: {
        course_code: course_code,
        semester: semester as Semester,
        year,
      },
    });

    if (existing) {
      throw new ConflictError('Course with this code already exists for the specified semester and year');
    }

    // Create course with time slots
    const course = await prisma.courses.create({
      data: {
        course_code: course_code,
        course_name: course_name,
        description,
        credits,
        instructor_id: instructor_id,
        department,
        semester: semester as Semester,
        year,
        max_capacity: max_enrollment,
        current_enrollment: 0,
        prerequisites: prerequisites ? JSON.stringify(prerequisites) : null,
        status: CourseStatus.ACTIVE,
        updated_at: new Date(),
        time_slots: {
          create: time_slots.map((slot) => ({
            day_of_week: slot.day_of_week as DayOfWeek,
            start_time: slot.start_time,
            end_time: slot.end_time,
            location: slot.location,
            type: (slot.type || 'LECTURE').toUpperCase(),
          })),
        },
      },
      include: {
        time_slots: true,
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get all courses with full details
 * GET /api/admin/courses
 */
export const getAllCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courses = await prisma.courses.findMany({
      include: {
        time_slots: true,
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
            user_identifier: true,
            department: true,
          },
        },
        _count: {
          select: {
            enrollments: {
              where: {
                status: EnrollmentStatus.CONFIRMED,
              },
            },
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { semester: 'asc' },
        { course_code: 'asc' },
      ],
    });

    // Format response
    const formatted = courses.map((course) => ({
      id: course.id,
      course_code: course.course_code,
      course_name: course.course_name,
      description: course.description,
      credits: course.credits,
      department: course.department,
      semester: course.semester,
      year: course.year,
      max_capacity: course.max_capacity,
      current_enrollment: course.current_enrollment,
      status: course.status,
      prerequisites: safeJsonParse(course.prerequisites),
      users: course.users
        ? {
            id: course.users.id,
            full_name: course.users.full_name,
            email: course.users.email,
            user_identifier: course.users.user_identifier,
            department: course.users.department,
          }
        : null,
      time_slots: course.time_slots.map((slot) => ({
        id: slot.id,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        location: slot.location,
        type: slot.type,
      })),
      enrollment_count: course._count.enrollments,
      created_at: course.created_at,
      updated_at: course.updated_at,
    }));

    res.status(200).json({
      success: true,
      message: 'Courses retrieved successfully',
      data: formatted,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Update course
 * PUT /api/admin/courses/:id
 */
export const updateCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates: CourseUpdateRequest = req.body;

    const updateData: any = {};

    if (updates.course_name) updateData.course_name = updates.course_name;
    if (updates.description) updateData.description = updates.description;
    if (updates.max_enrollment !== undefined) updateData.max_capacity = updates.max_enrollment;
    if (updates.status) updateData.status = updates.status as CourseStatus;
    if (updates.prerequisites) updateData.prerequisites = JSON.stringify(updates.prerequisites);

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('No fields to update');
    }

    const course = await prisma.courses.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        time_slots: true,
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    // Invalidate cache
    await deleteCached(`${CACHE_KEYS.COURSE}${id}`);

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Delete course (soft delete)
 * DELETE /api/admin/courses/:id
 */
export const deleteCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if course has active enrollments
    const enrollmentCount = await prisma.enrollments.count({
      where: {
        course_id: parseInt(id),
        status: EnrollmentStatus.CONFIRMED,
      },
    });

    if (enrollmentCount > 0) {
      throw new BadRequestError('Cannot delete course with active enrollments');
    }

    // Soft delete by updating status
      await prisma.courses.update({
      where: { id: parseInt(id) },
      data: { status: CourseStatus.INACTIVE },
    });

    // Invalidate cache
    await deleteCached(`${CACHE_KEYS.COURSE}${id}`);

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get course by ID with full details
 * GET /api/admin/courses/:id
 */
export const getCourseById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const course = await prisma.courses.findUnique({
      where: { id: parseInt(id) },
      include: {
        time_slots: true,
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
            user_identifier: true,
            department: true,
          },
        },
        enrollments: {
          where: {
            status: {
              in: [EnrollmentStatus.CONFIRMED, EnrollmentStatus.WAITLISTED],
            },
          },
          select: {
            id: true,
            status: true,
            enrolled_at: true,
            waitlist_position: true,
          },
        },
        _count: {
          select: {
            enrollments: {
              where: {
                status: EnrollmentStatus.CONFIRMED,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Format response
    const formatted = {
      id: course.id,
      courseCode: course.course_code,
      courseName: course.course_name,
      description: course.description,
      credits: course.credits,
      department: course.department,
      semester: course.semester,
      year: course.year,
      maxCapacity: course.max_capacity,
      currentEnrollment: course.current_enrollment,
      status: course.status,
      prerequisites: safeJsonParse(course.prerequisites),
      instructor: course.users
        ? {
            id: course.users.id,
            fullName: course.users.full_name,
            email: course.users.email,
            userIdentifier: course.users.user_identifier,
            department: course.users.department,
          }
        : null,
      timeSlots: course.time_slots.map((slot) => ({
        id: slot.id,
        dayOfWeek: slot.day_of_week,
        startTime: slot.start_time,
        endTime: slot.end_time,
        location: slot.location,
        type: slot.type,
      })),
      enrollmentCount: course._count.enrollments,
      createdAt: course.created_at,
      updatedAt: course.updated_at,
    };

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Update course details (comprehensive)
 * PUT /api/admin/courses/:id/details
 */
export const updateCourseDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      course_code,
      course_name,
      description,
      credits,
      instructor_id,
      department,
      semester,
      year,
      max_capacity,
      prerequisites,
      status,
    } = req.body;

    const course = await prisma.courses.findUnique({
      where: { id: parseInt(id) },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Check for course code conflicts if changing
    if (course_code && (course_code !== course.course_code || semester !== course.semester || year !== course.year)) {
      const existing = await prisma.courses.findFirst({
        where: {
          course_code: course_code,
          semester: (semester || course.semester) as Semester,
          year: year || course.year,
          id: { not: parseInt(id) },
        },
      });

      if (existing) {
        throw new ConflictError('Course with this code already exists for the specified semester and year');
      }
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    if (course_code !== undefined) updateData.course_code = course_code;
    if (course_name !== undefined) updateData.course_name = course_name;
    if (description !== undefined) updateData.description = description;
    if (credits !== undefined) updateData.credits = credits;
    if (instructor_id !== undefined) updateData.instructor_id = instructor_id;
    if (department !== undefined) updateData.department = department;
    if (semester !== undefined) updateData.semester = semester as Semester;
    if (year !== undefined) updateData.year = year;
    if (max_capacity !== undefined) updateData.max_capacity = max_capacity;
    if (prerequisites !== undefined) updateData.prerequisites = prerequisites ? JSON.stringify(prerequisites) : null;
    if (status !== undefined) updateData.status = status as CourseStatus;

    const updated = await prisma.courses.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        time_slots: true,
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'UPDATE',
        entity_type: 'COURSE',
        entity_id: updated.id,
        changes: JSON.stringify({ before: course, after: updated }),
      },
    });

    // Invalidate cache
    await deleteCached(`${CACHE_KEYS.COURSE}${id}`);

    res.status(200).json({
      success: true,
      message: 'Course details updated successfully',
      data: updated,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Update course time slots
 * PUT /api/admin/courses/:id/time-slots
 */
export const updateCourseTimeSlots = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { time_slots } = req.body;

    if (!Array.isArray(time_slots)) {
      throw new BadRequestError('time_slots must be an array');
    }

    const course = await prisma.courses.findUnique({
      where: { id: parseInt(id) },
      include: { time_slots: true },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Delete existing time slots and create new ones
    const updated = await prisma.$transaction(async (tx) => {
      // Delete existing time slots
      await tx.time_slots.deleteMany({
        where: { course_id: parseInt(id) },
      });

      // Create new time slots
      const newTimeSlots = await Promise.all(
        time_slots.map((slot) =>
          tx.time_slots.create({
            data: {
              course_id: parseInt(id),
              day_of_week: slot.day_of_week as DayOfWeek,
              start_time: slot.start_time,
              end_time: slot.end_time,
              location: slot.location,
              type: (slot.type || 'LECTURE').toUpperCase(),
            },
          })
        )
      );

      // Update course updated_at
      await tx.courses.update({
        where: { id: parseInt(id) },
        data: { updated_at: new Date() },
      });

      return newTimeSlots;
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'UPDATE',
        entity_type: 'COURSE',
        entity_id: parseInt(id),
        changes: JSON.stringify({
          oldTimeSlots: course.time_slots,
          newTimeSlots: updated,
        }),
      },
    });

    // Invalidate cache
    await deleteCached(`${CACHE_KEYS.COURSE}${id}`);

    res.status(200).json({
      success: true,
      message: 'Course time slots updated successfully',
      data: updated,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get course enrollments
 * GET /api/admin/courses/:id/enrollments
 */
export const getCourseEnrollments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const enrollments = await prisma.enrollments.findMany({
      where: {
        course_id: parseInt(id),
        status: {
          in: [EnrollmentStatus.CONFIRMED, EnrollmentStatus.WAITLISTED],
        },
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            full_name: true,
            user_identifier: true,
            major: true,
            year_level: true,
            students_students_user_idTousers: {
              select: {
                student_id: true,
                year: true,
                majors: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        grades: {
          select: {
            id: true,
            letter_grade: true,
            numeric_grade: true,
            grade_points: true,
            status: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { waitlist_position: 'asc' },
        { enrolled_at: 'asc' },
      ],
    });

    // Format response
    const formatted = enrollments.map((enrollment) => ({
      id: enrollment.id,
      status: enrollment.status,
      enrolledAt: enrollment.enrolled_at,
      waitlistPosition: enrollment.waitlist_position,
      student: {
        id: enrollment.users!.id,
        userIdentifier: enrollment.users!.user_identifier,
        fullName: enrollment.users!.full_name,
        email: enrollment.users!.email,
        studentId: enrollment.users!.students_students_user_idTousers?.student_id,
        major: enrollment.users!.students_students_user_idTousers?.majors?.name,
        majorCode: enrollment.users!.students_students_user_idTousers?.majors?.code,
        year: enrollment.users!.students_students_user_idTousers?.year,
      },
      grade: enrollment.grades
        ? {
            id: enrollment.grades.id,
            letterGrade: enrollment.grades.letter_grade,
            numericGrade: enrollment.grades.numeric_grade,
            gradePoints: enrollment.grades.grade_points,
            status: enrollment.grades.status,
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      message: 'Course enrollments retrieved successfully',
      data: formatted,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * ===================
 * STUDENT MANAGEMENT
 * ===================
 */

/**
 * Get student personal information
 * GET /api/admin/students/:id/personal-info
 */
export const getStudentPersonalInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = parseInt(id);

    const student = await prisma.students.findUnique({
      where: { id: studentId },
      include: {
        users_students_user_idTousers: {
          select: {
            id: true,
            user_identifier: true,
            email: true,
            full_name: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    let personalInfo = await prisma.personal_info.findUnique({
      where: { user_id: student.user_id },
    });

    // Create personal info if it doesn't exist
    if (!personalInfo) {
      personalInfo = await prisma.personal_info.create({
        data: {
          user_id: student.user_id,
          updated_at: new Date(),
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...personalInfo,
        student: {
          id: student.id,
          studentId: student.student_id,
          user: student.users_students_user_idTousers,
        },
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Update student personal information
 * PUT /api/admin/students/:id/personal-info
 */
export const updateStudentPersonalInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = parseInt(id);
    const updateData = req.body;

    const student = await prisma.students.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.userId;
    delete updateData.user_id;

    // Convert camelCase to snake_case for database fields
    const dbUpdateData: any = {};
    if (updateData.phoneNumber !== undefined) dbUpdateData.phone_number = updateData.phoneNumber;
    if (updateData.alternatePhone !== undefined) dbUpdateData.alternate_phone = updateData.alternatePhone;
    if (updateData.permanentAddress !== undefined) dbUpdateData.permanent_address = updateData.permanentAddress;
    if (updateData.mailingAddress !== undefined) dbUpdateData.mailing_address = updateData.mailingAddress;
    if (updateData.city !== undefined) dbUpdateData.city = updateData.city;
    if (updateData.state !== undefined) dbUpdateData.state = updateData.state;
    if (updateData.postalCode !== undefined) dbUpdateData.postal_code = updateData.postalCode;
    if (updateData.country !== undefined) dbUpdateData.country = updateData.country;
    if (updateData.dateOfBirth !== undefined) dbUpdateData.date_of_birth = updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : null;
    if (updateData.gender !== undefined) dbUpdateData.gender = updateData.gender;
    if (updateData.nationality !== undefined) dbUpdateData.nationality = updateData.nationality;
    if (updateData.idNumber !== undefined) dbUpdateData.id_number = updateData.idNumber;
    if (updateData.highSchool !== undefined) dbUpdateData.high_school = updateData.highSchool;
    if (updateData.highSchoolGrad !== undefined) dbUpdateData.high_school_grad = updateData.highSchoolGrad ? new Date(updateData.highSchoolGrad) : null;
    if (updateData.emergencyName !== undefined) dbUpdateData.emergency_name = updateData.emergencyName;
    if (updateData.emergencyRelation !== undefined) dbUpdateData.emergency_relation = updateData.emergencyRelation;
    if (updateData.emergencyPhone !== undefined) dbUpdateData.emergency_phone = updateData.emergencyPhone;
    if (updateData.emergencyEmail !== undefined) dbUpdateData.emergency_email = updateData.emergencyEmail;

    const personalInfo = await prisma.personal_info.upsert({
      where: { user_id: student.user_id },
      update: {
        ...dbUpdateData,
        updated_at: new Date(),
      },
      create: {
        user_id: student.user_id,
        ...dbUpdateData,
        updated_at: new Date(),
      },
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'UPDATE',
        entity_type: 'PERSONAL_INFO',
        entity_id: personalInfo.id,
        changes: JSON.stringify({ studentId: student.id, updatedFields: Object.keys(dbUpdateData) }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Personal information updated successfully',
      data: personalInfo,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get all students with filters
 * GET /api/admin/students
 */
export const getStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      perPage = 50,
      search,
      major,
      year,
      status,
      sortBy = 'studentId',
      sortOrder = 'asc',
    } = req.query;

    const skip = (Number(page) - 1) * Number(perPage);
    const take = Number(perPage);

    const where: any = {};

    if (status) {
      where.status = status as StudentStatus;
    }

    if (year) {
      where.year = Number(year);
    }

    if (major) {
      where.majors = {
        name: {
          contains: major as string,
          mode: 'insensitive',
        },
      };
    }

    if (search) {
      where.OR = [
        {
          student_id: {
            contains: search as string,
            mode: 'insensitive',
          },
        },
        {
          users_students_user_idTousers: {
            full_name: {
              contains: search as string,
              mode: 'insensitive',
            },
          },
        },
        {
          users_students_user_idTousers: {
            email: {
              contains: search as string,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    // Map sortBy to actual database field names
    const sortByMap: Record<string, string> = {
      studentId: 'student_id',
      student_id: 'student_id',
      year: 'year',
      status: 'status',
      admissionDate: 'admission_date',
      admission_date: 'admission_date',
    };
    const actualSortBy = sortByMap[sortBy as string] || 'student_id';

    // Build orderBy safely
    let orderBy: any = { student_id: sortOrder as 'asc' | 'desc' };
    if (actualSortBy && ['student_id', 'year', 'status', 'admission_date'].includes(actualSortBy)) {
      orderBy = { [actualSortBy]: sortOrder as 'asc' | 'desc' };
    }

    const [students, total] = await Promise.all([
      prisma.students.findMany({
        where,
        skip,
        take,
        include: {
          users_students_user_idTousers: {
            select: {
              id: true,
              user_identifier: true,
              email: true,
              full_name: true,
              created_at: true,
              updated_at: true,
            },
          },
          majors: true,
          users_students_advisor_idTousers: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },
        },
        orderBy,
      }),
      prisma.students.count({ where }),
    ]);

    // Transform response to match frontend expectations
    const transformedStudents = students.map((student: any) => ({
      ...student,
      // Add aliases for frontend compatibility
      users: student.users_students_user_idTousers || null,
      user: student.users_students_user_idTousers || null,
      major: student.majors || null,
      advisor: student.users_students_advisor_idTousers || null,
      // Add camelCase aliases for common fields
      userId: student.user_id,
      studentId: student.student_id,
      majorId: student.major_id,
      advisorId: student.advisor_id,
      expectedGrad: student.expected_grad,
      admissionDate: student.admission_date,
    }));

    res.status(200).json({
      success: true,
      data: transformedStudents,
      metadata: {
        page: Number(page),
        perPage: Number(perPage),
        total,
        totalPages: Math.ceil(total / Number(perPage)),
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get student by ID
 * GET /api/admin/students/:id
 */
export const getStudentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const student = await prisma.students.findUnique({
      where: { id: parseInt(id) },
      include: {
        users_students_user_idTousers: {
          include: {
            personal_info: true,
            enrollments: {
              include: {
                courses: true,
                grades: true,
              },
            },
          },
        },
        majors: {
          include: {
            requirements: true,
          },
        },
        users_students_advisor_idTousers: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    // Calculate GPA
    const grades = await prisma.grades.findMany({
      where: {
        enrollments: {
          user_id: student.user_id,
        },
        status: GradeStatus.PUBLISHED,
        grade_points: {
          not: null,
        },
      },
      include: {
        enrollments: {
          include: {
            courses: true,
          },
        },
      },
    });

    let totalPoints = 0;
    let totalCredits = 0;
    let majorPoints = 0;
    let majorCredits = 0;

    grades.forEach((grade: any) => {
      const credits = grade.enrollments?.courses?.credits || 0;
      const points = grade.grade_points || 0;

      if (credits > 0) {
        totalPoints += points * credits;
        totalCredits += credits;

      // Check if it's a major course
      if (grade.enrollments?.courses?.department === (student as any).majors?.department) {
        majorPoints += points * credits;
        majorCredits += credits;
      }
      }
    });

    const cumulativeGPA = totalCredits > 0 ? totalPoints / totalCredits : 0;
    const majorGPA = majorCredits > 0 ? majorPoints / majorCredits : 0;

    // Transform response to match frontend expectations
    const transformedStudent: any = {
      ...student,
      // Add aliases for frontend compatibility
      user: (student as any).users_students_user_idTousers || null,
      users: (student as any).users_students_user_idTousers || null,
      major: (student as any).majors || null,
      advisor: (student as any).users_students_advisor_idTousers || null,
      // Add camelCase aliases for common fields
      userId: student.user_id,
      studentId: student.student_id,
      majorId: student.major_id,
      advisorId: student.advisor_id,
      expectedGrad: student.expected_grad,
      admissionDate: student.admission_date,
      gpa: {
        cumulative: parseFloat(cumulativeGPA.toFixed(3)),
        major: parseFloat(majorGPA.toFixed(3)),
      },
      creditsEarned: totalCredits,
    };

    res.status(200).json({
      success: true,
      data: transformedStudent,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Create new student
 * POST /api/admin/students
 */
export const createStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      email,
      password,
      full_name,
      student_id,
      major_id,
      minor_id,
      advisor_id,
      year,
      admission_date,
      expected_graduation,
      personal_info,
    } = req.body;

    // Check if email or student ID already exists
    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [
          { email },
          { user_identifier: student_id },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictError('User with this email or student ID already exists');
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user and student in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          user_identifier: student_id,
          email,
          password_hash: passwordHash,
          full_name: full_name,
          role: 'STUDENT',
          updated_at: new Date(),
          students_students_user_idTousers: {
            create: {
              student_id: student_id,
              major_id: major_id,
              minor_id: minor_id,
              advisor_id: advisor_id,
              year,
              admission_date: new Date(admission_date),
              expected_grad: expected_graduation ? new Date(expected_graduation) : null,
              status: StudentStatus.ACTIVE,
            },
          },
        },
        include: {
          students_students_user_idTousers: {
            include: {
              majors: true,
              users_students_advisor_idTousers: {
                select: {
                  id: true,
                  full_name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      // Create personal info if provided
      if (personal_info) {
        await tx.personal_info.create({
          data: {
            user_id: user.id,
            ...personal_info,
          },
        });
      }

      return user;
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'CREATE',
        entity_type: 'STUDENT',
        entity_id: result.id,
        changes: JSON.stringify({ created: result }),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: result,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Update student
 * PUT /api/admin/students/:id
 */
export const updateStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const student = await prisma.students.findUnique({
      where: { id: parseInt(id) },
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    // Prepare student update data
    const studentUpdateData: any = {};
    if (updates.major_id !== undefined) studentUpdateData.major_id = updates.major_id;
    if (updates.minor_id !== undefined) studentUpdateData.minor_id = updates.minor_id;
    if (updates.advisor_id !== undefined) studentUpdateData.advisor_id = updates.advisor_id;
    if (updates.year !== undefined) studentUpdateData.year = updates.year;
    if (updates.expected_graduation) studentUpdateData.expected_grad = new Date(updates.expected_graduation);
    if (updates.status) studentUpdateData.status = updates.status as StudentStatus;

    // Update student record
    const updatedStudent = await prisma.students.update({
      where: { id: parseInt(id) },
      data: studentUpdateData,
      include: {
        users_students_user_idTousers: true,
        majors: true,
        users_students_advisor_idTousers: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    // Update user record if needed
    if (updates.full_name || updates.email) {
      const userUpdateData: any = {};
      if (updates.full_name) userUpdateData.full_name = updates.full_name;
      if (updates.email) userUpdateData.email = updates.email;

      await prisma.users.update({
        where: { id: student.user_id },
        data: userUpdateData,
      });

      // Refetch student with updated user data
      const studentWithUser = await prisma.students.findUnique({
        where: { id: parseInt(id) },
        include: {
          users_students_user_idTousers: true,
          majors: true,
          users_students_advisor_idTousers: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },
        },
      });

      if (studentWithUser) {
        Object.assign(updatedStudent, studentWithUser);
      }
    }

    // Transform response to match frontend expectations
    const transformedStudent = {
      ...updatedStudent,
      user: updatedStudent.users_students_user_idTousers || null,
      users: updatedStudent.users_students_user_idTousers || null,
      major: updatedStudent.majors || null,
      advisor: updatedStudent.users_students_advisor_idTousers || null,
      userId: updatedStudent.user_id,
      studentId: updatedStudent.student_id,
      majorId: updatedStudent.major_id,
      advisorId: updatedStudent.advisor_id,
      expectedGrad: updatedStudent.expected_grad,
      admissionDate: updatedStudent.admission_date,
    };

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'UPDATE',
        entity_type: 'STUDENT',
        entity_id: student.id,
        changes: JSON.stringify({ before: student, after: updatedStudent }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: transformedStudent,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Change student status
 * PUT /api/admin/students/:id/status
 */
export const updateStudentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, reason, effective_date } = req.body;

    const student = await prisma.students.findUnique({
      where: { id: parseInt(id) },
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    // If status is WITHDRAWN, drop all active enrollments
    if (status === StudentStatus.WITHDRAWN) {
      await prisma.enrollments.updateMany({
        where: {
          user_id: student.user_id,
          status: EnrollmentStatus.CONFIRMED,
        },
        data: {
          status: EnrollmentStatus.DROPPED,
        },
      });
    }

    const updatedStudent = await prisma.students.update({
      where: { id: parseInt(id) },
      data: {
        status: status as StudentStatus,
      },
      include: {
        users_students_user_idTousers: true,
        majors: true,
      },
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'STATUS_CHANGE',
        entity_type: 'STUDENT',
        entity_id: student.id,
        changes: JSON.stringify({
          oldStatus: student.status,
          newStatus: status,
          reason,
          effectiveDate: effective_date,
        }),
      },
    });

    // Transform response to match frontend expectations
    const transformedStudent: any = {
      ...updatedStudent,
      user: (updatedStudent as any).users_students_user_idTousers || null,
      users: (updatedStudent as any).users_students_user_idTousers || null,
      major: (updatedStudent as any).majors || null,
      userId: updatedStudent.user_id,
      studentId: updatedStudent.student_id,
      majorId: updatedStudent.major_id,
      advisorId: updatedStudent.advisor_id,
      expectedGrad: updatedStudent.expected_grad,
      admissionDate: updatedStudent.admission_date,
    };

    res.status(200).json({
      success: true,
      message: 'Student status updated successfully',
      data: transformedStudent,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Delete student (soft delete)
 * DELETE /api/admin/students/:id
 */
export const deleteStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const student = await prisma.students.findUnique({
      where: { id: parseInt(id) },
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    // Update status to withdrawn instead of deleting
    await prisma.students.update({
      where: { id: parseInt(id) },
      data: {
        status: StudentStatus.WITHDRAWN,
      },
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'DELETE',
        entity_type: 'STUDENT',
        entity_id: student.id,
        changes: { deleted: student },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    throw error;
  }
};

/**
 * ===================
 * ENROLLMENT MANAGEMENT
 * ===================
 */

/**
 * Get all enrollments with filters
 * GET /api/admin/enrollments
 */
export const getEnrollments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, perPage, status, course_id, student_id, semester, year } = req.query;

    const pageNumber = Math.max(parseIntegerParam(page as string | string[] | undefined) ?? 1, 1);
    const perPageNumber = Math.max(parseIntegerParam(perPage as string | string[] | undefined) ?? 50, 1);

    const skip = (pageNumber - 1) * perPageNumber;
    const take = perPageNumber;

    const where: any = {};

    const normalizedStatus = (() => {
      if (!status) {
        return undefined;
      }

      const statusValue = Array.isArray(status) ? status[0] : (typeof status === 'string' ? status : String(status));
      if (!statusValue || typeof statusValue !== 'string' || statusValue.toUpperCase() === 'ALL') {
        return undefined;
      }

      const statusMap: Record<string, EnrollmentStatus> = {
        ENROLLED: EnrollmentStatus.CONFIRMED,
        CONFIRMED: EnrollmentStatus.CONFIRMED,
        WAITLISTED: EnrollmentStatus.WAITLISTED,
        PENDING: EnrollmentStatus.PENDING,
        DROPPED: EnrollmentStatus.DROPPED,
        REJECTED: EnrollmentStatus.REJECTED,
      };

      return statusMap[statusValue.toUpperCase()];
    })();

    if (normalizedStatus) {
      where.status = normalizedStatus;
    }

    const courseIdFilter = parseIntegerParam(course_id as string | string[] | undefined);
    if (courseIdFilter !== undefined) {
      where.course_id = courseIdFilter;
    }

    const studentIdFilter = parseIntegerParam(student_id as string | string[] | undefined);
    if (studentIdFilter !== undefined) {
      where.user_id = studentIdFilter;
    }

    if (semester || year) {
      const courseFilter: Prisma.coursesWhereInput = {};

      const semesterFilter = parseSemesterParam(semester as string | string[] | undefined);
      if (semesterFilter) {
        courseFilter.semester = semesterFilter;
      }

      const yearFilter = parseIntegerParam(year as string | string[] | undefined);
      if (yearFilter !== undefined) {
        courseFilter.year = yearFilter;
      }

      if (Object.keys(courseFilter).length > 0) {
        where.courses = courseFilter;
      }
    }

    const [enrollments, total] = await Promise.all([
      prisma.enrollments.findMany({
        where,
        skip,
        take,
        include: {
          users: {
            select: {
              id: true,
              full_name: true,
              email: true,
              user_identifier: true,
              major: true,
              year_level: true,
              students_students_user_idTousers: {
                select: {
                  student_id: true,
                },
              },
            },
          },
          courses: {
            select: {
              id: true,
              course_code: true,
              course_name: true,
              department: true,
              semester: true,
              year: true,
              credits: true,
            },
          },
          grades: {
            select: {
              letter_grade: true,
              numeric_grade: true,
            },
          },
        },
        orderBy: {
          enrolled_at: 'desc',
        },
      }),
      prisma.enrollments.count({ where }),
    ]);

    const formatted = enrollments.map((enrollment) => ({
        id: enrollment.id,
        status: enrollment.status,
        enrolledAt: enrollment.enrolled_at,
        waitlistPosition: enrollment.waitlist_position ?? undefined,
        student: {
          id: enrollment.users!.id,
          userIdentifier: enrollment.users!.user_identifier,
          fullName: enrollment.users!.full_name,
          email: enrollment.users!.email,
          major: enrollment.users!.major ?? undefined,
          yearLevel: enrollment.users!.year_level ?? undefined,
          studentId: enrollment.users!.students_students_user_idTousers?.student_id,
        },
        course: enrollment.courses
          ? {
              id: enrollment.courses.id,
              courseCode: enrollment.courses.course_code,
              courseName: enrollment.courses.course_name,
              department: enrollment.courses.department,
              semester: enrollment.courses.semester,
              year: enrollment.courses.year,
              credits: enrollment.courses.credits,
            }
          : null,
        grade: enrollment.grades
          ? {
              letter: enrollment.grades.letter_grade,
              numeric: enrollment.grades.numeric_grade,
            }
          : undefined,
      }));

    res.status(200).json({
      success: true,
      data: formatted,
      metadata: {
        page: pageNumber,
        perPage: perPageNumber,
        total,
        totalPages: Math.ceil(total / perPageNumber),
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get pending enrollment approvals
 * GET /api/admin/enrollments/pending
 */
export const getPendingEnrollments = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const enrollments = await prisma.enrollments.findMany({
      where: {
        status: EnrollmentStatus.PENDING,
      },
      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
            user_identifier: true,
            students_students_user_idTousers: {
              select: {
                student_id: true,
                year: true,
                majors: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        courses: {
          include: {
            users: {
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            },
            time_slots: {
              orderBy: [
                { day_of_week: 'asc' },
                { start_time: 'asc' },
              ],
            },
          },
        },
      },
      orderBy: {
        enrolled_at: 'asc',
      },
    });

    // Format response
    const formatted = enrollments.map((enrollment) => ({
      id: enrollment.id,
      status: enrollment.status,
      enrolledAt: enrollment.enrolled_at,
      student: {
        id: enrollment.users!.id,
        userIdentifier: enrollment.users!.user_identifier,
        fullName: enrollment.users!.full_name,
        email: enrollment.users!.email,
        studentId: enrollment.users!.students_students_user_idTousers?.student_id,
        year: enrollment.users!.students_students_user_idTousers?.year,
        major: enrollment.users!.students_students_user_idTousers?.majors?.name,
        majorCode: enrollment.users!.students_students_user_idTousers?.majors?.code,
      },
      course: enrollment.courses
        ? {
            id: enrollment.courses.id,
            courseCode: enrollment.courses.course_code,
            courseName: enrollment.courses.course_name,
            department: enrollment.courses.department,
            credits: enrollment.courses.credits,
            semester: enrollment.courses.semester,
            year: enrollment.courses.year,
            maxCapacity: enrollment.courses.max_capacity,
            currentEnrollment: enrollment.courses.current_enrollment,
            instructor: enrollment.courses.users
              ? {
                  id: enrollment.courses.users.id,
                  fullName: enrollment.courses.users.full_name,
                  email: enrollment.courses.users.email,
                }
              : null,
            timeSlots: enrollment.courses.time_slots.map((slot) => ({
              id: slot.id,
              dayOfWeek: slot.day_of_week,
              startTime: slot.start_time,
              endTime: slot.end_time,
              location: slot.location,
              type: slot.type,
            })),
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Approve enrollment
 * POST /api/admin/enrollments/:id/approve
 */
export const approveEnrollment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const enrollment = await prisma.enrollments.findUnique({
      where: { id: parseInt(id) },
      include: {
        courses: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundError('Enrollment not found');
    }

    if (enrollment.status !== EnrollmentStatus.PENDING) {
      throw new BadRequestError('Enrollment is not in pending status');
    }

    // Check if course is full
    if (enrollment.courses && enrollment.courses.current_enrollment >= enrollment.courses.max_capacity) {
      throw new BadRequestError('Course is full');
    }

    // Update enrollment status and increment course enrollment
    const updatedEnrollment = await prisma.$transaction(async (tx) => {
      if (enrollment.courses) {
        await tx.courses.update({
          where: { id: enrollment.course_id },
          data: {
            current_enrollment: {
              increment: 1,
            },
          },
        });
      }

      return tx.enrollments.update({
        where: { id: parseInt(id) },
        data: {
          status: EnrollmentStatus.CONFIRMED,
        },
        include: {
          users: true,
          courses: true,
        },
      });
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'APPROVE',
        entity_type: 'ENROLLMENT',
        entity_id: enrollment.id,
        changes: JSON.stringify({
          oldStatus: enrollment.status,
          newStatus: EnrollmentStatus.CONFIRMED,
          notes,
        }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Enrollment approved successfully',
      data: updatedEnrollment,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Reject enrollment
 * POST /api/admin/enrollments/:id/reject
 */
export const rejectEnrollment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      throw new BadRequestError('Rejection reason is required');
    }

    const enrollment = await prisma.enrollments.findUnique({
      where: { id: parseInt(id) },
    });

    if (!enrollment) {
      throw new NotFoundError('Enrollment not found');
    }

    if (enrollment.status !== EnrollmentStatus.PENDING) {
      throw new BadRequestError('Enrollment is not in pending status');
    }

    const updatedEnrollment = await prisma.enrollments.update({
      where: { id: parseInt(id) },
      data: {
        status: EnrollmentStatus.REJECTED,
      },
      include: {
        users: true,
        courses: true,
      },
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'REJECT',
        entity_type: 'ENROLLMENT',
        entity_id: enrollment.id,
        changes: JSON.stringify({
          oldStatus: enrollment.status,
          newStatus: EnrollmentStatus.REJECTED,
          reason,
        }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Enrollment rejected successfully',
      data: updatedEnrollment,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Bulk approve enrollments
 * POST /api/admin/enrollments/bulk-approve
 */
export const bulkApproveEnrollments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { enrollment_ids } = req.body;

    if (!Array.isArray(enrollment_ids) || enrollment_ids.length === 0) {
      throw new BadRequestError('enrollment_ids must be a non-empty array');
    }

    const results = {
      approved: [] as number[],
      failed: [] as { id: number; reason: string }[],
    };

    for (const enrollmentId of enrollment_ids) {
      try {
        const enrollment = await prisma.enrollments.findUnique({
          where: { id: enrollmentId },
          include: { courses: true },
        });

        if (!enrollment) {
          results.failed.push({ id: enrollmentId, reason: 'Enrollment not found' });
          continue;
        }

        if (enrollment.status !== EnrollmentStatus.PENDING) {
          results.failed.push({ id: enrollmentId, reason: 'Not in pending status' });
          continue;
        }

        if (enrollment.courses && enrollment.courses.current_enrollment >= enrollment.courses.max_capacity) {
          results.failed.push({ id: enrollmentId, reason: 'Course is full' });
          continue;
        }

        await prisma.$transaction(async (tx) => {
          if (enrollment.courses) {
            await tx.courses.update({
              where: { id: enrollment.course_id },
              data: { current_enrollment: { increment: 1 } },
            });
          }

          await tx.enrollments.update({
            where: { id: enrollmentId },
            data: { status: EnrollmentStatus.CONFIRMED },
          });
        });

        results.approved.push(enrollmentId);
      } catch (error) {
        results.failed.push({ id: enrollmentId, reason: 'Internal error' });
      }
    }

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'BULK_APPROVE',
        entity_type: 'ENROLLMENT',
        entity_id: 0,
        changes: JSON.stringify({ results }),
      },
    });

    res.status(200).json({
      success: true,
      message: `Approved ${results.approved.length} enrollments, ${results.failed.length} failed`,
      data: results,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Drop student from course
 * DELETE /api/admin/enrollments/:id
 */
export const dropEnrollment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const enrollment = await prisma.enrollments.findUnique({
      where: { id: parseInt(id) },
      include: { courses: true },
    });

    if (!enrollment) {
      throw new NotFoundError('Enrollment not found');
    }

    if (enrollment.status !== EnrollmentStatus.CONFIRMED) {
      throw new BadRequestError('Can only drop confirmed enrollments');
    }

    await prisma.$transaction(async (tx) => {
      await tx.enrollments.update({
        where: { id: parseInt(id) },
        data: { status: EnrollmentStatus.DROPPED },
      });

      if (enrollment.courses) {
        await tx.courses.update({
          where: { id: enrollment.course_id },
          data: { current_enrollment: { decrement: 1 } },
        });
      }
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'DROP',
        entity_type: 'ENROLLMENT',
        entity_id: enrollment.id,
        changes: JSON.stringify({ reason }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Enrollment dropped successfully',
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Manual enrollment (admin-initiated)
 * POST /api/admin/enrollments
 */
export const createEnrollment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { user_id, course_id, force = false } = req.body;

    // Check if enrollment already exists
    const existing = await prisma.enrollments.findFirst({
      where: {
        user_id: user_id,
        course_id: course_id,
      },
    });

    if (existing) {
      throw new ConflictError('Student is already enrolled in this course');
    }

    const course = await prisma.courses.findUnique({
      where: { id: course_id },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Check capacity unless force is true
    if (!force && course.current_enrollment >= course.max_capacity) {
      throw new BadRequestError('Course is full. Use force=true to override.');
    }

    const enrollment = await prisma.$transaction(async (tx) => {
      const newEnrollment = await tx.enrollments.create({
        data: {
          user_id: user_id,
          course_id: course_id,
          status: EnrollmentStatus.CONFIRMED,
          updated_at: new Date(),
        },
        include: {
          users: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },
          courses: true,
        },
      });

      await tx.courses.update({
        where: { id: course_id },
        data: { current_enrollment: { increment: 1 } },
      });

      return newEnrollment;
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'CREATE',
        entity_type: 'ENROLLMENT',
        entity_id: enrollment.id,
        changes: JSON.stringify({ created: enrollment, force }),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Enrollment created successfully',
      data: enrollment,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * ===================
 * GRADE MANAGEMENT
 * ===================
 */

/**
 * Get pending grade approvals
 * GET /api/admin/grades/pending
 */
export const getPendingGrades = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const grades = await prisma.grades.findMany({
      where: {
        status: GradeStatus.SUBMITTED,
      },
      include: {
        enrollments: {
          include: {
            users: {
              select: {
                id: true,
                full_name: true,
                email: true,
                students_students_user_idTousers: {
                  select: {
                    student_id: true,
                  },
                },
              },
            },
            courses: {
              include: {
                users: {
                  select: {
                    id: true,
                    full_name: true,
                  },
                },
              },
            },
          },
        },
        users_grades_submitted_byTousers: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        submitted_at: 'asc',
      },
    });

    res.status(200).json({
      success: true,
      data: grades,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Approve grade
 * POST /api/admin/grades/:id/approve
 */
export const approveGrade = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    const grade = await prisma.grades.findUnique({
      where: { id: parseInt(id) },
    });

    if (!grade) {
      throw new NotFoundError('Grade not found');
    }

    if (grade.status !== GradeStatus.SUBMITTED) {
      throw new BadRequestError('Grade is not in submitted status');
    }

    const updatedGrade = await prisma.grades.update({
      where: { id: parseInt(id) },
      data: {
        status: GradeStatus.APPROVED,
        approved_by: req.user!.id,
        approved_at: new Date(),
        comments: comments || grade.comments,
      },
      include: {
        enrollments: {
          include: {
            users: true,
            courses: true,
          },
        },
      },
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'APPROVE',
        entity_type: 'GRADE',
        entity_id: grade.id,
        changes: JSON.stringify({
          oldStatus: grade.status,
          newStatus: GradeStatus.APPROVED,
          comments,
        }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Grade approved successfully',
      data: updatedGrade,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Bulk approve grades
 * POST /api/admin/grades/bulk-approve
 */
export const bulkApproveGrades = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { grade_ids } = req.body;

    if (!Array.isArray(grade_ids) || grade_ids.length === 0) {
      throw new BadRequestError('grade_ids must be a non-empty array');
    }

    const updated = await prisma.grades.updateMany({
      where: {
        id: { in: grade_ids },
        status: GradeStatus.SUBMITTED,
      },
      data: {
        status: GradeStatus.APPROVED,
        approved_by: req.user!.id,
        approved_at: new Date(),
      },
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'BULK_APPROVE',
        entity_type: 'GRADE',
        entity_id: 0,
        changes: JSON.stringify({ gradeIds: grade_ids, count: updated.count }),
      },
    });

    res.status(200).json({
      success: true,
      message: `Approved ${updated.count} grades`,
      data: { count: updated.count },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Publish grades
 * POST /api/admin/grades/publish
 */
export const publishGrades = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { grade_ids, course_id } = req.body;

    let where: any = {
      status: GradeStatus.APPROVED,
    };

    if (grade_ids && Array.isArray(grade_ids)) {
      where.id = { in: grade_ids };
    } else if (course_id) {
      where.enrollments = {
        course_id: course_id,
      };
    } else {
      throw new BadRequestError('Either grade_ids or course_id must be provided');
    }

    const updated = await prisma.grades.updateMany({
      where,
      data: {
        status: GradeStatus.PUBLISHED,
      },
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'PUBLISH',
        entity_type: 'GRADE',
        entity_id: 0,
        changes: JSON.stringify({ gradeIds: grade_ids, courseId: course_id, count: updated.count }),
      },
    });

    res.status(200).json({
      success: true,
      message: `Published ${updated.count} grades`,
      data: { count: updated.count },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * ===================
 * USER MANAGEMENT
 * ===================
 */

/**
 * Get all users
 * GET /api/admin/users
 */
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, page = 1, perPage = 50, search } = req.query;

    const skip = (Number(page) - 1) * Number(perPage);
    const take = Number(perPage);

    const where: Prisma.usersWhereInput = {};

    if (role) {
      where.role = role as Role;
    }

    if (search) {
      where.OR = [
        {
          full_name: {
            contains: search as string,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search as string,
            mode: 'insensitive',
          },
        },
        {
          user_identifier: {
            contains: search as string,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        skip,
        take,
        orderBy: {
          created_at: 'desc',
        },
      }),
      prisma.users.count({ where }),
    ]);

    const formatted = users.map((user) => ({
      id: user.id,
      userIdentifier: user.user_identifier,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      major: user.major ?? undefined,
      yearLevel: user.year_level ?? undefined,
      department: user.department ?? undefined,
      createdAt: user.created_at,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
      metadata: {
        page: Number(page),
        perPage: Number(perPage),
        total,
        totalPages: Math.ceil(total / Number(perPage)),
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get user by ID with full details
 * GET /api/admin/users/:id
 */
export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.users.findUnique({
      where: { id: parseInt(id) },
      include: {
        personal_info: true,
        students_students_user_idTousers: {
          include: {
            majors: true,
            users_students_advisor_idTousers: {
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            },
          },
        },
        faculty: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Format response
    const formatted = {
      id: user.id,
      userIdentifier: user.user_identifier,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      major: user.major ?? undefined,
      yearLevel: user.year_level ?? undefined,
      department: user.department ?? undefined,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      personalInfo: user.personal_info
        ? {
            phoneNumber: user.personal_info.phone_number,
            alternatePhone: user.personal_info.alternate_phone,
            permanentAddress: user.personal_info.permanent_address,
            mailingAddress: user.personal_info.mailing_address,
            city: user.personal_info.city,
            state: user.personal_info.state,
            postalCode: user.personal_info.postal_code,
            country: user.personal_info.country,
            emergencyName: user.personal_info.emergency_name,
            emergencyRelation: user.personal_info.emergency_relation,
            emergencyPhone: user.personal_info.emergency_phone,
            emergencyEmail: user.personal_info.emergency_email,
            dateOfBirth: user.personal_info.date_of_birth,
            gender: user.personal_info.gender,
            nationality: user.personal_info.nationality,
            idNumber: user.personal_info.id_number,
            highSchool: user.personal_info.high_school,
            highSchoolGrad: user.personal_info.high_school_grad,
            updatedAt: user.personal_info.updated_at,
          }
        : null,
      studentInfo: user.students_students_user_idTousers
        ? {
            studentId: user.students_students_user_idTousers.student_id,
            majorId: user.students_students_user_idTousers.major_id,
            minorId: user.students_students_user_idTousers.minor_id,
            advisorId: user.students_students_user_idTousers.advisor_id,
            advisor: user.students_students_user_idTousers.users_students_advisor_idTousers
              ? {
                  id: user.students_students_user_idTousers.users_students_advisor_idTousers.id,
                  fullName: user.students_students_user_idTousers.users_students_advisor_idTousers.full_name,
                  email: user.students_students_user_idTousers.users_students_advisor_idTousers.email,
                }
              : null,
            year: user.students_students_user_idTousers.year,
            expectedGrad: user.students_students_user_idTousers.expected_grad,
            admissionDate: user.students_students_user_idTousers.admission_date,
            status: user.students_students_user_idTousers.status,
            major: user.students_students_user_idTousers.majors
              ? {
                  id: user.students_students_user_idTousers.majors.id,
                  code: user.students_students_user_idTousers.majors.code,
                  name: user.students_students_user_idTousers.majors.name,
                }
              : null,
          }
        : null,
      facultyInfo: user.faculty
        ? {
            employeeId: user.faculty.employee_id,
            title: user.faculty.title,
            department: user.faculty.department,
            office: user.faculty.office,
            officeHours: user.faculty.office_hours,
            researchAreas: user.faculty.research_areas,
            bio: user.faculty.bio,
            cvUrl: user.faculty.cv_url,
          }
        : null,
    };

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Update user basic information
 * PUT /api/admin/users/:id
 */
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      full_name,
      email,
      user_identifier,
      major,
      year_level,
      department,
      role,
    } = req.body;

    const user = await prisma.users.findUnique({
      where: { id: parseInt(id) },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check for email conflicts
    if (email && email !== user.email) {
      const emailExists = await prisma.users.findUnique({
        where: { email },
      });
      if (emailExists) {
        throw new ConflictError('Email already in use');
      }
    }

    // Check for user_identifier conflicts
    if (user_identifier && user_identifier !== user.user_identifier) {
      const identifierExists = await prisma.users.findUnique({
        where: { user_identifier },
      });
      if (identifierExists) {
        throw new ConflictError('User identifier already in use');
      }
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    if (full_name !== undefined) updateData.full_name = full_name;
    if (email !== undefined) updateData.email = email;
    if (user_identifier !== undefined) updateData.user_identifier = user_identifier;
    if (major !== undefined) updateData.major = major;
    if (year_level !== undefined) updateData.year_level = year_level;
    if (department !== undefined) updateData.department = department;
    if (role !== undefined) updateData.role = role as Role;

    const updated = await prisma.users.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'UPDATE',
        entity_type: 'USER',
        entity_id: updated.id,
        changes: JSON.stringify({ before: user, after: updated }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: updated.id,
        userIdentifier: updated.user_identifier,
        email: updated.email,
        fullName: updated.full_name,
        role: updated.role,
        major: updated.major,
        yearLevel: updated.year_level,
        department: updated.department,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Update user personal information
 * PUT /api/admin/users/:id/personal-info
 */
export const updateUserPersonalInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      phone_number,
      alternate_phone,
      permanent_address,
      mailing_address,
      city,
      state,
      postal_code,
      country,
      emergency_name,
      emergency_relation,
      emergency_phone,
      emergency_email,
      date_of_birth,
      gender,
      nationality,
      id_number,
      high_school,
      high_school_grad,
    } = req.body;

    const user = await prisma.users.findUnique({
      where: { id: parseInt(id) },
      include: { personal_info: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const personalInfoData: any = {
      updated_at: new Date(),
    };

    if (phone_number !== undefined) personalInfoData.phone_number = phone_number;
    if (alternate_phone !== undefined) personalInfoData.alternate_phone = alternate_phone;
    if (permanent_address !== undefined) personalInfoData.permanent_address = permanent_address;
    if (mailing_address !== undefined) personalInfoData.mailing_address = mailing_address;
    if (city !== undefined) personalInfoData.city = city;
    if (state !== undefined) personalInfoData.state = state;
    if (postal_code !== undefined) personalInfoData.postal_code = postal_code;
    if (country !== undefined) personalInfoData.country = country;
    if (emergency_name !== undefined) personalInfoData.emergency_name = emergency_name;
    if (emergency_relation !== undefined) personalInfoData.emergency_relation = emergency_relation;
    if (emergency_phone !== undefined) personalInfoData.emergency_phone = emergency_phone;
    if (emergency_email !== undefined) personalInfoData.emergency_email = emergency_email;
    if (date_of_birth !== undefined) personalInfoData.date_of_birth = date_of_birth ? new Date(date_of_birth) : null;
    if (gender !== undefined) personalInfoData.gender = gender;
    if (nationality !== undefined) personalInfoData.nationality = nationality;
    if (id_number !== undefined) personalInfoData.id_number = id_number;
    if (high_school !== undefined) personalInfoData.high_school = high_school;
    if (high_school_grad !== undefined) personalInfoData.high_school_grad = high_school_grad ? new Date(high_school_grad) : null;

    let updatedPersonalInfo;
    if (user.personal_info) {
      // Update existing personal info
      updatedPersonalInfo = await prisma.personal_info.update({
        where: { user_id: parseInt(id) },
        data: personalInfoData,
      });
    } else {
      // Create new personal info
      updatedPersonalInfo = await prisma.personal_info.create({
        data: {
          user_id: parseInt(id),
          ...personalInfoData,
        },
      });
    }

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'UPDATE',
        entity_type: 'PERSONAL_INFO',
        entity_id: updatedPersonalInfo.id,
        changes: JSON.stringify({
          userId: parseInt(id),
          before: user.personal_info,
          after: updatedPersonalInfo,
        }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Personal information updated successfully',
      data: updatedPersonalInfo,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Update student-specific information
 * PUT /api/admin/users/:id/student-info
 */
export const updateUserStudentInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      student_id,
      major_id,
      minor_id,
      advisor_id,
      year,
      expected_grad,
      admission_date,
      status,
    } = req.body;

    const user = await prisma.users.findUnique({
      where: { id: parseInt(id) },
      include: { students_students_user_idTousers: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role !== 'STUDENT') {
      throw new BadRequestError('User is not a student');
    }

    if (!user.students_students_user_idTousers) {
      throw new NotFoundError('Student record not found');
    }

    // Check for student_id conflicts
    if (student_id && student_id !== user.students_students_user_idTousers.student_id) {
      const studentIdExists = await prisma.students.findUnique({
        where: { student_id },
      });
      if (studentIdExists) {
        throw new ConflictError('Student ID already in use');
      }
    }

    const studentData: any = {};

    if (student_id !== undefined) studentData.student_id = student_id;
    if (major_id !== undefined) studentData.major_id = major_id;
    if (minor_id !== undefined) studentData.minor_id = minor_id;
    if (advisor_id !== undefined) studentData.advisor_id = advisor_id;
    if (year !== undefined) studentData.year = year;
    if (expected_grad !== undefined) studentData.expected_grad = expected_grad ? new Date(expected_grad) : null;
    if (admission_date !== undefined) studentData.admission_date = admission_date ? new Date(admission_date) : user.students_students_user_idTousers.admission_date;
    if (status !== undefined) studentData.status = status as StudentStatus;

    const updated = await prisma.students.update({
      where: { user_id: parseInt(id) },
      data: studentData,
      include: {
        majors: true,
        users_students_advisor_idTousers: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'UPDATE',
        entity_type: 'STUDENT',
        entity_id: updated.id,
        changes: JSON.stringify({
          userId: parseInt(id),
          before: user.students_students_user_idTousers,
          after: updated,
        }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Student information updated successfully',
      data: {
        id: updated.id,
        studentId: updated.student_id,
        majorId: updated.major_id,
        minorId: updated.minor_id,
        advisorId: updated.advisor_id,
        advisor: updated.users_students_advisor_idTousers,
        year: updated.year,
        expectedGrad: updated.expected_grad,
        admissionDate: updated.admission_date,
        status: updated.status,
        major: updated.majors,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Update faculty-specific information
 * PUT /api/admin/users/:id/faculty-info
 */
export const updateUserFacultyInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      employee_id,
      title,
      department,
      office,
      office_hours,
      research_areas,
      bio,
      cv_url,
    } = req.body;

    const user = await prisma.users.findUnique({
      where: { id: parseInt(id) },
      include: { faculty: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role !== 'INSTRUCTOR') {
      throw new BadRequestError('User is not an instructor');
    }

    // Check for employee_id conflicts
    if (employee_id && (!user.faculty || employee_id !== user.faculty.employee_id)) {
      const employeeIdExists = await prisma.faculty.findUnique({
        where: { employee_id },
      });
      if (employeeIdExists) {
        throw new ConflictError('Employee ID already in use');
      }
    }

    const facultyData: any = {};

    if (employee_id !== undefined) facultyData.employee_id = employee_id;
    if (title !== undefined) facultyData.title = title;
    if (department !== undefined) facultyData.department = department;
    if (office !== undefined) facultyData.office = office;
    if (office_hours !== undefined) facultyData.office_hours = office_hours;
    if (research_areas !== undefined) facultyData.research_areas = research_areas;
    if (bio !== undefined) facultyData.bio = bio;
    if (cv_url !== undefined) facultyData.cv_url = cv_url;

    let updated;
    if (user.faculty) {
      // Update existing faculty record
      updated = await prisma.faculty.update({
        where: { user_id: parseInt(id) },
        data: facultyData,
      });
    } else {
      // Create new faculty record
      if (!employee_id || !title || !department) {
        throw new BadRequestError('employee_id, title, and department are required for new faculty records');
      }
      updated = await prisma.faculty.create({
        data: {
          user_id: parseInt(id),
          ...facultyData,
        },
      });
    }

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'UPDATE',
        entity_type: 'FACULTY',
        entity_id: updated.id,
        changes: JSON.stringify({
          userId: parseInt(id),
          before: user.faculty,
          after: updated,
        }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Faculty information updated successfully',
      data: updated,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * ===================
 * SYSTEM STATISTICS
 * ===================
 */

/**
 * Get system statistics
 * GET /api/admin/statistics
 */
export const getSystemStatistics = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalStudents,
      totalInstructors,
      totalAdmins,
      totalCourses,
      activeCourses,
      totalEnrollments,
      confirmedEnrollments,
      waitlistedEnrollments,
      pendingEnrollments,
      pendingGrades,
    ] = await Promise.all([
      prisma.users.count({ where: { role: 'STUDENT' } }),
      prisma.users.count({ where: { role: 'INSTRUCTOR' } }),
      prisma.users.count({ where: { role: 'ADMINISTRATOR' } }),
      prisma.courses.count(),
      prisma.courses.count({ where: { status: CourseStatus.ACTIVE } }),
      prisma.enrollments.count(),
      prisma.enrollments.count({ where: { status: EnrollmentStatus.CONFIRMED } }),
      prisma.enrollments.count({ where: { status: EnrollmentStatus.WAITLISTED } }),
      prisma.enrollments.count({ where: { status: EnrollmentStatus.PENDING } }),
      prisma.grades.count({ where: { status: GradeStatus.SUBMITTED } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: {
          total_students: totalStudents,
          total_instructors: totalInstructors,
          total_admins: totalAdmins,
        },
        courses: {
          total: totalCourses,
          active: activeCourses,
        },
        enrollments: {
          total: totalEnrollments,
          confirmed: confirmedEnrollments,
          waitlisted: waitlistedEnrollments,
          pending: pendingEnrollments,
        },
        grades: {
          pending_approval: pendingGrades,
        },
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get aggregated report data for analytics dashboard
 * GET /api/admin/reports
 */
export const getAdminReports = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [confirmedEnrollmentsRaw, popularCoursesRaw, studentsByYearRaw, gpaRecords] = await Promise.all([
      prisma.enrollments.findMany({
        where: {
          status: EnrollmentStatus.CONFIRMED,
        },
        include: {
          courses: {
            select: {
              department: true,
              semester: true,
              year: true,
            },
          },
        },
      }),
      prisma.courses.findMany({
        select: {
          course_code: true,
          course_name: true,
          current_enrollment: true,
          max_capacity: true,
        },
        orderBy: {
          current_enrollment: 'desc',
        },
        take: 5,
      }),
      prisma.students.groupBy({
        by: ['year'],
        _count: {
          _all: true,
        },
        orderBy: {
          year: 'asc',
        },
      }),
      prisma.grades.findMany({
        where: {
          grade_points: {
            not: null,
          },
        },
        select: {
          grade_points: true,
        },
      }),
    ]);

    // Filter out enrollments with null courses (orphaned records)
    const confirmedEnrollments = confirmedEnrollmentsRaw.filter(
      (enrollment) => enrollment.courses !== null
    );

    const departmentCounts = new Map<string, number>();
    const termCounts = new Map<
      string,
      {
        semester: Semester;
        year: number;
        count: number;
      }
    >();

    confirmedEnrollments.forEach((enrollment) => {
      const courseInfo = enrollment.courses;
      const department = courseInfo?.department || 'Unknown';
      departmentCounts.set(department, (departmentCounts.get(department) ?? 0) + 1);

      if (courseInfo?.semester && typeof courseInfo.year === 'number') {
        const key = `${courseInfo.semester}-${courseInfo.year}`;
        const existing = termCounts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          termCounts.set(key, {
            semester: courseInfo.semester,
            year: courseInfo.year,
            count: 1,
          });
        }
      }
    });

    const semesterRank: Record<Semester, number> = {
      SPRING: 0,
      SUMMER: 1,
      FALL: 2,
    };

    const enrollmentsByDepartment = Array.from(departmentCounts.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const enrollmentTrends = Array.from(termCounts.values())
      .sort(
        (a, b) =>
          b.year - a.year ||
          (semesterRank[b.semester] ?? -1) -
            (semesterRank[a.semester] ?? -1)
      )
      .slice(0, 8)
      .map((entry) => ({
        semester: entry.semester,
        year: entry.year,
        count: entry.count,
      }));

    const popularCourses = popularCoursesRaw.map((course) => ({
      courseCode: course.course_code,
      courseName: course.course_name,
      enrollments: course.current_enrollment,
      capacity: course.max_capacity,
      fillRate: course.max_capacity > 0 ? (course.current_enrollment / course.max_capacity) * 100 : 0,
    }));

    const studentsByYear = studentsByYearRaw
      .filter((row) => row.year !== null)
      .map((row) => ({
        year: row.year as number,
        count: row._count._all,
      }));

    const gpaBuckets = [
      { label: '3.5 - 4.0', min: 3.5, max: 4.01 },
      { label: '3.0 - 3.49', min: 3.0, max: 3.5 },
      { label: '2.5 - 2.99', min: 2.5, max: 3.0 },
      { label: '2.0 - 2.49', min: 2.0, max: 2.5 },
      { label: '< 2.0', min: Number.NEGATIVE_INFINITY, max: 2.0 },
    ];

    const gpaCounts = gpaBuckets.map(() => 0);
    gpaRecords.forEach((record) => {
      if (record.grade_points == null) {
        return;
      }
      const value = Number(record.grade_points);
      const bucketIndex = gpaBuckets.findIndex(
        (bucket) => value >= bucket.min && value < bucket.max,
      );
      if (bucketIndex !== -1) {
        gpaCounts[bucketIndex] += 1;
      }
    });

    const gpaDistribution = gpaBuckets.map((bucket, index) => ({
      range: bucket.label,
      count: gpaCounts[index],
    }));

    // Calculate total enrollments
    const totalEnrollments = confirmedEnrollments.length;
    
    // Calculate average GPA
    const validGpaRecords = gpaRecords.filter((r) => r.grade_points != null);
    const avgGpa = validGpaRecords.length > 0
      ? validGpaRecords.reduce((sum, r) => sum + Number(r.grade_points), 0) / validGpaRecords.length
      : 0;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalEnrollments,
          totalDepartments: enrollmentsByDepartment.length,
          averageGpa: parseFloat(avgGpa.toFixed(2)),
        },
        enrollmentsByDepartment,
        enrollmentTrends,
        popularCourses,
        studentsByYear,
        gpaDistribution,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get enrollment statistics by semester
 * GET /api/admin/statistics/enrollments
 */
export const getEnrollmentStatistics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { semester, year } = req.query;

    const where: any = {
      status: EnrollmentStatus.CONFIRMED,
    };

    if (semester || year) {
      where.courses = {};
      if (semester) where.courses.semester = semester as any;
      if (year) where.courses.year = parseInt(year as string);
    }

    const enrollments = await prisma.enrollments.groupBy({
      by: ['course_id'],
      where,
      _count: true,
    });

    const courseIds = enrollments.map((e) => e.course_id);
    const courses = await prisma.courses.findMany({
      where: { id: { in: courseIds } },
      select: {
        id: true,
        course_code: true,
        course_name: true,
        department: true,
        max_capacity: true,
        current_enrollment: true,
      },
    });

    const statistics = enrollments.map((enrollment) => {
      const course = courses.find((c) => c.id === enrollment.course_id);
      return {
        courseId: enrollment.course_id,
        courseCode: course?.course_code,
        courseName: course?.course_name,
        department: course?.department,
        enrolled: enrollment._count,
        capacity: course?.max_capacity,
        fillRate: course && course.max_capacity > 0 ? parseFloat(((enrollment._count / course.max_capacity) * 100).toFixed(2)) : 0,
      };
    });

    res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get grade distribution statistics
 * GET /api/admin/statistics/grades
 */
export const getGradeStatistics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { course_id, semester, year } = req.query;

    const where: any = {
      status: GradeStatus.PUBLISHED,
    };

    if (course_id) {
      where.enrollments = {
        course_id: parseInt(course_id as string),
      };
    } else if (semester || year) {
      where.enrollments = {
        courses: {},
      };
      if (semester) where.enrollments.courses.semester = semester as any;
      if (year) where.enrollments.courses.year = parseInt(year as string);
    }

    const grades = await prisma.grades.groupBy({
      by: ['letter_grade'],
      where,
      _count: true,
      _avg: {
        grade_points: true,
      },
    });

    const distribution = grades.map((g) => ({
      grade: g.letter_grade,
      count: g._count,
      avgGpa: g._avg.grade_points ? parseFloat(g._avg.grade_points.toFixed(2)) : null,
    }));

    res.status(200).json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * ===================
 * WAITLIST MANAGEMENT
 * ===================
 */

/**
 * Get waitlist for a course
 * GET /api/admin/courses/:id/waitlist
 */
export const getCourseWaitlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const waitlist = await prisma.enrollments.findMany({
      where: {
        course_id: parseInt(id),
        status: EnrollmentStatus.WAITLISTED,
      },
      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
            user_identifier: true,
            students_students_user_idTousers: {
              select: {
                student_id: true,
                year: true,
                majors: true,
              },
            },
          },
        },
      },
      orderBy: {
        waitlist_position: 'asc',
      },
    });

    res.status(200).json({
      success: true,
      data: waitlist,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Promote student from waitlist
 * POST /api/admin/enrollments/:id/promote
 */
export const promoteFromWaitlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.enrollments.findUnique({
      where: { id: parseInt(id) },
      include: { courses: true },
    });

    if (!enrollment) {
      throw new NotFoundError('Enrollment not found');
    }

    if (enrollment.status !== EnrollmentStatus.WAITLISTED) {
      throw new BadRequestError('Enrollment is not in waitlisted status');
    }

    // Check if course has space
    if (enrollment.courses && enrollment.courses.current_enrollment >= enrollment.courses.max_capacity) {
      throw new BadRequestError('Course is full');
    }

    // Promote to confirmed
    const updated = await prisma.$transaction(async (tx) => {
      if (enrollment.courses) {
        await tx.courses.update({
          where: { id: enrollment.course_id },
          data: { current_enrollment: { increment: 1 } },
        });
      }

      return tx.enrollments.update({
        where: { id: parseInt(id) },
        data: {
          status: EnrollmentStatus.CONFIRMED,
          waitlist_position: null,
        },
        include: {
          users: true,
          courses: true,
        },
      });
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'PROMOTE',
        entity_type: 'ENROLLMENT',
        entity_id: enrollment.id,
        changes: JSON.stringify({
          oldStatus: enrollment.status,
          newStatus: EnrollmentStatus.CONFIRMED,
        }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Student promoted from waitlist',
      data: updated,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * ===================
 * CONFLICT DETECTION
 * ===================
 */

/**
 * Check for schedule conflicts
 * POST /api/admin/conflicts/check
 */
export const checkConflicts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { user_id, course_ids } = req.body;

    if (!user_id || !course_ids || !Array.isArray(course_ids)) {
      throw new BadRequestError('user_id and course_ids array are required');
    }

    // Get all courses with time slots
    const courses = await prisma.courses.findMany({
      where: {
        id: { in: course_ids },
      },
      include: {
        time_slots: true,
      },
    });

    // Get user's existing enrollments
    const existingEnrollments = await prisma.enrollments.findMany({
      where: {
        user_id: user_id,
        status: EnrollmentStatus.CONFIRMED,
      },
      include: {
        courses: {
          include: {
            time_slots: true,
          },
        },
      },
    });

    const conflicts: any[] = [];

    // Check time conflicts
    for (const newCourse of courses) {
      for (const existingEnrollment of existingEnrollments) {
        if (!newCourse.time_slots || !existingEnrollment.courses?.time_slots) continue;
        for (const newSlot of newCourse.time_slots) {
          for (const existingSlot of existingEnrollment.courses.time_slots) {
            // Check if same day and overlapping times
            if (newSlot.day_of_week === existingSlot.day_of_week) {
              const newStart = newSlot.start_time;
              const newEnd = newSlot.end_time;
              const existingStart = existingSlot.start_time;
              const existingEnd = existingSlot.end_time;

              if (
                (newStart >= existingStart && newStart < existingEnd) ||
                (newEnd > existingStart && newEnd <= existingEnd) ||
                (newStart <= existingStart && newEnd >= existingEnd)
              ) {
                conflicts.push({
                  type: 'TIME_CONFLICT',
                  severity: 'HIGH',
                  newCourse: {
                    id: newCourse.id,
                    code: newCourse.course_code,
                    name: newCourse.course_name,
                    timeSlot: `${newSlot.day_of_week} ${newSlot.start_time}-${newSlot.end_time}`,
                  },
                  conflictingCourse: {
                    id: existingEnrollment.courses?.id,
                    code: existingEnrollment.courses?.course_code,
                    name: existingEnrollment.courses?.course_name,
                    timeSlot: `${existingSlot.day_of_week} ${existingSlot.start_time}-${existingSlot.end_time}`,
                  },
                  message: 'Schedule conflict detected',
                });
              }
            }
          }
        }
      }
    }

    // Check for duplicate enrollment
    for (const newCourse of courses) {
      for (const existingEnrollment of existingEnrollments) {
        if (newCourse.id === existingEnrollment.course_id) {
          conflicts.push({
            type: 'DUPLICATE_ENROLLMENT',
            severity: 'HIGH',
            courseId: newCourse.id,
            courseCode: newCourse.course_code,
            message: 'Already enrolled in this course',
          });
        }
      }
    }

    // Check credit overload
    const totalCredits = courses.reduce((sum, c) => sum + (c.credits || 0), 0);
    const existingCredits = existingEnrollments.reduce(
      (sum, e) => sum + (e.courses?.credits || 0),
      0
    );
    const newTotalCredits = totalCredits + existingCredits;

    if (newTotalCredits > 18) {
      conflicts.push({
        type: 'CREDIT_OVERLOAD',
        severity: 'MEDIUM',
        currentCredits: existingCredits,
        newCredits: totalCredits,
        totalCredits: newTotalCredits,
        limit: 18,
        message: `Total credits (${newTotalCredits}) exceeds limit of 18`,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        hasConflicts: conflicts.length > 0,
        conflicts,
      },
    });
  } catch (error) {
    throw error;
  }
};


/**
 * ===================
 * PROGRAM MANAGEMENT
 * ===================
 */

/**
 * Get all programs/majors
 * GET /api/admin/programs
 */
export const getPrograms = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { department, degree } = req.query;

    const where: any = {};
    if (department) where.department = department as string;
    if (degree) where.degree = degree as any;

    const programs = await prisma.majors.findMany({
      where,
      include: {
        requirements: true,
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform to match frontend expectations (camelCase)
    const transformedPrograms = programs.map((program: any) => ({
      id: program.id,
      code: program.code,
      name: program.name,
      department: program.department,
      degree: program.degree,
      totalCredits: program.totalCredits || program.total_credits,
      description: program.description,
      requirements: program.requirements?.map((req: any) => ({
        id: req.id,
        category: req.category,
        name: req.name,
        credits: req.credits,
        description: req.description,
      })),
      studentCount: program._count?.students || 0,
    }));

    res.status(200).json({
      success: true,
      data: transformedPrograms,
    });
  } catch (error: any) {
    console.error('Error in getPrograms:', error);
    // If it's a Prisma error, provide more details
    if (error.code) {
      console.error('Prisma error code:', error.code);
      console.error('Prisma error message:', error.message);
    }
    throw error;
  }
};

/**
 * Get program by ID
 * GET /api/admin/programs/:id
 */
export const getProgramById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const program = await prisma.majors.findUnique({
      where: { id: parseInt(id) },
      include: {
        requirements: {
          orderBy: {
            category: 'asc',
          },
        },
        students: {
          include: {
            users_students_user_idTousers: {
              select: {
                id: true,
                full_name: true,
                email: true,
                user_identifier: true,
              },
            },
          },
        },
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    if (!program) {
      throw new NotFoundError('Program not found');
    }

    // Format response
    const formatted = {
      id: program.id,
      code: program.code,
      name: program.name,
      department: program.department,
      degree: program.degree,
      totalCredits: program.total_credits,
      description: program.description,
      requirements: program.requirements.map((req) => ({
        id: req.id,
        category: req.category,
        name: req.name,
        credits: req.credits,
        courses: req.courses,
        description: req.description,
      })),
      studentCount: program._count.students,
      students: program.students.map((student) => ({
        id: student.users_students_user_idTousers.id,
        fullName: student.users_students_user_idTousers.full_name,
        email: student.users_students_user_idTousers.email,
        userIdentifier: student.users_students_user_idTousers.user_identifier,
        studentId: student.student_id,
        year: student.year,
        status: student.status,
      })),
    };

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Create new program
 * POST /api/admin/programs
 */
export const createProgram = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, name, department, degree, total_credits, description, requirements } = req.body;

    const existing = await prisma.majors.findUnique({
      where: { code },
    });

    if (existing) {
      throw new ConflictError('Program with this code already exists');
    }

    const program = await prisma.majors.create({
      data: {
        code,
        name,
        department,
        degree,
        total_credits: total_credits,
        description,
        requirements: {
          create: requirements?.map((req: any) => ({
            category: req.category,
            name: req.name,
            credits: req.credits,
            courses: req.courses,
            description: req.description,
          })) || [],
        },
      },
      include: {
        requirements: true,
      },
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'CREATE',
        entity_type: 'PROGRAM',
        entity_id: program.id,
        changes: JSON.stringify({ created: program }),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Program created successfully',
      data: program,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Update program
 * PUT /api/admin/programs/:id
 */
export const updateProgram = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, total_credits } = req.body;

    const program = await prisma.majors.findUnique({
      where: { id: parseInt(id) },
    });

    if (!program) {
      throw new NotFoundError('Program not found');
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (total_credits !== undefined) updateData.total_credits = total_credits;

    const updated = await prisma.majors.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        requirements: true,
      },
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'UPDATE',
        entity_type: 'PROGRAM',
        entity_id: program.id,
        changes: JSON.stringify({ before: program, after: updated }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Program updated successfully',
      data: updated,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * ===================
 * BULK OPERATIONS
 * ===================
 */

/**
 * Bulk import students from CSV
 * POST /api/admin/students/import
 */
export const bulkImportStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      throw new BadRequestError('students array is required');
    }

    const results = {
      success: [] as any[],
      failed: [] as any[],
    };

    const bcrypt = require('bcryptjs');

    for (const studentData of students) {
      try {
        const {
          student_id,
          email,
          full_name,
          password,
          major_id,
          year,
          admission_date,
        } = studentData;

        // Check if exists
        const existing = await prisma.users.findFirst({
          where: {
            OR: [{ email }, { user_identifier: student_id }],
          },
        });

        if (existing) {
          results.failed.push({
            studentId: student_id,
            email,
            reason: 'User already exists',
          });
          continue;
        }

        const passwordHash = await bcrypt.hash(password || 'Welcome123!', 10);

        const user = await prisma.users.create({
          data: {
            user_identifier: student_id,
            email,
            password_hash: passwordHash,
            full_name: full_name,
            role: 'STUDENT',
            updated_at: new Date(),
            students_students_user_idTousers: {
              create: {
                student_id: student_id,
                major_id: major_id,
                year: year || 1,
                admission_date: new Date(admission_date),
                status: StudentStatus.ACTIVE,
              },
            },
          },
          include: {
            students_students_user_idTousers: true,
          },
        });

        results.success.push({
          id: user.id,
          studentId: student_id,
          email,
          fullName: full_name,
        });
      } catch (error: any) {
        results.failed.push({
          studentId: studentData.student_id,
          email: studentData.email,
          reason: error.message || 'Import failed',
        });
      }
    }

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'BULK_IMPORT',
        entity_type: 'STUDENT',
        entity_id: 0,
        changes: JSON.stringify({
          total: students.length,
          success: results.success.length,
          failed: results.failed.length,
        }),
      },
    });

    res.status(200).json({
      success: true,
      message: `Imported ${results.success.length} students, ${results.failed.length} failed`,
      data: results,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Export students to CSV format
 * GET /api/admin/students/export
 */
export const exportStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, major, year } = req.query;

    const where: any = {};
    if (status) where.status = status as StudentStatus;
    if (year) where.year = parseInt(year as string);
    if (major) {
      where.majors = {
        name: { contains: major as string, mode: 'insensitive' },
      };
    }

    const students = await prisma.students.findMany({
      where,
      include: {
        users_students_user_idTousers: {
          select: {
            user_identifier: true,
            email: true,
            full_name: true,
            created_at: true,
          },
        },
        majors: true,
      },
    });

    const csvData = students.map((s) => ({
      student_id: s.student_id,
      user_identifier: s.users_students_user_idTousers.user_identifier,
      full_name: s.users_students_user_idTousers.full_name,
      email: s.users_students_user_idTousers.email,
      major: s.majors?.name || '',
      major_code: s.majors?.code || '',
      year: s.year,
      status: s.status,
      admission_date: s.admission_date.toISOString().split('T')[0],
      expected_graduation: s.expected_grad?.toISOString().split('T')[0] || '',
      created_at: s.users_students_user_idTousers.created_at.toISOString(),
    }));

    res.status(200).json({
      success: true,
      data: csvData,
      metadata: {
        total: csvData.length,
        exportedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * ===================
 * EMAIL NOTIFICATIONS
 * ===================
 */

/**
 * Send email to students
 * POST /api/admin/emails/send
 */
export const sendEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { recipient_ids, subject, message, template } = req.body;

    if (!recipient_ids || !Array.isArray(recipient_ids) || recipient_ids.length === 0) {
      throw new BadRequestError('recipient_ids array is required');
    }

    if (!subject || !message) {
      throw new BadRequestError('subject and message are required');
    }

    // Get recipients
    const recipients = await prisma.users.findMany({
      where: {
        id: { in: recipient_ids },
      },
      select: {
        id: true,
        email: true,
        full_name: true,
      },
    });

    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    // For now, we'll log the emails and store in database
    const emailLogs = await Promise.all(
      recipients.map(async (recipient) => {
        // TODO: Actual email sending logic here
        // await emailService.send({
        //   to: recipient.email,
        //   subject,
        //   body: message,
        // });

        return {
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          recipientName: recipient.full_name,
          subject,
          message,
          template,
          status: 'QUEUED', // Would be SENT in production
          sentAt: new Date(),
        };
      })
    );

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'SEND_EMAIL',
        entity_type: 'USER',
        entity_id: 0,
        changes: JSON.stringify({
          recipientCount: recipients.length,
          subject,
          template,
        }),
      },
    });

    res.status(200).json({
      success: true,
      message: `Email queued for ${recipients.length} recipients`,
      data: {
        sent: emailLogs.length,
        recipients: emailLogs,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Send bulk email to students by filter
 * POST /api/admin/emails/bulk
 */
export const sendBulkEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, major, year, subject, message } = req.body;

    if (!subject || !message) {
      throw new BadRequestError('subject and message are required');
    }

    // Build filter
    const where: any = {};

    if (role) where.role = role as any;

    if (major || year) {
      where.students_students_user_idTousers = {};
      if (year) where.students_students_user_idTousers.year = parseInt(year);
      if (major) {
        where.students_students_user_idTousers.majors = {
          name: { contains: major, mode: 'insensitive' },
        };
      }
    }

    // Get recipients
    const recipients = await prisma.users.findMany({
      where,
      select: {
        id: true,
        email: true,
        full_name: true,
      },
    });

    if (recipients.length === 0) {
      throw new BadRequestError('No recipients match the specified criteria');
    }

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'SEND_BULK_EMAIL',
        entity_type: 'USER',
        entity_id: 0,
        changes: JSON.stringify({
          recipientCount: recipients.length,
          subject,
          filters: { role, major, year },
        }),
      },
    });

    res.status(200).json({
      success: true,
      message: `Bulk email queued for ${recipients.length} recipients`,
      data: {
        recipientCount: recipients.length,
        filters: { role, major, year },
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * ===================
 * TRANSCRIPT GENERATION
 * ===================
 */

/**
 * Generate transcript for student
 * GET /api/admin/transcripts/:studentId/generate
 */
export const generateTranscript = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;
    const { format = 'json' } = req.query;

    const student = await prisma.students.findFirst({
      where: {
        OR: [
          { id: parseInt(studentId) },
          { student_id: studentId },
        ],
      },
      include: {
        users_students_user_idTousers: {
          include: {
            enrollments: {
              where: {
                status: EnrollmentStatus.CONFIRMED,
              },
              include: {
                courses: true,
                grades: {
                  where: {
                    status: GradeStatus.PUBLISHED,
                  },
                },
              },
              orderBy: [
                { courses: { year: 'asc' } },
                { courses: { semester: 'asc' } },
              ],
            },
            personal_info: true,
          },
        },
        majors: true,
      },
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    // Group courses by semester/year
    const transcriptData: any = {};

    student.users_students_user_idTousers.enrollments.forEach((enrollment) => {
      const key = `${enrollment.courses.year}-${enrollment.courses.semester}`;

      if (!transcriptData[key]) {
        transcriptData[key] = {
          year: enrollment.courses.year,
          semester: enrollment.courses.semester,
          courses: [],
          semesterCredits: 0,
          semesterGPA: 0,
        };
      }

      const grade = enrollment.grades;
      transcriptData[key].courses.push({
        courseCode: enrollment.courses.course_code,
        courseName: enrollment.courses.course_name,
        credits: enrollment.courses.credits,
        grade: grade?.letter_grade || 'IP',
        gradePoints: grade?.grade_points || 0,
      });

      if (grade) {
        transcriptData[key].semesterCredits += enrollment.courses.credits;
      }
    });

    // Calculate semester GPAs
    Object.values(transcriptData).forEach((semester: any) => {
      // Filter out withdrawn courses (W) for GPA calculation
      const coursesForGPA = semester.courses.filter(
        (course: any) => course.grade && course.grade.toUpperCase() !== 'W' && course.gradePoints !== null && course.gradePoints !== undefined
      );
      
      if (coursesForGPA.length > 0) {
        const totalPoints = coursesForGPA.reduce(
          (sum: number, course: any) => sum + course.gradePoints * course.credits,
          0
        );
        const totalCredits = coursesForGPA.reduce(
          (sum: number, course: any) => sum + course.credits,
          0
        );
        semester.semesterGPA = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(3)) : 0;
      }
    });

    // Calculate cumulative GPA
    const allGrades = student.users_students_user_idTousers.enrollments
      .filter((e) => 
        e.grades && 
        e.grades.status === GradeStatus.PUBLISHED &&
        e.grades.letter_grade && e.grades.letter_grade.toUpperCase() !== 'W' // Exclude withdrawn courses
      )
      .map((e) => ({
        credits: e.courses.credits,
        gradePoints: e.grades!.grade_points || 0,
      }));

    const totalCredits = allGrades.reduce((sum, g) => sum + g.credits, 0);
    const totalPoints = allGrades.reduce((sum, g) => sum + g.gradePoints * g.credits, 0);
    const cumulativeGPA = totalCredits > 0 ? totalPoints / totalCredits : 0;

    const transcript = {
      studentInfo: {
        studentId: student.student_id,
        fullName: student.users_students_user_idTousers.full_name,
        email: student.users_students_user_idTousers.email,
        major: student.majors?.name,
        admissionDate: student.admission_date,
        expectedGraduation: student.expected_grad,
        status: student.status,
      },
      academicRecord: Object.values(transcriptData),
      summary: {
        totalCreditsAttempted: student.users_students_user_idTousers.enrollments.length * 3, // Estimate
        totalCreditsEarned: totalCredits,
        cumulativeGPA: parseFloat(cumulativeGPA.toFixed(3)),
      },
      generatedAt: new Date().toISOString(),
      generatedBy: (req.user as any).fullName || (req.user as any).full_name || 'Admin',
      isOfficial: true,
    };

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'GENERATE_TRANSCRIPT',
        entity_type: 'STUDENT',
        entity_id: student.id,
        changes: JSON.stringify({ format, generatedAt: new Date() }),
      },
    });

    // In production, generate PDF using a library like pdfmake
    if (format === 'pdf') {
      // TODO: Generate PDF
      // const pdfBuffer = await generatePDF(transcript);
      // res.setHeader('Content-Type', 'application/pdf');
      // res.setHeader('Content-Disposition', `attachment; filename="transcript-${student.studentId}.pdf"`);
      // return res.send(pdfBuffer);

      res.status(501).json({
        success: false,
        message: 'PDF generation not yet implemented. Use format=json instead.',
        data: transcript,
      });
    } else {
      res.status(200).json({
        success: true,
        data: transcript,
      });
    }
  } catch (error) {
    throw error;
  }
};

/**
 * ===================
 * ACADEMIC CALENDAR
 * ===================
 */

/**
 * Get all academic terms
 * GET /api/admin/calendar/terms
 */
export const getAcademicTerms = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { year, active } = req.query;

    const where: any = {};
    
    if (year) {
      const yearNum = parseInt(year as string);
      // Filter by year based on startDate
      const yearStart = new Date(`${yearNum}-01-01`);
      const yearEnd = new Date(`${yearNum + 1}-01-01`);
      
      if (active === 'true') {
        const now = new Date();
        where.startDate = {
          gte: yearStart,
          lt: yearEnd,
          lte: now,
        };
        where.endDate = { gte: now };
        where.isActive = true;
      } else {
        where.startDate = {
          gte: yearStart,
          lt: yearEnd,
        };
      }
    } else if (active === 'true') {
      const now = new Date();
      where.startDate = { lte: now };
      where.endDate = { gte: now };
      where.isActive = true;
    }

    const terms = await prisma.term.findMany({
      where,
      orderBy: {
        startDate: 'asc',
      },
    });

    // Transform to match expected API response format
    const formattedTerms = terms.map((term) => ({
      id: term.id,
      name: term.name,
      code: term.code,
      type: term.type,
      status: term.status,
      startDate: term.startDate.toISOString().split('T')[0],
      endDate: term.endDate.toISOString().split('T')[0],
      enrollmentStart: term.enrollmentStart.toISOString().split('T')[0],
      enrollmentEnd: term.enrollmentEnd.toISOString().split('T')[0],
      isActive: term.isActive ?? false,
      createdAt: term.createdAt?.toISOString(),
    }));

    res.status(200).json({
      success: true,
      data: formattedTerms,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Create academic term
 * POST /api/admin/calendar/terms
 */
export const createAcademicTerm = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      code,
      type,
      status,
      start_date,
      end_date,
      enrollment_start,
      enrollment_end,
      is_active,
    } = req.body;

    if (!name || !code || !type || !start_date || !end_date || !enrollment_start || !enrollment_end) {
      throw new BadRequestError('Missing required fields: name, code, type, start_date, end_date, enrollment_start, enrollment_end');
    }

    // Check if term code already exists
    const existingTerm = await prisma.term.findUnique({
      where: { code },
    });

    if (existingTerm) {
      throw new ConflictError(`Term with code ${code} already exists`);
    }

    const newTerm = await prisma.term.create({
      data: {
        name,
        code,
        type,
        status: status || 'PLANNED',
        startDate: new Date(start_date),
        endDate: new Date(end_date),
        enrollmentStart: new Date(enrollment_start),
        enrollmentEnd: new Date(enrollment_end),
        isActive: is_active ?? false,
      },
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'CREATE',
        entity_type: 'TERM',
        entity_id: newTerm.id,
        changes: JSON.stringify({ created: newTerm }),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Academic term created successfully',
      data: {
        id: newTerm.id,
        name: newTerm.name,
        code: newTerm.code,
        type: newTerm.type,
        status: newTerm.status,
        startDate: newTerm.startDate.toISOString().split('T')[0],
        endDate: newTerm.endDate.toISOString().split('T')[0],
        enrollmentStart: newTerm.enrollmentStart.toISOString().split('T')[0],
        enrollmentEnd: newTerm.enrollmentEnd.toISOString().split('T')[0],
        isActive: newTerm.isActive ?? false,
        createdAt: newTerm.createdAt?.toISOString(),
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Update academic term
 * PUT /api/admin/calendar/terms/:id
 */
export const updateAcademicTerm = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      type,
      status,
      start_date,
      end_date,
      enrollment_start,
      enrollment_end,
      is_active,
    } = req.body;

    // Check if term exists
    const existingTerm = await prisma.term.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingTerm) {
      throw new NotFoundError(`Term with id ${id} not found`);
    }

    // If code is being updated, check for conflicts
    if (code && code !== existingTerm.code) {
      const codeConflict = await prisma.term.findUnique({
        where: { code },
      });
      if (codeConflict) {
        throw new ConflictError(`Term with code ${code} already exists`);
      }
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (start_date !== undefined) updateData.startDate = new Date(start_date);
    if (end_date !== undefined) updateData.endDate = new Date(end_date);
    if (enrollment_start !== undefined) updateData.enrollmentStart = new Date(enrollment_start);
    if (enrollment_end !== undefined) updateData.enrollmentEnd = new Date(enrollment_end);
    if (is_active !== undefined) updateData.isActive = is_active;

    const updatedTerm = await prisma.term.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'UPDATE',
        entity_type: 'TERM',
        entity_id: updatedTerm.id,
        changes: JSON.stringify({ before: existingTerm, after: updatedTerm }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Academic term updated successfully',
      data: {
        id: updatedTerm.id,
        name: updatedTerm.name,
        code: updatedTerm.code,
        type: updatedTerm.type,
        status: updatedTerm.status,
        startDate: updatedTerm.startDate.toISOString().split('T')[0],
        endDate: updatedTerm.endDate.toISOString().split('T')[0],
        enrollmentStart: updatedTerm.enrollmentStart.toISOString().split('T')[0],
        enrollmentEnd: updatedTerm.enrollmentEnd.toISOString().split('T')[0],
        isActive: updatedTerm.isActive ?? false,
        createdAt: updatedTerm.createdAt?.toISOString(),
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * ===================
 * CAMPUS INFORMATION
 * ===================
 */

/**
 * Create a new announcement
 * POST /api/admin/announcements
 */
export const createAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      content,
      type,
      priority,
      target_audience,
      publish_date,
      expiry_date,
      is_active,
      attachments,
    } = req.body;

    if (!title || !content || !type) {
      throw new BadRequestError('Missing required fields: title, content, type');
    }

    const user = req.user!;

    const announcement = await prisma.announcements.create({
      data: {
        title,
        content,
        type: type as any,
        priority: priority || 'NORMAL',
        target_audience: target_audience || ['ALL'],
        publish_date: publish_date ? new Date(publish_date) : new Date(),
        expiry_date: expiry_date ? new Date(expiry_date) : null,
        is_active: is_active !== undefined ? is_active : true,
        created_by: user.id,
        attachments: attachments || null,
      },
      include: {
        users: {
          select: {
            full_name: true,
            role: true,
          },
        },
      },
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: user.id,
        action: 'CREATE',
        entity_type: 'ANNOUNCEMENT',
        entity_id: announcement.id,
        changes: JSON.stringify({ created: announcement }),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        priority: announcement.priority,
        targetAudience: announcement.target_audience,
        publishDate: announcement.publish_date,
        expiryDate: announcement.expiry_date,
        isActive: announcement.is_active,
        author: announcement.users?.full_name || 'Unknown',
        attachments: announcement.attachments,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new event
 * POST /api/admin/events
 */
export const createEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      location,
      start_time,
      end_time,
      category,
      organizer,
      registration_url,
      capacity,
      is_public,
    } = req.body;

    if (!title || !description || !location || !start_time || !end_time || !category || !organizer) {
      throw new BadRequestError('Missing required fields: title, description, location, start_time, end_time, category, organizer');
    }

    const event = await prisma.events.create({
      data: {
        title,
        description,
        location,
        start_time: new Date(start_time),
        end_time: new Date(end_time),
        category: category as any,
        organizer,
        registration_url: registration_url || null,
        capacity: capacity || null,
        registered: 0,
        is_public: is_public !== undefined ? is_public : true,
      },
    });

    // Log audit
    await prisma.audit_logs.create({
      data: {
        user_id: req.user!.id,
        action: 'CREATE',
        entity_type: 'EVENT',
        entity_id: event.id,
        changes: JSON.stringify({ created: event }),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startTime: event.start_time,
        endTime: event.end_time,
        category: event.category,
        organizer: event.organizer,
        registrationUrl: event.registration_url,
        capacity: event.capacity,
        registered: event.registered,
        isPublic: event.is_public,
        createdAt: event.created_at,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * ===================
 * EXAM SCHEDULE MANAGEMENT
 * ===================
 */

/**
 * Get all exam schedules
 * GET /api/admin/exam-schedules
 */
export const getAllExamSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { term, year, courseCode } = req.query;
    
    const where: any = {};
    
    if (term) {
      where.term = getFirstQueryValue(term as string | string[] | undefined);
    }
    
    if (year) {
      where.year = parseIntegerParam(year as string | string[] | undefined);
    }
    
    if (courseCode) {
      where.course_code = getFirstQueryValue(courseCode as string | string[] | undefined);
    }
    
    const examSchedules = await (prisma as any).exam_schedules.findMany({
      where,
      orderBy: [
        { exam_date: 'asc' },
        { start_time: 'asc' }
      ],
      include: {
        courses: {
          select: {
            id: true,
            course_code: true,
            course_name: true,
            department: true,
            credits: true,
          }
        }
      }
    });
    
    res.status(200).json({
      success: true,
      data: examSchedules.map((exam: any) => ({
        id: exam.id,
        courseId: exam.course_id,
        courseCode: exam.course_code,
        courseName: exam.course_name,
        examDate: exam.exam_date,
        startTime: exam.start_time,
        endTime: exam.end_time,
        location: exam.location,
        term: exam.term,
        year: exam.year,
        course: exam.courses,
        createdAt: exam.created_at,
        updatedAt: exam.updated_at,
      }))
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get exam schedules'
    });
  }
};

/**
 * Get exam schedule by ID
 * GET /api/admin/exam-schedules/:id
 */
export const getExamScheduleById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const examSchedule = await (prisma as any).exam_schedules.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        courses: {
          select: {
            id: true,
            course_code: true,
            course_name: true,
            department: true,
            credits: true,
          }
        }
      }
    });
    
    if (!examSchedule) {
      throw new NotFoundError('Exam schedule not found');
    }
    
    res.status(200).json({
      success: true,
      data: {
        id: examSchedule.id,
        courseId: examSchedule.course_id,
        courseCode: examSchedule.course_code,
        courseName: examSchedule.course_name,
        examDate: examSchedule.exam_date,
        startTime: examSchedule.start_time,
        endTime: examSchedule.end_time,
        location: examSchedule.location,
        term: examSchedule.term,
        year: examSchedule.year,
        course: examSchedule.courses,
        createdAt: examSchedule.created_at,
        updatedAt: examSchedule.updated_at,
      }
    });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get exam schedule'
      });
    }
  }
};

/**
 * Create exam schedule
 * POST /api/admin/exam-schedules
 */
export const createExamSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      course_id,
      course_code,
      course_name,
      exam_date,
      start_time,
      end_time,
      location,
      term,
      year,
    } = req.body;
    
    // Validation
    if (!course_code || !course_name || !exam_date || !term || !year) {
      throw new BadRequestError('Missing required fields: course_code, course_name, exam_date, term, year');
    }
    
    // If course_id is provided, verify the course exists
    if (course_id) {
      const course = await prisma.courses.findUnique({
        where: { id: course_id }
      });
      
      if (!course) {
        throw new NotFoundError('Course not found');
      }
    }
    
    const examSchedule = await (prisma as any).exam_schedules.create({
      data: {
        course_id: course_id || null,
        course_code,
        course_name,
        exam_date: new Date(exam_date),
        start_time: start_time || null,
        end_time: end_time || null,
        location: location || null,
        term,
        year: parseInt(year, 10),
      }
    });
    
    res.status(201).json({
      success: true,
      data: {
        id: examSchedule.id,
        courseId: examSchedule.course_id,
        courseCode: examSchedule.course_code,
        courseName: examSchedule.course_name,
        examDate: examSchedule.exam_date,
        startTime: examSchedule.start_time,
        endTime: examSchedule.end_time,
        location: examSchedule.location,
        term: examSchedule.term,
        year: examSchedule.year,
        createdAt: examSchedule.created_at,
        updatedAt: examSchedule.updated_at,
      }
    });
  } catch (error: any) {
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      res.status(error instanceof BadRequestError ? 400 : 404).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create exam schedule'
      });
    }
  }
};

/**
 * Update exam schedule
 * PUT /api/admin/exam-schedules/:id
 */
export const updateExamSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      course_id,
      course_code,
      course_name,
      exam_date,
      start_time,
      end_time,
      location,
      term,
      year,
    } = req.body;
    
    // Check if exam schedule exists
    const existing = await (prisma as any).exam_schedules.findUnique({
      where: { id: parseInt(id, 10) }
    });
    
    if (!existing) {
      throw new NotFoundError('Exam schedule not found');
    }
    
    // If course_id is provided, verify the course exists
    if (course_id) {
      const course = await prisma.courses.findUnique({
        where: { id: course_id }
      });
      
      if (!course) {
        throw new NotFoundError('Course not found');
      }
    }
    
    const updateData: any = {};
    
    if (course_id !== undefined) updateData.course_id = course_id || null;
    if (course_code !== undefined) updateData.course_code = course_code;
    if (course_name !== undefined) updateData.course_name = course_name;
    if (exam_date !== undefined) updateData.exam_date = new Date(exam_date);
    if (start_time !== undefined) updateData.start_time = start_time || null;
    if (end_time !== undefined) updateData.end_time = end_time || null;
    if (location !== undefined) updateData.location = location || null;
    if (term !== undefined) updateData.term = term;
    if (year !== undefined) updateData.year = parseInt(year, 10);
    
    const examSchedule = await (prisma as any).exam_schedules.update({
      where: { id: parseInt(id, 10) },
      data: updateData
    });
    
    res.status(200).json({
      success: true,
      data: {
        id: examSchedule.id,
        courseId: examSchedule.course_id,
        courseCode: examSchedule.course_code,
        courseName: examSchedule.course_name,
        examDate: examSchedule.exam_date,
        startTime: examSchedule.start_time,
        endTime: examSchedule.end_time,
        location: examSchedule.location,
        term: examSchedule.term,
        year: examSchedule.year,
        createdAt: examSchedule.created_at,
        updatedAt: examSchedule.updated_at,
      }
    });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update exam schedule'
      });
    }
  }
};

/**
 * Delete exam schedule
 * DELETE /api/admin/exam-schedules/:id
 */
export const deleteExamSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const examSchedule = await (prisma as any).exam_schedules.findUnique({
      where: { id: parseInt(id, 10) }
    });
    
    if (!examSchedule) {
      throw new NotFoundError('Exam schedule not found');
    }
    
    await (prisma as any).exam_schedules.delete({
      where: { id: parseInt(id, 10) }
    });
    
    res.status(200).json({
      success: true,
      message: 'Exam schedule deleted successfully'
    });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete exam schedule'
      });
    }
  }
};

