import { Router, Request, Response, NextFunction } from 'express';
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
  getBackupInfo,
  createAutoBackup
} from '../controllers/settingsController';
import { authenticateJWT, requirePermission } from '../middleware/authMiddleware';
import { restoreRateLimiter } from '../middleware/rateLimiter';
import { uploadBackup } from '../middleware/uploadBackup';

const router = Router();

// Internal-only guard for the automatic on-close backup. The Electron main
// process passes AUTO_BACKUP_KEY to the backend and sends it as a header, so a
// regular frontend request can never trigger a disk write.
const requireAutoBackupKey = (req: Request, res: Response, next: NextFunction) => {
  const expected = process.env.AUTO_BACKUP_KEY;
  const provided = req.headers['x-auto-backup-key'];
  if (!expected) {
    return res.status(500).json({ message: 'Auto backup key is not configured on the server' });
  }
  if (!provided || provided !== expected) {
    return res.status(403).json({ message: 'Forbidden: Invalid auto backup key' });
  }
  next();
};

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
router.post('/backup/auto', requireAutoBackupKey, createAutoBackup);
router.post('/restore', authenticateJWT, canManageSettings, restoreRateLimiter, uploadBackup.single('file'), restoreDatabase);

export default router;
