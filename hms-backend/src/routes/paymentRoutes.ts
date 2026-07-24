import express from 'express';
import { processPayment } from '../controllers/paymentController';
import { authenticateJWT, requirePermission } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateJWT);
router.post('/', requirePermission('manage_billing'), processPayment);

export default router;
