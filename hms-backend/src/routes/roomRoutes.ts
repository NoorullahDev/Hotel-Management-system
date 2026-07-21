import express from 'express';
import { 
  getRoomById,
  getRooms, 
  getRoomsAvailability,
  getRoomsStatusGrid, 
  createRoom, 
  updateRoom, 
  updateRoomStatus, 
  deleteRoom, 
  getRoomTypes, 
  createRoomType,
  logRoomMaintenance
} from '../controllers/roomController';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateJWT);

router.get('/status-grid', getRoomsStatusGrid);
router.get('/types', getRoomTypes);
router.get('/availability', getRoomsAvailability);
router.get('/', getRooms);
router.get('/:id', getRoomById);

// Protected routes (Admin or Manager)
const requireAdminOrManager = requireRole(['Admin', 'Manager']);

router.post('/', requireAdminOrManager, createRoom);
router.post('/types', requireAdminOrManager, createRoomType);
router.patch('/:id', requireAdminOrManager, updateRoom);
router.patch('/:id/status', requireAdminOrManager, updateRoomStatus);
router.post('/:id/maintenance', requireAdminOrManager, logRoomMaintenance);
router.delete('/:id', requireAdminOrManager, deleteRoom);

export default router;
