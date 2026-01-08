import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as majorChangeController from '../controllers/majorChangeController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Major change request routes
router.post('/request', majorChangeController.createRequest);
router.get('/my-requests/:studentId', majorChangeController.getMyRequests);
router.get('/pending-requests', majorChangeController.getPendingRequests);
router.put('/decide/:requestId', majorChangeController.decideRequest);

export default router;
