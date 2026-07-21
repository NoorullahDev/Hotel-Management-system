import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditLogController';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Only Admins can view audit logs
router.get('/', authenticateJWT, requireRole(['Admin']), getAuditLogs);

export default router;
