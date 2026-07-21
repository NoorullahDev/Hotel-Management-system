import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET and JWT_REFRESH_SECRET must be defined.');
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

    let user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const lockTimeRemaining = Math.ceil((new Date(user.lockedUntil).getTime() - new Date().getTime()) / 60000);
      return res.status(403).json({ message: `Account is temporarily locked. Please try again in ${lockTimeRemaining} minutes.` });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      const newAttempts = user.failedLoginAttempts + 1;
      const updates: any = { failedLoginAttempts: newAttempts };
      let message = 'Invalid credentials';
      
      if (newAttempts >= 5) {
        // Lock for 15 minutes
        const lockTime = new Date();
        lockTime.setMinutes(lockTime.getMinutes() + 15);
        updates.lockedUntil = lockTime;
        message = 'Account locked due to too many failed attempts. Please try again in 15 minutes.';
      } else if (newAttempts === 3) {
        message = 'Invalid credentials. You have 2 chances left.';
      } else if (newAttempts === 4) {
        message = 'Invalid credentials. You have 1 chance left.';
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updates,
      });

      return res.status(newAttempts >= 5 ? 403 : 401).json({ message });
    }

    // Success: Reset failed attempts and lock
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Generate tokens
    const payload = { userId: user.id, role: user.role.name };
    const accessToken = jwt.sign(payload, JWT_SECRET as string, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET as string, { expiresIn: '7d' });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
      }
    });
  });

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name, roleName } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Ensure role exists
    const role = await prisma.role.findUnique({ where: { name: roleName || 'Guest' } });
    if (!role) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        roleId: role.id,
      },
    });

    res.status(201).json({ message: 'User created successfully', userId: newUser.id });
  });

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token is required' });
  }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET as string) as { userId: string; role: string };
    const payload = { userId: decoded.userId, role: decoded.role };
    const newAccessToken = jwt.sign(payload, JWT_SECRET as string, { expiresIn: '1h' });

    res.json({ accessToken: newAccessToken });
  });

export const forgotPassword = async (req: Request, res: Response) => {
  // Placeholder implementation
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  // In a real application, you would generate a reset token, save it to the DB,
  // and send an email to the user with a link containing the token.
  res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
};

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { role: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      profilePhoto: user.profilePhoto,
      avatar: user.profilePhoto || '/images/avatar.png',
    });
  });

export const logout = async (req: Request, res: Response) => {
  // Since we are using stateless JWTs on the client side,
  // we just return a success response so the client can clear tokens.
  // For higher security, we could implement a token blacklist here.
  res.json({ message: 'Logged out successfully' });
};

export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: 'Google token is required' });
  }

    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!googleRes.ok) {
      return res.status(401).json({ message: 'Invalid Google token' });
    }

    const googleUser = await googleRes.json();
    const email = googleUser.email;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'Account not found for this Google email. Please register or login with your correct email.' });
    }

    // Success
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    // Generate tokens
    const payload = { userId: user.id, role: user.role.name };
    const accessToken = jwt.sign(payload, JWT_SECRET as string, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET as string, { expiresIn: '7d' });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
      }
    });
  });
