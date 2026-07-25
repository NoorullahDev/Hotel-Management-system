import express from 'express';
import { getLicenseStatus, activateLicense, manageLicense } from '../controllers/licenseController';

const router = express.Router();

router.get('/status', getLicenseStatus);
router.post('/activate', activateLicense);
router.put('/manage', manageLicense);

export default router;
