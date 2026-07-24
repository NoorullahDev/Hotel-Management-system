import express from 'express';
import { 
  getBookings, 
  createBooking, 
  getBookingById, 
  updateBooking, 
  cancelBooking,
  deleteBooking,
  checkInBooking,
  getFolio,
  checkoutBooking
} from '../controllers/bookingController';
import { authenticateJWT, requirePermission } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateJWT);

const canViewBookings = requirePermission('view_bookings');
const canManageBookings = requirePermission('manage_bookings');

router.get('/', canViewBookings, getBookings);
router.post('/', canManageBookings, createBooking);
router.get('/:id', canViewBookings, getBookingById);
router.patch('/:id', canManageBookings, updateBooking);
router.post('/:id/cancel', canManageBookings, cancelBooking);
router.delete('/:id', canManageBookings, deleteBooking);
router.post('/:id/checkin', canManageBookings, checkInBooking);
router.get('/:id/folio', canViewBookings, getFolio);
router.post('/:id/checkout', canManageBookings, checkoutBooking);

export default router;
