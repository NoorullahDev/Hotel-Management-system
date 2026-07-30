import express from 'express';
import { getOrders, createOrder, updateOrderStatus, getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, getCategories, createCategory, deleteCategory, verifyGuest } from '../controllers/restaurantController';
import { authenticateJWT, requirePermission } from '../middleware/authMiddleware';

const router = express.Router();

const canManageRestaurant = requirePermission('manage_restaurant');

// Public routes (no auth required - for guest menu scanning)
router.get('/menu', getMenuItems);
router.get('/categories', getCategories);

// All routes below require authentication
router.use(authenticateJWT);

router.get('/orders', canManageRestaurant, getOrders);
router.post('/orders', canManageRestaurant, createOrder);
router.patch('/orders/:id/status', canManageRestaurant, updateOrderStatus);

router.post('/verify-guest', canManageRestaurant, verifyGuest);

router.post('/categories', canManageRestaurant, createCategory);
router.delete('/categories/:id', canManageRestaurant, deleteCategory);

router.post('/menu', canManageRestaurant, createMenuItem);
router.put('/menu/:id', canManageRestaurant, updateMenuItem);
router.delete('/menu/:id', canManageRestaurant, deleteMenuItem);

export default router;
