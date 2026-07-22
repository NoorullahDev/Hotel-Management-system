import { Router } from 'express';
import { login, register, refresh, getMe, logout, googleLogin } from '../controllers/authController';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware';
import { loginRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/login', loginRateLimiter, login);
router.post('/google', googleLogin);
router.post('/register', authenticateJWT, requireRole(['Admin']), register);
router.post('/refresh', refresh);

router.get('/me', authenticateJWT, getMe);
router.post('/logout', authenticateJWT, logout);

export default router;
