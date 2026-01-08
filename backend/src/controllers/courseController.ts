import { Request, Response } from 'express';
import * as courseService from '../services/courseService';
import { AuthRequest } from '../types/express.types';

/**
 * Course Controller (Prisma-based)
 * Handles HTTP requests for course endpoints
 */

/**
 * Get all courses with filters
 * GET /api/courses
 */
export async function getAllCourses(req: Request, res: Response) {
  try {
    const filters = {
      search: req.query.search as string,
      department: req.query.department as string,
      semester: req.query.semester as any,
      year: req.query.year ? parseInt(req.query.year as string) : undefined,
      credits: req.query.credits ? parseInt(req.query.credits as string) : undefined,
      status: req.query.status as any,
      availableOnly: req.query.availableOnly === 'true'
    };

    const courses = await courseService.getAllCourses(filters);

    res.status(200).json({
      success: true,
      message: 'Courses retrieved successfully',
      data: courses
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get courses'
    });
  }
}

/**
 * Get course by ID
 * GET /api/courses/:id
 */
export async function getCourseById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const course = await courseService.getCourseById(id);

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || 'Course not found'
    });
  }
}

/**
 * Search courses
 * GET /api/courses/search
 */
export async function searchCourses(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query.q as string;

    if (!query) {
      res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
      return;
    }

    const courses = await courseService.searchCourses(query);

    res.status(200).json({
      success: true,
      data: courses
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Search failed'
    });
  }
}

/**
 * Get departments
 * GET /api/courses/departments
 */
export async function getDepartments(_req: Request, res: Response): Promise<void> {
  try {
    const departments = await courseService.getDepartments();

    res.status(200).json({
      success: true,
      data: departments
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get departments'
    });
  }
}

/**
 * Get courses by department
 * GET /api/courses/department/:department
 */
export async function getCoursesByDepartment(req: Request, res: Response): Promise<void> {
  try {
    const department = req.params.department;

    if (!department) {
      res.status(400).json({
        success: false,
        message: 'Department parameter is required'
      });
      return;
    }

    const courses = await courseService.getAllCourses({ department });

    res.status(200).json({
      success: true,
      message: 'Courses retrieved successfully',
      data: courses
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get courses by department'
    });
  }
}

/**
 * Create course (admin only)
 * POST /api/courses
 */
export async function createCourse(req: AuthRequest, res: Response) {
  try {
    const course = await courseService.createCourse(req.body);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create course'
    });
  }
}

/**
 * Update course (admin only)
 * PUT /api/courses/:id
 */
export async function updateCourse(req: AuthRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const course = await courseService.updateCourse(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update course'
    });
  }
}

/**
 * Delete course (admin only)
 * DELETE /api/courses/:id
 */
export async function deleteCourse(req: AuthRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await courseService.deleteCourse(id);

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete course'
    });
  }
}
