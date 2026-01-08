import { Request, Response } from 'express';
import { Prisma, EnrollmentStatus } from '@prisma/client';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

type EvaluationError = Error & { code?: string; status?: number };

const createEvaluationError = (code: string, message: string, status = 400): EvaluationError => {
  const error = new Error(message) as EvaluationError;
  error.code = code;
  error.status = status;
  return error;
};

/**
 * Submit a course evaluation
 */
export async function submitEvaluation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      student_id,
      course_id,
      term,
      year,
      overall_rating,
      instructor_rating,
      course_content_rating,
      workload_rating,
      comments,
      is_anonymous,
    } = req.body;

    // Validation
    if (
      !student_id ||
      !course_id ||
      !term ||
      !year ||
      overall_rating === undefined ||
      instructor_rating === undefined ||
      course_content_rating === undefined ||
      workload_rating === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Validate ratings are between 1-5
    const ratings = [
      overall_rating,
      instructor_rating,
      course_content_rating,
      workload_rating,
    ];

    for (const rating of ratings) {
      const ratingValue = parseInt(rating);
      if (ratingValue < 1 || ratingValue > 5) {
        return res.status(400).json({
          success: false,
          error: 'All ratings must be between 1 and 5',
        });
      }
    }

    const evaluation = await prisma.$transaction(async (tx) => {
      const enrollment = await tx.$queryRaw<Array<Record<string, any>>>(Prisma.sql`
        SELECT e.*
        FROM enrollments e
       JOIN courses c ON e.course_id = c.id
        WHERE e.user_id = ${student_id}
          AND c.id = ${course_id}
          AND c.semester = ${term}
          AND c.year = ${year}
          AND e.status = 'CONFIRMED'
      `);

      if (enrollment.length === 0) {
        throw createEvaluationError(
          'NotEnrolled',
          'You must be enrolled in this course to submit an evaluation',
          403
        );
      }

      const existing = await tx.$queryRaw<Array<Record<string, any>>>(Prisma.sql`
        SELECT *
        FROM course_evaluations
        WHERE student_id = ${student_id}
          AND course_id = ${course_id}
          AND term = ${term}
          AND year = ${year}
      `);

      const payload = {
        overall: Number.parseInt(overall_rating),
        instructor: Number.parseInt(instructor_rating),
        content: Number.parseInt(course_content_rating),
        workload: Number.parseInt(workload_rating),
        comments: comments || null,
        anonymous: is_anonymous !== undefined ? is_anonymous : true,
      };

      if (existing.length > 0) {
        const updated = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          UPDATE course_evaluations
          SET overall_rating = ${payload.overall},
              instructor_rating = ${payload.instructor},
              course_content_rating = ${payload.content},
              workload_rating = ${payload.workload},
              comments = ${payload.comments},
              is_anonymous = ${payload.anonymous},
             submitted_at = CURRENT_TIMESTAMP
          WHERE student_id = ${student_id}
            AND course_id = ${course_id}
            AND term = ${term}
            AND year = ${year}
          RETURNING *
        `);

        return updated[0];
      }

      const created = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        INSERT INTO course_evaluations
         (student_id, course_id, term, year, overall_rating, instructor_rating,
          course_content_rating, workload_rating, comments, is_anonymous, submitted_at)
        VALUES
          (${student_id}, ${course_id}, ${term}, ${year}, ${payload.overall}, ${payload.instructor},
           ${payload.content}, ${payload.workload}, ${payload.comments}, ${payload.anonymous}, CURRENT_TIMESTAMP)
        RETURNING *
      `);

      return created[0];
    });

    res.status(201).json({
      success: true,
      data: evaluation,
      message: 'Course evaluation submitted successfully',
    });
  } catch (error) {
    console.error('Submit evaluation error:', error);

    const evaluationError = error as EvaluationError;
    if (evaluationError.code) {
      return res.status(evaluationError.status ?? 400).json({
        success: false,
        error: evaluationError.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to submit course evaluation',
    });
  }
}

/**
 * Get all evaluations submitted by a student
 */
export async function getMyEvaluations(req: Request, res: Response) {
  try {
    const { studentId } = req.params;

    const evaluations = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        e.*,
        c.course_code,
        c.course_name,
        c.department
      FROM course_evaluations e
      JOIN courses c ON e.course_id = c.id
      WHERE e.student_id = ${Number.parseInt(studentId, 10)}
      ORDER BY e.submitted_at DESC
    `);

    res.status(200).json({
      success: true,
      data: evaluations,
    });
  } catch (error) {
    console.error('Get my evaluations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch evaluations',
    });
  }
}

/**
 * Get aggregated statistics for a course
 */
export async function getCourseStats(req: Request, res: Response) {
  try {
    const { courseId } = req.params;

    const stats = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        COUNT(*) AS total_responses,
        ROUND(AVG(overall_rating)::numeric, 2) AS average_overall_rating,
        ROUND(AVG(instructor_rating)::numeric, 2) AS average_instructor_rating,
        ROUND(AVG(course_content_rating)::numeric, 2) AS average_course_content_rating,
        ROUND(AVG(workload_rating)::numeric, 2) AS average_workload_rating
      FROM course_evaluations
      WHERE course_id = ${Number.parseInt(courseId, 10)}
    `);

    const comments = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        e.comments,
        e.submitted_at,
        CASE
          WHEN e.is_anonymous = true THEN 'Anonymous'
          ELSE u.full_name
        END AS student_name
      FROM course_evaluations e
      LEFT JOIN users u ON e.student_id = u.id
      WHERE e.course_id = ${Number.parseInt(courseId, 10)}
      AND e.comments IS NOT NULL
      AND e.comments != ''
      ORDER BY e.submitted_at DESC
    `);

    const courseInfo = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT course_code, course_name, department
      FROM courses
      WHERE id = ${Number.parseInt(courseId, 10)}
      LIMIT 1
    `);

    res.status(200).json({
      success: true,
      data: {
        course: courseInfo[0] || null,
        statistics: stats[0] || null,
        comments,
      },
    });
  } catch (error) {
    console.error('Get course stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course statistics',
    });
  }
}

/**
 * Get courses that a student is enrolled in but hasn't evaluated yet
 */
export async function getPendingEvaluations(req: Request, res: Response): Promise<void> {
  try {
    const { studentId } = req.params;
    const studentIdNum = Number.parseInt(studentId, 10);

    if (isNaN(studentIdNum) || studentIdNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID',
      });
    }

    // First, check if course_evaluations table exists by trying a simple query
    // If it doesn't exist, we'll return an empty array for now
    let pending: Array<Record<string, unknown>> = [];
    
    try {
      // Use Prisma's query builder approach to avoid prepared statement issues
      // Get all confirmed enrollments for the student (CONFIRMED status)
      const enrollments = await prisma.enrollments.findMany({
        where: {
          user_id: studentIdNum,
          status: EnrollmentStatus.CONFIRMED,
        },
        include: {
          courses: true,
        },
      });

      // Check which courses have evaluations
      // Since course_evaluations table might not exist in Prisma schema,
      // we'll use raw SQL but with better error handling
      try {
        const evaluatedCourses = await prisma.$queryRaw<Array<{ course_id: number; term: string; year: number }>>(Prisma.sql`
          SELECT DISTINCT course_id, term, year
          FROM course_evaluations
          WHERE student_id = ${studentIdNum}
        `);

        const evaluatedSet = new Set(
          evaluatedCourses.map(e => `${e.course_id}-${e.term}-${e.year}`)
        );

        // Filter out courses that have been evaluated
        pending = enrollments
          .filter(enrollment => {
            const semester = enrollment.courses.semester;
            const year = enrollment.courses.year;
            const key = `${enrollment.course_id}-${semester}-${year}`;
            return !evaluatedSet.has(key);
          })
          .map(enrollment => ({
            id: enrollment.courses.id,
            course_code: enrollment.courses.course_code,
            course_name: enrollment.courses.course_name,
            department: enrollment.courses.department,
            semester: enrollment.courses.semester,
            year: enrollment.courses.year,
            credits: enrollment.courses.credits,
            instructor_name: null, // Instructor relation not available in current Prisma schema
          }));
      } catch (evalError: any) {
        // If course_evaluations table doesn't exist, return all enrollments
        if (evalError.code === '42P01' || evalError.message?.includes('does not exist')) {
          console.warn('course_evaluations table does not exist, returning all enrollments');
          pending = enrollments.map(enrollment => ({
            id: enrollment.courses.id,
            course_code: enrollment.courses.course_code,
            course_name: enrollment.courses.course_name,
            department: enrollment.courses.department,
            semester: enrollment.courses.semester,
            year: enrollment.courses.year,
            credits: enrollment.courses.credits,
            instructor_name: null, // Instructor relation not available in current Prisma schema
          }));
        } else {
          throw evalError;
        }
      }
    } catch (dbError: any) {
      console.error('Database error in getPendingEvaluations:', dbError);
      console.error('Error details:', {
        name: dbError.name,
        code: dbError.code,
        message: dbError.message,
        meta: dbError.meta,
      });
      
      // If it's a Prisma validation error, return 400 with more details
      if (dbError.name === 'PrismaClientValidationError' || 
          dbError.message?.includes('Invalid value') || 
          dbError.message?.includes('Unknown field') ||
          dbError.message?.includes('Invalid enum value')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: dbError.message,
          code: dbError.code,
        });
      }
      
      // If it's a connection/prepared statement error, return 503
      if (dbError.code === '42P05' || dbError.message?.includes('prepared statement')) {
        return res.status(503).json({
          success: false,
          error: 'Database connection issue. Please try again in a moment.',
          retry: true
        });
      }
      
      // If it's a relation error, try without the relation
      if (dbError.message?.includes('relation') || dbError.code === 'P2025') {
        console.warn('Relation error, trying without term relation');
        try {
          const enrollments = await prisma.enrollments.findMany({
            where: {
              user_id: studentIdNum,
              status: EnrollmentStatus.CONFIRMED,
            },
            include: {
              courses: true,
            },
          });
          
          pending = enrollments.map(enrollment => ({
            id: enrollment.courses.id,
            course_code: enrollment.courses.course_code,
            course_name: enrollment.courses.course_name,
            department: enrollment.courses.department,
            semester: enrollment.courses.semester,
            year: enrollment.courses.year,
            credits: enrollment.courses.credits,
            instructor_name: null,
          }));
          
          return res.status(200).json({
            success: true,
            data: pending,
          });
        } catch (fallbackError: any) {
          console.error('Fallback query also failed:', fallbackError);
          throw dbError; // Throw original error
        }
      }
      
      throw dbError;
    }

    res.status(200).json({
      success: true,
      data: pending,
    });
  } catch (error: any) {
    console.error('Get pending evaluations error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch pending evaluations',
    });
  }
}
