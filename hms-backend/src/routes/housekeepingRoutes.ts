import express from 'express';
import { getTasks, updateTask, getStaff, createTask } from '../controllers/housekeepingController';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// All housekeeping routes require authentication
router.use(authenticateJWT);

// Read access for Admin, Manager, and Housekeeping staff
router.get('/staff', getStaff);
router.get('/tasks', getTasks);

// Write access restricted to Admin, Manager
router.post('/tasks', requireRole(['Admin', 'Manager']), createTask);
router.patch('/tasks/:id', requireRole(['Admin', 'Manager']), updateTask);

export default router;
