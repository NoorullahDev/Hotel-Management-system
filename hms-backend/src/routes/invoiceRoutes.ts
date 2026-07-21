import express from 'express';
import { getInvoicePdf } from '../controllers/invoiceController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateJWT);
router.get('/:id/pdf', getInvoicePdf);

export default router;
