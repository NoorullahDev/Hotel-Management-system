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
import { authenticateJWT, requirePermission } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateJWT);

const canViewRooms = requirePermission('view_rooms');
const canManageRooms = requirePermission('manage_rooms');

router.get('/status-grid', canViewRooms, getRoomsStatusGrid);
router.get('/types', canViewRooms, getRoomTypes);
router.get('/availability', canViewRooms, getRoomsAvailability);
router.get('/', canViewRooms, getRooms);
router.get('/:id', canViewRooms, getRoomById);

router.post('/', canManageRooms, createRoom);
router.post('/types', canManageRooms, createRoomType);
router.patch('/:id', canManageRooms, updateRoom);
router.patch('/:id/status', canManageRooms, updateRoomStatus);
router.post('/:id/maintenance', canManageRooms, logRoomMaintenance);
router.delete('/:id', canManageRooms, deleteRoom);

export default router;
