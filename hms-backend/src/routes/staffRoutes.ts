import { Router } from 'express';
import { getAllStaff, createStaff, updateStaff, deleteStaff, assignShift } from '../controllers/staffController';
import { authenticateJWT, requirePermission } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJWT, requirePermission('manage_staff'));

router.get('/', getAllStaff);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);
router.put('/:id/shift', assignShift);

export default router;
