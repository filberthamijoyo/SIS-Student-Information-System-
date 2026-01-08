import { Router } from 'express';
import {
  getAllCourses,
  getCourseById,
  searchCourses,
  getCoursesByDepartment,
  getDepartments,
} from '../controllers/courseController';
import { optionalAuth } from '../middleware/auth';
import { searchLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * @route   GET /api/courses
 * @desc    Get all courses with pagination and filters
 * @access  Public
 */
router.get('/', optionalAuth, asyncHandler(getAllCourses));

/**
 * @route   GET /api/courses/search
 * @desc    Search courses by keyword
 * @access  Public
 */
router.get('/search', searchLimiter, asyncHandler(searchCourses));

/**
 * @route   GET /api/courses/departments
 * @desc    Get all unique departments
 * @access  Public
 */
router.get('/departments', asyncHandler(getDepartments));

/**
 * @route   GET /api/courses/department/:department
 * @desc    Get courses by department
 * @access  Public
 */
router.get('/department/:department', asyncHandler(getCoursesByDepartment));

/**
 * @route   GET /api/courses/:id
 * @desc    Get course by ID with time slots
 * @access  Public
 */
router.get('/:id', asyncHandler(getCourseById));

export default router;
