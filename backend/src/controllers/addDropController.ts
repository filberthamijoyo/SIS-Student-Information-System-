import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';

type ControllerError = Error & { code?: string; status?: number };

const createControllerError = (code: string, message: string, status = 400): ControllerError => {
  const error = new Error(message) as ControllerError;
  error.code = code;
  error.status = status;
  return error;
};

/**
 * Create a new add/drop request
 */
export async function createRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { course_id, request_type, reason, is_late_request } = req.body;
    const student_id = req.user!.id; // Use authenticated user's ID

    // Validation
    if (!course_id || !request_type || !reason) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: course_id, request_type, reason',
      });
      return;
    }

    if (!['ADD', 'DROP'].includes(request_type)) {
      res.status(400).json({
        success: false,
        error: 'request_type must be either ADD or DROP',
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const student = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT *
        FROM users
        WHERE id = ${student_id}
          AND role = 'STUDENT'
        LIMIT 1
      `);

      if (student.length === 0) {
        throw createControllerError('StudentNotFound', 'Student not found', 404);
      }

      const courseRows = await tx.$queryRaw<Array<Record<string, any>>>(Prisma.sql`
        SELECT *
        FROM courses
        WHERE id = ${course_id}
        LIMIT 1
      `);

      if (courseRows.length === 0) {
        throw createControllerError('CourseNotFound', 'Course not found', 404);
      }

      const course = courseRows[0];

      if (request_type === 'ADD') {
        const enrollmentCheck = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT *
          FROM enrollments
          WHERE user_id = ${student_id}
            AND course_id = ${course_id}
            AND status IN ('CONFIRMED', 'PENDING')
        `);

        if (enrollmentCheck.length > 0) {
          throw createControllerError(
            'AlreadyEnrolled',
            'Student is already enrolled or has a pending enrollment for this course'
          );
        }

        if (Number(course.current_enrollment) >= Number(course.max_capacity)) {
          throw createControllerError('CourseFull', 'Course is at full capacity');
        }

        const currentCreditsRows = await tx.$queryRaw<
          Array<{ total_credits: string }>
        >(Prisma.sql`
          SELECT COALESCE(SUM(c.credits), 0)::text AS total_credits
          FROM enrollments e
          JOIN courses c ON e.course_id = c.id
          WHERE e.user_id = ${student_id}
            AND e.status = 'CONFIRMED'
            AND c.semester = ${course.semester}
            AND c.year = ${course.year}
        `);

        const currentCredits = Number.parseFloat(
          currentCreditsRows[0]?.total_credits || '0'
        );
        const newTotalCredits = currentCredits + Number(course.credits);

        const [maxUnitsRow] = await tx.$queryRaw<
          Array<{ value: string }>
        >(Prisma.sql`
          SELECT value
          FROM enrollment_rules
          WHERE rule_type = 'MAX_UNITS'
          ORDER BY effective_date DESC
          LIMIT 1
        `);

        const maxUnits = maxUnitsRow ? Number.parseFloat(maxUnitsRow.value) : 18;

        if (newTotalCredits > maxUnits) {
          throw createControllerError(
            'ExceedsMaxUnits',
            `Adding this course would exceed the maximum unit limit of ${maxUnits}. Current: ${currentCredits}, New total would be: ${newTotalCredits}`
          );
        }
      }

      if (request_type === 'DROP') {
        const enrollmentCheck = await tx.$queryRaw<Array<Record<string, any>>>(Prisma.sql`
          SELECT *
          FROM enrollments
          WHERE user_id = ${student_id}
            AND course_id = ${course_id}
            AND status = 'CONFIRMED'
        `);

        if (enrollmentCheck.length === 0) {
          throw createControllerError('NotEnrolled', 'Student is not enrolled in this course');
        }

        const currentCreditsRows = await tx.$queryRaw<
          Array<{ total_credits: string }>
        >(Prisma.sql`
          SELECT COALESCE(SUM(c.credits), 0)::text AS total_credits
          FROM enrollments e
          JOIN courses c ON e.course_id = c.id
          WHERE e.user_id = ${student_id}
            AND e.status = 'CONFIRMED'
            AND c.semester = ${course.semester}
            AND c.year = ${course.year}
        `);

        const currentCredits = Number.parseFloat(
          currentCreditsRows[0]?.total_credits || '0'
        );
        const newTotalCredits = currentCredits - Number(course.credits);

        const [minUnitsRow] = await tx.$queryRaw<
          Array<{ value: string }>
        >(Prisma.sql`
          SELECT value
          FROM enrollment_rules
          WHERE rule_type = 'MIN_UNITS'
          ORDER BY effective_date DESC
          LIMIT 1
        `);

        const minUnits = minUnitsRow ? Number.parseFloat(minUnitsRow.value) : 9;

        if (newTotalCredits < minUnits) {
          throw createControllerError(
            'BelowMinUnits',
            `Dropping this course would fall below the minimum unit requirement of ${minUnits}. Current: ${currentCredits}, New total would be: ${newTotalCredits}`
          );
        }
      }

      const insertedRows = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        INSERT INTO course_add_drop_requests
          (student_id, course_id, request_type, request_date, status, reason, is_late_request)
        VALUES
          (${student_id}, ${course_id}, ${request_type}, CURRENT_TIMESTAMP, 'PENDING', ${reason}, ${is_late_request ?? false})
        RETURNING *
      `);

      return insertedRows[0];
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Add/drop request created successfully',
    });
  } catch (error: any) {
    console.error('Create add/drop request error:', error);

    const controllerError = error as ControllerError;
    if (controllerError.code) {
      res.status(controllerError.status ?? 400).json({
        success: false,
        error: controllerError.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create add/drop request',
    });
  }
}

/**
 * Get all requests for a specific student
 */
export async function getMyRequests(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    const requests = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        r.*,
        c.course_code,
        c.course_name,
        c.department,
        c.credits,
        u.full_name AS approver_name
      FROM course_add_drop_requests r
      JOIN courses c ON r.course_id = c.id
      LEFT JOIN users u ON r.approved_by = u.id
      WHERE r.student_id = ${userId}
      ORDER BY r.request_date DESC
    `);

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error: any) {
    console.error('Get my requests error:', error);
    
    // If table doesn't exist, return empty array
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      res.status(200).json({
        success: true,
        data: [],
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch requests',
    });
  }
}

/**
 * Get all pending requests (admin/instructor)
 */
export async function getPendingRequests(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const requests = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        r.*,
        s.full_name AS student_name,
        s.user_identifier AS student_id,
        s.major,
        s.year_level,
        c.course_code,
        c.course_name,
        c.department,
        c.credits,
        c.semester,
        c.year
      FROM course_add_drop_requests r
      JOIN users s ON r.student_id = s.id
      JOIN courses c ON r.course_id = c.id
      WHERE r.status = 'PENDING'
      ORDER BY r.request_date ASC
    `);

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending requests',
    });
  }
}

/**
 * Approve an add/drop request
 */
export async function approveRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { requestId } = req.params;
    const { approved_by } = req.body;

    if (!approved_by) {
      res.status(400).json({
        success: false,
        error: 'approved_by (user_id) is required',
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const requestRows = await tx.$queryRaw<Array<Record<string, any>>>(Prisma.sql`
        SELECT *
        FROM course_add_drop_requests
        WHERE id = ${Number.parseInt(requestId, 10)}
        FOR UPDATE
      `);

      if (requestRows.length === 0) {
        throw createControllerError('RequestNotFound', 'Request not found', 404);
      }

      const request = requestRows[0];

      if (request.status !== 'PENDING') {
        throw createControllerError('AlreadyProcessed', 'Request has already been processed');
      }

      const courseRows = await tx.$queryRaw<Array<Record<string, any>>>(Prisma.sql`
        SELECT *
        FROM courses
        WHERE id = ${request.course_id}
        LIMIT 1
      `);

      if (courseRows.length === 0) {
        throw createControllerError('CourseNotFound', 'Course not found', 404);
      }

      if (request.request_type === 'ADD') {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO enrollments (user_id, course_id, status, enrolled_at)
          VALUES (${request.student_id}, ${request.course_id}, 'CONFIRMED', CURRENT_TIMESTAMP)
        `);

        await tx.$executeRaw(Prisma.sql`
          UPDATE courses
          SET current_enrollment = current_enrollment + 1
          WHERE id = ${request.course_id}
        `);
      } else if (request.request_type === 'DROP') {
        await tx.$executeRaw(Prisma.sql`
          UPDATE enrollments
          SET status = 'DROPPED', updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ${request.student_id} AND course_id = ${request.course_id}
        `);

        await tx.$executeRaw(Prisma.sql`
          UPDATE courses
          SET current_enrollment = current_enrollment - 1
          WHERE id = ${request.course_id}
        `);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE course_add_drop_requests
        SET status = 'APPROVED',
            approved_by = ${approved_by},
            approved_date = CURRENT_TIMESTAMP
        WHERE id = ${Number.parseInt(requestId, 10)}
      `);
    });

    res.status(200).json({
      success: true,
      message: 'Request approved successfully',
    });
  } catch (error) {
    console.error('Approve request error:', error);

    const controllerError = error as ControllerError;
    if (controllerError.code) {
      res.status(controllerError.status ?? 400).json({
        success: false,
        error: controllerError.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to approve request',
    });
  }
}

/**
 * Reject an add/drop request
 */
export async function rejectRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { requestId } = req.params;
    const { approved_by, rejection_reason } = req.body;

    if (!approved_by || !rejection_reason) {
      res.status(400).json({
        success: false,
        error: 'approved_by and rejection_reason are required',
      });
      return;
    }

    const requestRows = await prisma.$queryRaw<Array<Record<string, any>>>(Prisma.sql`
      SELECT *
      FROM course_add_drop_requests
      WHERE id = ${Number.parseInt(requestId, 10)}
      LIMIT 1
    `);

    if (requestRows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Request not found',
      });
      return;
    }

    if (requestRows[0].status !== 'PENDING') {
      res.status(400).json({
        success: false,
        error: 'Request has already been processed',
      });
      return;
    }

    const updatedRows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      UPDATE course_add_drop_requests
      SET status = 'REJECTED',
          approved_by = ${approved_by},
          approved_date = CURRENT_TIMESTAMP,
          rejection_reason = ${rejection_reason}
      WHERE id = ${Number.parseInt(requestId, 10)}
      RETURNING *
    `);

    res.status(200).json({
      success: true,
      data: updatedRows[0],
      message: 'Request rejected successfully',
    });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject request',
    });
  }
}
