import express from 'express';
import { getTasks, updateTask, getStaff, createTask, createHousekeepingStaff, getServices, createService, updateService, deleteService, createServiceOrder, getServiceOrders, updateStaffStatus, deleteStaff, getOccupiedRooms } from '../controllers/housekeepingController';
import { authenticateJWT, requirePermission } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateJWT);

const canManageHousekeeping = requirePermission('manage_housekeeping');

// Staff Management
router.get('/staff', canManageHousekeeping, getStaff);
router.post('/staff', canManageHousekeeping, createHousekeepingStaff);
router.put('/staff/:id/status', canManageHousekeeping, updateStaffStatus);
router.delete('/staff/:id', canManageHousekeeping, deleteStaff);

router.get('/tasks', canManageHousekeeping, getTasks);
router.get('/services', canManageHousekeeping, getServices);
router.get('/rooms/occupied', canManageHousekeeping, getOccupiedRooms);

router.post('/tasks', canManageHousekeeping, createTask);
router.post('/services', canManageHousekeeping, createService);

router.patch('/tasks/:id', canManageHousekeeping, updateTask);
router.patch('/services/:id', canManageHousekeeping, updateService);

router.delete('/services/:id', canManageHousekeeping, deleteService);

// Service Orders
router.post('/orders', canManageHousekeeping, createServiceOrder);
router.get('/orders', canManageHousekeeping, getServiceOrders);

export default router;
