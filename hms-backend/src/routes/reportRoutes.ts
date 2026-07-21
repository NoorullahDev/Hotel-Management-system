import { Router } from 'express';
import {
  getSummary,
  getRevenueTrend,
  getOccupancyRate,
  getBookingsOverview,
  getRestaurantRevenue,
  getStaffPerformance,
  getRevenueByDepartment,
  getGuestSatisfaction,
  getRevenueReportTable,
  exportReport,
} from '../controllers/reportController';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Protect all report routes to Admin and Manager only
router.use(authenticateJWT, requireRole(['Admin', 'Manager']));

router.get('/summary', getSummary);
router.get('/revenue', getRevenueTrend);
router.get('/occupancy', getOccupancyRate);
router.get('/bookings-overview', getBookingsOverview);
router.get('/restaurant-revenue', getRestaurantRevenue);
router.get('/staff-performance', getStaffPerformance);
router.get('/revenue-by-department', getRevenueByDepartment);
router.get('/guest-satisfaction', getGuestSatisfaction);
router.get('/revenue-report-table', getRevenueReportTable);
router.get('/export', exportReport);

export default router;
