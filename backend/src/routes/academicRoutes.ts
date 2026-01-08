import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as academicController from '../controllers/academicController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Grades routes
router.get('/grades', academicController.getMyGrades);
router.get('/grades/term', academicController.getGradesByTerm);
router.get('/grades/course/:courseId', academicController.getCourseGrade);

// Transcript routes
router.get('/transcript', academicController.getTranscript);
router.get('/transcript/unofficial', academicController.getUnofficialTranscript);
router.get('/transcript/pdf', academicController.generateTranscriptPDF);

// GPA routes
router.get('/gpa', academicController.getGPA);
router.get('/gpa/history', academicController.getGPAHistory);

export default router;
