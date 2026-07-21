import { Router } from 'express';
import { 
  getPublicSettings,
  getAllSettings,
  updateSettings,
  getAccountSettings,
  updateAccountSettings,
  changePassword,
  changeEmail,
  backupDatabase,
  downloadBackup,
  restoreDatabase,
  getBackupInfo
} from '../controllers/settingsController';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware';
import { uploadBackup } from '../middleware/uploadBackup';

const router = Router();

// Public settings (no auth needed)
router.get('/public', getPublicSettings);

// Account routes (authenticated users)
router.get('/account', authenticateJWT, getAccountSettings);
router.patch('/account', authenticateJWT, updateAccountSettings);
router.post('/account/change-email', authenticateJWT, changeEmail);
router.post('/account/change-password', authenticateJWT, changePassword);

// General Settings Routes (Admin only)
router.get('/', authenticateJWT, requireRole(['Admin', 'Manager']), getAllSettings);
router.patch('/', authenticateJWT, requireRole(['Admin']), updateSettings);

// Backup & Restore (Admin only)
router.get('/backup/info', authenticateJWT, requireRole(['Admin']), getBackupInfo);
router.post('/backup', authenticateJWT, requireRole(['Admin']), backupDatabase);
router.get('/backup/download', authenticateJWT, requireRole(['Admin']), downloadBackup);
router.post('/restore', authenticateJWT, requireRole(['Admin']), uploadBackup.single('file'), restoreDatabase);

export default router;
