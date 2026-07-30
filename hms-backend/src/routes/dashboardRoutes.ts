import express from 'express';
import { getSummary } from '../controllers/dashboardController';
import { getBookings } from '../controllers/bookingController';
import { getNotifications } from '../controllers/notificationController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = express.Router();

// Skip auth for public restaurant endpoints
router.use((req, res, next) => {
  if (req.path === '/restaurant/menu' || req.path === '/restaurant/categories') {
    return next('router');
  }
  return authenticateJWT(req, res, next);
});

router.get('/dashboard/summary', getSummary);
router.get('/bookings', getBookings);
router.get('/notifications', getNotifications);

export default router;
