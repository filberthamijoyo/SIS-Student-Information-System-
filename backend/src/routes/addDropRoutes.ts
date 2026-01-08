import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as addDropController from '../controllers/addDropController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Add/drop request routes
router.post('/request', addDropController.createRequest);
router.get('/my-requests', addDropController.getMyRequests);
router.get('/pending-requests', addDropController.getPendingRequests);
router.put('/approve/:requestId', addDropController.approveRequest);
router.put('/reject/:requestId', addDropController.rejectRequest);

export default router;
