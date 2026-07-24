import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditLogController';
import { authenticateJWT, requirePermission } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateJWT, requirePermission('manage_settings'), getAuditLogs);

export default router;
