import express from 'express';
import { getOrders, createOrder, updateOrderStatus, getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, getCategories, createCategory, deleteCategory, verifyGuest } from '../controllers/restaurantController';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// All restaurant routes require authentication
router.use(authenticateJWT);

// Orders — accessible to Admin, Manager, Receptionist
router.get('/orders', getOrders);
router.post('/orders', createOrder);
router.patch('/orders/:id/status', updateOrderStatus);

// Guest verification
router.post('/verify-guest', verifyGuest);

// Categories — read for all authenticated, write for Admin/Manager
router.get('/categories', getCategories);
router.post('/categories', requireRole(['Admin', 'Manager']), createCategory);
router.delete('/categories/:id', requireRole(['Admin', 'Manager']), deleteCategory);

// Menu — read for all authenticated, write for Admin/Manager
router.get('/menu', getMenuItems);
router.post('/menu', requireRole(['Admin', 'Manager']), createMenuItem);
router.put('/menu/:id', requireRole(['Admin', 'Manager']), updateMenuItem);
router.delete('/menu/:id', requireRole(['Admin', 'Manager']), deleteMenuItem);

export default router;
