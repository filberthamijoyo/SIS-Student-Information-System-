import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as courseEvaluationController from '../controllers/courseEvaluationController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Course evaluation routes
router.post('/submit', courseEvaluationController.submitEvaluation);
router.get('/my-evaluations/:studentId', courseEvaluationController.getMyEvaluations);
router.get('/course-stats/:courseId', courseEvaluationController.getCourseStats);
router.get('/pending/:studentId', courseEvaluationController.getPendingEvaluations);

export default router;
