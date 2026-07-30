import express from 'express';
import { getTasks, updateTask, getStaff, createTask, createHousekeepingStaff, getServices, createService, updateService, deleteService, createServiceOrder, getServiceOrders } from '../controllers/housekeepingController';
import { authenticateJWT, requirePermission } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateJWT);

const canManageHousekeeping = requirePermission('manage_housekeeping');

router.get('/staff', canManageHousekeeping, getStaff);
router.get('/tasks', canManageHousekeeping, getTasks);
router.get('/services', canManageHousekeeping, getServices);

router.post('/staff', canManageHousekeeping, createHousekeepingStaff);
router.post('/tasks', canManageHousekeeping, createTask);
router.post('/services', canManageHousekeeping, createService);

router.patch('/tasks/:id', canManageHousekeeping, updateTask);
router.patch('/services/:id', canManageHousekeeping, updateService);

router.delete('/services/:id', canManageHousekeeping, deleteService);

// Service Orders (Any staff can create an order for a room)
router.post('/orders', createServiceOrder);
router.get('/orders', getServiceOrders);

export default router;
