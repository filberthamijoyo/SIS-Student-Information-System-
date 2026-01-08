import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as facultyController from '../controllers/facultyController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Course routes
router.get('/courses', facultyController.getMyCourses);
router.get('/courses/:courseId/roster', facultyController.getRoster);

// Grade routes
router.get('/courses/:courseId/grades', facultyController.getCourseGrades);
router.post('/grades/submit', facultyController.submitGrades);
router.put('/grades/:gradeId', facultyController.updateGrade);

// Attendance routes
router.get('/courses/:courseId/attendance', facultyController.getAttendance);
router.post('/attendance', facultyController.markAttendance);

// Course materials routes
router.get('/courses/:courseId/materials', facultyController.getMaterials);
router.post('/courses/:courseId/materials', facultyController.uploadMaterial);

export default router;
