import { Router } from 'express';
import {
  enrollInCourse,
  dropCourse,
  getMyEnrollments,
  getEnrollmentStatus,
  getExamSchedules,
} from '../controllers/enrollmentController';
import { authenticate, requireStudent } from '../middleware/auth';
import { enrollmentLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// All enrollment routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/enrollments
 * @desc    Enroll in a course
 * @access  Private (Student)
 */
router.post('/', requireStudent, enrollmentLimiter, asyncHandler(enrollInCourse));

/**
 * @route   GET /api/enrollments/status/:jobId
 * @desc    Get enrollment job status
 * @access  Private
 */
router.get('/status/:jobId', asyncHandler(getEnrollmentStatus));

/**
 * @route   DELETE /api/enrollments/:enrollmentId
 * @desc    Drop a course
 * @access  Private (Student)
 */
router.delete('/:enrollmentId', requireStudent, asyncHandler(dropCourse));

/**
 * @route   GET /api/enrollments/my-courses
 * @desc    Get student's current enrollments
 * @access  Private (Student)
 */
router.get('/my-courses', requireStudent, asyncHandler(getMyEnrollments));

/**
 * @route   GET /api/enrollments/exam-schedules
 * @desc    Get exam schedules for enrolled courses
 * @access  Private (Student)
 */
router.get('/exam-schedules', requireStudent, asyncHandler(getExamSchedules));

export default router;
