import express from 'express';
import { getGuests, createGuest, getGuestById, updateGuest, deleteGuest } from '../controllers/guestController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateJWT);

router.get('/', getGuests);
router.post('/', createGuest);
router.get('/:id', getGuestById);
router.patch('/:id', updateGuest);
router.delete('/:id', deleteGuest);

export default router;
