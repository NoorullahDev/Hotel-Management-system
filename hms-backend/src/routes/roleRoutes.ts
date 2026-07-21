import express from 'express';
import { getRoles, createRole, updateRole, deleteRole } from '../controllers/roleController';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateJWT);

router.get('/', getRoles);
router.post('/', requireRole(['Admin']), createRole);
router.put('/:id', requireRole(['Admin']), updateRole);
router.delete('/:id', requireRole(['Admin']), deleteRole);

export default router;
