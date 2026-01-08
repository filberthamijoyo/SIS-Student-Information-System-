import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as personalController from '../controllers/personalController';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', personalController.getPersonalInfo);
router.put('/', personalController.updatePersonalInfo);
router.put('/emergency-contact', personalController.updateEmergencyContact);
router.put('/address', personalController.updateAddress);

export default router;
