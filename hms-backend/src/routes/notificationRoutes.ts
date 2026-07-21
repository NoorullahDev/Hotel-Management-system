import express from 'express';
import { getNotifications, markRead, markAllRead, getPreferences, updatePreferences, deleteNotification } from '../controllers/notificationController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateJWT);

router.get('/', getNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);
router.delete('/:id', deleteNotification);
router.get('/preferences', getPreferences);
router.patch('/preferences', updatePreferences);

export default router;
