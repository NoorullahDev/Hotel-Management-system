import express from 'express';
import { getSummary } from '../controllers/dashboardController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = express.Router();

// Skip auth for public restaurant endpoints
router.use((req, res, next) => {
  if (req.path === '/restaurant/menu' || req.path === '/restaurant/categories') {
    return next('router');
  }
  return authenticateJWT(req, res, next);
});

// NOTE: /api/bookings and /api/notifications are served by their dedicated
// routers (mounted earlier in server.ts); registering them here would be
// unreachable shadowed duplicates.

router.get('/dashboard/summary', getSummary);

export default router;
