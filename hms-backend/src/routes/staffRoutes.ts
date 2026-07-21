import { Router } from 'express';
import { getAllStaff, createStaff, updateStaff, deleteStaff, assignShift } from '../controllers/staffController';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Restrict all routes to Admin and Manager
router.use(authenticateJWT, requireRole(['Admin', 'Manager']));

router.get('/', getAllStaff);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);
router.put('/:id/shift', assignShift);

export default router;
