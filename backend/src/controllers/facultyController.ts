import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { Role } from '@prisma/client';

/**
 * Get courses taught by the authenticated instructor
 */
export async function getMyCourses(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;

    if (user.role !== 'INSTRUCTOR') {
      throw new AppError('Unauthorized', 403);
    }

    const courses = await prisma.courses.findMany({
      where: { instructor_id: user.id },
      include: {
        enrollments: {
          where: {
            status: 'CONFIRMED',
          },
        },
        time_slots: true,
      },
      orderBy: [
        { year: 'desc' },
        { semester: 'desc' },
      ],
    });

    res.json({
      success: true,
      data: courses.map(course => ({
        id: course.id,
        courseCode: course.course_code,
        courseName: course.course_name,
        credits: course.credits,
        semester: course.semester,
        year: course.year,
        maxCapacity: course.max_capacity,
        currentEnrollment: course.current_enrollment,
        timeSlots: course.time_slots,
      })),
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Get my courses error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch courses',
      });
    }
  }
}

/**
 * Get course roster
 */
export async function getRoster(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const { courseId } = req.params;

    if (user.role !== 'INSTRUCTOR') {
      throw new AppError('Unauthorized', 403);
    }

    const course = await prisma.courses.findFirst({
      where: {
        id: parseInt(courseId),
        instructorId: user.id,
      },
      include: {
        enrollments: {
          where: {
            status: 'CONFIRMED',
          },
          include: {
            user: {
              include: {
                student: {
                  include: {
                    major: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new AppError('Course not found or unauthorized', 404);
    }

    res.json({
      success: true,
      data: {
        course: {
          courseCode: course.courseCode,
          courseName: course.name,
        },
        students: course.enrollments.map(e => ({
          enrollmentId: e.id,
          userId: e.user.id,
          studentId: e.user.student?.studentId,
          fullName: `${e.user.firstName} ${e.user.lastName}`,
          email: e.user.email,
          major: e.user.student?.major?.name,
          year: e.user.student?.year,
        })),
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Get roster error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch roster',
      });
    }
  }
}

/**
 * Get course grades
 */
export async function getCourseGrades(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const { courseId } = req.params;

    if (user.role !== 'INSTRUCTOR') {
      throw new AppError('Unauthorized', 403);
    }

    const course = await prisma.courses.findFirst({
      where: {
        id: parseInt(courseId),
        instructorId: user.id,
      },
      include: {
        enrollments: {
          where: {
            status: 'CONFIRMED',
          },
          include: {
            user: {
              include: {
                student: true,
              },
            },
            grade: true,
          },
        },
      },
    });

    if (!course) {
      throw new AppError('Course not found or unauthorized', 404);
    }

    res.json({
      success: true,
      data: course.enrollments.map(e => ({
        enrollmentId: e.id,
        studentId: e.user.student?.studentId,
        fullName: e.user.fullName,
        letterGrade: e.grade?.letterGrade,
        numericGrade: e.grade?.numericGrade,
        gradePoints: e.grade?.gradePoints,
        status: e.grade?.status || 'IN_PROGRESS',
        comments: e.grade?.comments,
      })),
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Get course grades error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch grades',
      });
    }
  }
}

/**
 * Submit grades for students
 */
export async function submitGrades(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const { grades } = req.body; // Array of { enrollmentId, numericGrade, letterGrade, comments }

    if (user.role !== 'INSTRUCTOR') {
      throw new AppError('Unauthorized', 403);
    }

    if (!Array.isArray(grades) || grades.length === 0) {
      throw new AppError('Grades array is required', 400);
    }

    const results = await Promise.all(
      grades.map(async (gradeData) => {
        const { enrollmentId, numericGrade, letterGrade, comments } = gradeData;

        // Calculate grade points based on letter grade
        const gradePoints = calculateGradePoints(letterGrade);

        return prisma.grades.upsert({
          where: { enrollment_id: parseInt(enrollmentId) },
          update: {
            numeric_grade: parseFloat(numericGrade),
            letter_grade: letterGrade,
            grade_points: gradePoints,
            comments,
            status: 'SUBMITTED',
            submitted_by: user.id,
            submitted_at: new Date(),
          },
          create: {
            enrollment_id: parseInt(enrollmentId),
            numeric_grade: parseFloat(numericGrade),
            letter_grade: letterGrade,
            grade_points: gradePoints,
            comments,
            status: 'SUBMITTED',
            submitted_by: user.id,
            submitted_at: new Date(),
          },
        });
      })
    );

    res.json({
      success: true,
      message: `${results.length} grades submitted successfully`,
      data: results,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Submit grades error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit grades',
      });
    }
  }
}

/**
 * Update a single grade
 */
export async function updateGrade(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const { gradeId } = req.params;
    const { numericGrade, letterGrade, comments } = req.body;

    if (user.role !== 'INSTRUCTOR') {
      throw new AppError('Unauthorized', 403);
    }

    const gradePoints = calculateGradePoints(letterGrade);

    const grade = await prisma.grades.update({
      where: { id: parseInt(gradeId) },
      data: {
        numeric_grade: numericGrade ? parseFloat(numericGrade) : undefined,
        letter_grade: letterGrade,
        grade_points: gradePoints,
        comments,
        submitted_by: user.id,
        submitted_at: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Grade updated successfully',
      data: grade,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Update grade error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update grade',
      });
    }
  }
}

/**
 * Get attendance for a course
 */
export async function getAttendance(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const { courseId } = req.params;

    if (user.role !== 'INSTRUCTOR') {
      throw new AppError('Unauthorized', 403);
    }

    const course = await prisma.courses.findFirst({
      where: {
        id: parseInt(courseId),
        instructorId: user.id,
      },
      include: {
        enrollments: {
          where: {
            status: 'CONFIRMED',
          },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                student: {
                  select: {
                    studentId: true,
                  },
                },
              },
            },
            attendance: {
              orderBy: {
                date: 'desc',
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new AppError('Course not found or unauthorized', 404);
    }

    res.json({
      success: true,
      data: course.enrollments.map(e => ({
        enrollmentId: e.id,
        studentId: e.user.student?.studentId,
        fullName: e.user.fullName,
        attendance: e.attendance,
      })),
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Get attendance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch attendance',
      });
    }
  }
}

/**
 * Mark attendance
 */
export async function markAttendance(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const { attendanceRecords } = req.body; // Array of { enrollmentId, date, status, notes }

    if (user.role !== 'INSTRUCTOR') {
      throw new AppError('Unauthorized', 403);
    }

    if (!Array.isArray(attendanceRecords)) {
      throw new AppError('Attendance records array is required', 400);
    }

    const results = await Promise.all(
      attendanceRecords.map(async (record) => {
        const { enrollmentId, date, status, notes } = record;

        return prisma.attendance.upsert({
          where: {
            enrollment_id_date: {
              enrollment_id: parseInt(enrollmentId),
              date: new Date(date),
            },
          },
          update: {
            status,
            notes,
            marked_by: user.id,
          },
          create: {
            enrollment_id: parseInt(enrollmentId),
            date: new Date(date),
            status,
            notes,
            marked_by: user.id,
          },
        });
      })
    );

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: results,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Mark attendance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark attendance',
      });
    }
  }
}

/**
 * Get course materials
 */
export async function getMaterials(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const { courseId } = req.params;

    const course = await prisma.courses.findFirst({
      where: {
        id: parseInt(courseId),
        instructorId: user.id,
      },
      include: {
        materials: {
          orderBy: {
            uploadedAt: 'desc',
          },
        },
      },
    });

    if (!course) {
      throw new AppError('Course not found or unauthorized', 404);
    }

    res.json({
      success: true,
      data: course.materials,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Get materials error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch materials',
      });
    }
  }
}

/**
 * Upload course material
 */
export async function uploadMaterial(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const { courseId } = req.params;
    const { title, description, type, fileUrl, fileName, fileSize, isVisible } = req.body;

    if (user.role !== 'INSTRUCTOR') {
      throw new AppError('Unauthorized', 403);
    }

    // Verify instructor owns the course
    const course = await prisma.courses.findFirst({
      where: {
        id: parseInt(courseId),
        instructorId: user.id,
      },
    });

    if (!course) {
      throw new AppError('Course not found or unauthorized', 404);
    }

    const material = await prisma.course_materials.create({
      data: {
        course_id: parseInt(courseId),
        title,
        description,
        type,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize ? parseInt(fileSize) : null,
        uploaded_by: user.id,
        is_visible: isVisible !== undefined ? isVisible : true,
      },
    });

    res.json({
      success: true,
      message: 'Material uploaded successfully',
      data: material,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Upload material error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload material',
      });
    }
  }
}

// Helper function to calculate grade points
function calculateGradePoints(letterGrade: string): number {
  const gradeMap: Record<string, number> = {
    'A+': 4.0,
    'A': 4.0,
    'A-': 3.7,
    'B+': 3.3,
    'B': 3.0,
    'B-': 2.7,
    'C+': 2.3,
    'C': 2.0,
    'C-': 1.7,
    'D': 1.0,
    'F': 0.0,
  };

  return gradeMap[letterGrade] || 0;
}
