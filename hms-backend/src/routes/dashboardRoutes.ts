import express from 'express';
import { getSummary } from '../controllers/dashboardController';
import { getBookings } from '../controllers/bookingController';
import { getNotifications } from '../controllers/notificationController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateJWT);

router.get('/dashboard/summary', getSummary);
router.get('/bookings', getBookings);
router.get('/notifications', getNotifications);

export default router;
