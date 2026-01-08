import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import * as applicationController from '../controllers/applicationController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Student routes
router.get('/', applicationController.getMyApplications);
router.post('/', applicationController.submitApplication);
router.get('/:id', applicationController.getApplication);
router.put('/:id/withdraw', applicationController.withdrawApplication);

// Admin routes - require admin role
router.get('/admin/pending', requireAdmin, applicationController.getPendingApplications);
router.put('/admin/:id/review', requireAdmin, applicationController.reviewApplication);

export default router;
