import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query, getClient } from '../config/database';

/**
 * Create a new major change request
 */
export async function createRequest(req: AuthRequest, res: Response) {
  const client = await getClient();

  try {
    const {
      student_id,
      requested_major,
      requested_school,
      gpa,
      units_completed,
      supporting_documents,
    } = req.body;

    // Validation
    if (!student_id || !requested_major || !requested_school) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: student_id, requested_major, requested_school',
      });
    }

    await client.query('BEGIN');

    // Get current student information
    const studentQuery = await client.query(
      'SELECT * FROM users WHERE id = $1 AND role = $2',
      [student_id, 'STUDENT']
    );

    if (studentQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    const student = studentQuery.rows[0];

    // Check if student is trying to change to the same major
    if (student.major === requested_major) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Requested major is the same as current major',
      });
    }

    // Extract GPA and units completed (no minimum GPA requirement for declaring a major)
    const studentGPA = gpa !== undefined ? parseFloat(gpa) : 0;
    const completedUnits = units_completed !== undefined ? parseInt(units_completed) : 0;

    // Check for pending requests
    const pendingCheck = await client.query(
      'SELECT * FROM major_change_requests WHERE student_id = $1 AND status = $2',
      [student_id, 'PENDING']
    );

    if (pendingCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'You already have a pending major change request',
      });
    }

    // Create the major change request
    const insertQuery = `
      INSERT INTO major_change_requests
      (student_id, current_major, requested_major, current_school, requested_school,
       gpa, units_completed, request_date, status, supporting_documents)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, 'PENDING', $8)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      student_id,
      student.major || null,
      requested_major,
      student.department || null,
      requested_school,
      studentGPA,
      completedUnits,
      supporting_documents || null,
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Major change request created successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create major change request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create major change request',
    });
  } finally {
    client.release();
  }
}

/**
 * Get all major change requests for a specific student
 */
export async function getMyRequests(req: Request, res: Response) {
  try {
    const { studentId } = req.params;

    if (!studentId || isNaN(parseInt(studentId))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID',
      });
    }

    const queryText = `
      SELECT
        r.*,
        NULL as approver_name
      FROM major_change_requests r
      WHERE r.student_id = $1
      ORDER BY r.request_date DESC
    `;

    const result = await query(queryText, [parseInt(studentId)]);

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Get my major change requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch major change requests',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Get all pending major change requests (admin)
 */
export async function getPendingRequests(req: AuthRequest, res: Response) {
  try {
    const queryText = `
      SELECT
        r.*,
        s.full_name as student_name,
        s.user_identifier as student_id,
        s.email as student_email,
        s.year_level
      FROM major_change_requests r
      JOIN users s ON r.student_id = s.id
      WHERE r.status = 'PENDING'
      ORDER BY r.request_date ASC
    `;

    const result = await query(queryText);

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get pending major change requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending requests',
    });
  }
}

/**
 * Approve or reject a major change request
 */
export async function decideRequest(req: AuthRequest, res: Response) {
  const client = await getClient();

  try {
    const { requestId } = req.params;
    const { status, approval_decision, approver_id } = req.body;

    // Validation
    if (!status || !approval_decision) {
      return res.status(400).json({
        success: false,
        error: 'status and approval_decision are required',
      });
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'status must be either APPROVED or REJECTED',
      });
    }

    await client.query('BEGIN');

    // Get the request details
    const requestQuery = await client.query(
      'SELECT * FROM major_change_requests WHERE id = $1',
      [parseInt(requestId)]
    );

    if (requestQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Request not found',
      });
    }

    const request = requestQuery.rows[0];

    if (request.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Request has already been processed',
      });
    }

    // Update request status
    await client.query(
      `UPDATE major_change_requests
       SET status = $1, approval_decision = $2, decision_date = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [status, approval_decision, parseInt(requestId)]
    );

    // If approved, update student's major and department
    if (status === 'APPROVED') {
      await client.query(
        `UPDATE users
         SET major = $1, department = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [request.requested_major, request.requested_school, request.student_id]
      );
    }

    await client.query('COMMIT');

    // Fetch updated request
    const updatedRequest = await query(
      'SELECT * FROM major_change_requests WHERE id = $1',
      [parseInt(requestId)]
    );

    res.status(200).json({
      success: true,
      data: updatedRequest.rows[0],
      message: `Request ${status.toLowerCase()} successfully`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Decide major change request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request',
    });
  } finally {
    client.release();
  }
}
