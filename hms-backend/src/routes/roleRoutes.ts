import express from 'express';
import { getRoles, createRole, updateRole, deleteRole } from '../controllers/roleController';
import { authenticateJWT, requirePermission } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateJWT);

const canManageSettings = requirePermission('manage_settings');

router.get('/', canManageSettings, getRoles);
router.post('/', canManageSettings, createRole);
router.put('/:id', canManageSettings, updateRole);
router.delete('/:id', canManageSettings, deleteRole);

export default router;
