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
import { authenticateJWT, requirePermission } from '../middleware/authMiddleware';
import { uploadBackup } from '../middleware/uploadBackup';

const router = Router();

// Public settings (no auth needed)
router.get('/public', getPublicSettings);

// Account routes (authenticated users)
router.get('/account', authenticateJWT, getAccountSettings);
router.patch('/account', authenticateJWT, updateAccountSettings);
router.post('/account/change-email', authenticateJWT, changeEmail);
router.post('/account/change-password', authenticateJWT, changePassword);

// General Settings Routes
const canManageSettings = requirePermission('manage_settings');
router.get('/', authenticateJWT, canManageSettings, getAllSettings);
router.patch('/', authenticateJWT, canManageSettings, updateSettings);

// Backup & Restore
router.get('/backup/info', authenticateJWT, canManageSettings, getBackupInfo);
router.post('/backup', authenticateJWT, canManageSettings, backupDatabase);
router.get('/backup/download', authenticateJWT, canManageSettings, downloadBackup);
router.post('/restore', authenticateJWT, canManageSettings, uploadBackup.single('file'), restoreDatabase);

export default router;
