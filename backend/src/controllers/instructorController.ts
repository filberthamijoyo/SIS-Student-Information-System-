import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../types/express.types';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { GradeAssignmentRequest } from '../types/enrollment.types';

/**
 * Get instructor's courses
 * GET /api/instructor/courses
 */
export const getInstructorCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const instructor_id = req.userId;

    if (!instructor_id) {
      throw new ForbiddenError('Authentication required');
    }

    const { semester, year } = req.query;

    let query = `
      SELECT c.*,
             (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'enrolled') as enrolled_count,
             (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'waitlisted') as waitlist_count
      FROM courses c
      WHERE c.instructor_id = $1
    `;

    const params: any[] = [instructor_id];
    let paramIndex = 2;

    if (semester) {
      query += ` AND c.semester = $${paramIndex}`;
      params.push(semester);
      paramIndex++;
    }

    if (year) {
      query += ` AND c.year = $${paramIndex}`;
      params.push(year);
      paramIndex++;
    }

    query += ' ORDER BY c.year DESC, c.semester, c.course_code';

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      message: 'Instructor courses retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get students enrolled in instructor's course
 * GET /api/instructor/courses/:courseId/students
 */
export const getCourseStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const instructor_id = req.userId;

    if (!instructor_id) {
      throw new ForbiddenError('Authentication required');
    }

    // Verify instructor owns this course
    const courseCheck = await pool.query(
      'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
      [courseId, instructor_id]
    );

    if (courseCheck.rows.length === 0) {
      throw new ForbiddenError('You do not have access to this course');
    }

    const result = await pool.query(
      `SELECT e.id as enrollment_id, e.status, e.enrolled_at, e.grade,
              u.id as student_id, u.email, u.first_name, u.last_name,
              u.student_id as student_number, u.major, u.year
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       WHERE e.course_id = $1 AND e.status IN ('enrolled', 'waitlisted')
       ORDER BY e.status, u.last_name, u.first_name`,
      [courseId]
    );

    res.status(200).json({
      success: true,
      message: 'Course students retrieved successfully',
      data: {
        course_id: courseId,
        total_enrolled: result.rows.filter(r => r.status === 'enrolled').length,
        total_waitlisted: result.rows.filter(r => r.status === 'waitlisted').length,
        students: result.rows,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Assign grade to student
 * POST /api/instructor/grades
 */
export const assignGrade = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { enrollment_id, grade }: GradeAssignmentRequest = req.body;
    const instructor_id = req.userId;

    if (!instructor_id) {
      throw new ForbiddenError('Authentication required');
    }

    // Verify instructor owns the course for this enrollment
    const enrollmentCheck = await pool.query(
      `SELECT e.id, e.course_id, c.instructor_id
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.id = $1`,
      [enrollment_id]
    );

    if (enrollmentCheck.rows.length === 0) {
      throw new NotFoundError('Enrollment not found');
    }

    if (enrollmentCheck.rows[0].instructor_id !== instructor_id) {
      throw new ForbiddenError('You do not have permission to grade this enrollment');
    }

    // Update grade
    const result = await pool.query(
      `UPDATE enrollments
       SET grade = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [grade, enrollment_id]
    );

    res.status(200).json({
      success: true,
      message: 'Grade assigned successfully',
      data: result.rows[0],
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get course statistics for instructor
 * GET /api/instructor/courses/:courseId/statistics
 */
export const getCourseStatistics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const instructor_id = req.userId;

    if (!instructor_id) {
      throw new ForbiddenError('Authentication required');
    }

    // Verify instructor owns this course
    const courseCheck = await pool.query(
      'SELECT id, course_name, course_code FROM courses WHERE id = $1 AND instructor_id = $2',
      [courseId, instructor_id]
    );

    if (courseCheck.rows.length === 0) {
      throw new ForbiddenError('You do not have access to this course');
    }

    // Get statistics
    const stats = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'enrolled') as total_enrolled,
        COUNT(*) FILTER (WHERE status = 'waitlisted') as total_waitlisted,
        COUNT(*) FILTER (WHERE status = 'dropped') as total_dropped,
        COUNT(*) FILTER (WHERE grade IS NOT NULL) as total_graded,
        COUNT(*) FILTER (WHERE grade IN ('A+', 'A', 'A-')) as grade_a,
        COUNT(*) FILTER (WHERE grade IN ('B+', 'B', 'B-')) as grade_b,
        COUNT(*) FILTER (WHERE grade IN ('C+', 'C', 'C-')) as grade_c,
        COUNT(*) FILTER (WHERE grade IN ('D', 'F')) as grade_df
       FROM enrollments
       WHERE course_id = $1`,
      [courseId]
    );

    res.status(200).json({
      success: true,
      message: 'Course statistics retrieved successfully',
      data: {
        course: courseCheck.rows[0],
        statistics: stats.rows[0],
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Update course information (limited fields for instructor)
 * PATCH /api/instructor/courses/:id
 */
export const updateCourseInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const instructor_id = req.userId;
    const { description } = req.body;

    if (!instructor_id) {
      throw new ForbiddenError('Authentication required');
    }

    // Verify ownership
    const courseCheck = await pool.query(
      'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
      [id, instructor_id]
    );

    if (courseCheck.rows.length === 0) {
      throw new ForbiddenError('You do not have access to this course');
    }

    // Update only description (instructors can only update limited fields)
    const result = await pool.query(
      `UPDATE courses
       SET description = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [description, id]
    );

    res.status(200).json({
      success: true,
      message: 'Course information updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    throw error;
  }
};
