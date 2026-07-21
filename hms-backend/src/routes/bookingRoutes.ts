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
import { authenticateJWT, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateJWT);

router.get('/', getBookings);
router.post('/', createBooking);
router.get('/:id', getBookingById);
router.patch('/:id', updateBooking);
router.post('/:id/cancel', requireRole(['Admin', 'Manager']), cancelBooking);
router.delete('/:id', requireRole(['Admin', 'Manager']), deleteBooking);
router.post('/:id/checkin', checkInBooking);
router.get('/:id/folio', getFolio);
router.post('/:id/checkout', checkoutBooking);

export default router;
