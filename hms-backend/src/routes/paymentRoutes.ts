import express from 'express';
import { processPayment } from '../controllers/paymentController';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateJWT);
router.post('/', processPayment);

export default router;
