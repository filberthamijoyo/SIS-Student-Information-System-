import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as campusController from '../controllers/campusController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Announcements routes
router.get('/announcements', campusController.getAnnouncements);
router.get('/announcements/:id', campusController.getAnnouncement);

// Events routes
router.get('/events', campusController.getEvents);
router.get('/events/upcoming', campusController.getUpcomingEvents);
router.post('/events/:id/register', campusController.registerForEvent);

export default router;
