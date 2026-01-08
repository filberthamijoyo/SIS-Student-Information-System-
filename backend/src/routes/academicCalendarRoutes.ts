import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as academicCalendarController from '../controllers/academicCalendarController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Academic calendar routes
router.get('/events', academicCalendarController.getEvents);
router.get('/add-drop-status', academicCalendarController.getAddDropStatus);
router.get('/upcoming-events', academicCalendarController.getUpcomingEvents);
router.get('/holidays', academicCalendarController.getHolidays);

export default router;
