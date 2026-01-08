import { Router } from 'express';
import {
  getInstructorCourses,
  getCourseStudents,
  assignGrade,
  getCourseStatistics,
  updateCourseInfo,
} from '../controllers/instructorController';
import { authenticate, requireInstructor } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// All instructor routes require authentication and instructor role
router.use(authenticate);
router.use(requireInstructor);

/**
 * @route   GET /api/instructor/courses
 * @desc    Get all courses taught by instructor
 * @access  Private (Instructor)
 */
router.get('/courses', asyncHandler(getInstructorCourses));

/**
 * @route   GET /api/instructor/courses/:courseId/students
 * @desc    Get all students enrolled in a course
 * @access  Private (Instructor)
 */
router.get('/courses/:courseId/students', asyncHandler(getCourseStudents));

/**
 * @route   GET /api/instructor/courses/:courseId/statistics
 * @desc    Get course statistics
 * @access  Private (Instructor)
 */
router.get('/courses/:courseId/statistics', asyncHandler(getCourseStatistics));

/**
 * @route   PATCH /api/instructor/courses/:id
 * @desc    Update course information (limited fields)
 * @access  Private (Instructor)
 */
router.patch('/courses/:id', asyncHandler(updateCourseInfo));

/**
 * @route   POST /api/instructor/grades
 * @desc    Assign grade to student
 * @access  Private (Instructor)
 */
router.post('/grades', asyncHandler(assignGrade));

export default router;
