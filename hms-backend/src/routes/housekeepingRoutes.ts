import express from 'express';
import { getTasks, updateTask, getStaff, createTask, createHousekeepingStaff } from '../controllers/housekeepingController';
import { authenticateJWT, requirePermission } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateJWT);

const canManageHousekeeping = requirePermission('manage_housekeeping');

router.get('/staff', canManageHousekeeping, getStaff);
router.get('/tasks', canManageHousekeeping, getTasks);

router.post('/staff', canManageHousekeeping, createHousekeepingStaff);
router.post('/tasks', canManageHousekeeping, createTask);
router.patch('/tasks/:id', canManageHousekeeping, updateTask);

export default router;
