import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { getHWID, getLegacyHWID } from '../utils/hwid';

export const requireLicense = async (req: Request, res: Response, next: NextFunction) => {
  // Skip license enforcement in development — only enforce in packaged/production builds
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  try {
    const now = new Date();
    const currentHwid = getHWID();

    // Prefer the active, non-expired license bound to THIS machine. The HWID is a
    // stable CPU + hostname + OS fingerprint, so filtering by it is safe.
    let license = await prisma.license.findFirst({
      where: {
        hwid: currentHwid,
        status: 'Active',
        expiryDate: { gt: now }
      }
    });

    if (!license) {
      const legacyHwid = getLegacyHWID();
      license = await prisma.license.findFirst({
        where: {
          hwid: legacyHwid,
          status: 'Active',
          expiryDate: { gt: now }
        }
      });
    }

    if (!license) {
      return res.status(402).json({
        message: 'Valid license required to perform this action. Please renew your license.',
        code: 'LICENSE_REQUIRED'
      });
    }

    // Silently keep the stored HWID in sync with the current stable HWID so
    // the License tab always shows the correct hardware fingerprint.
    if (license.hwid !== currentHwid) {
      await prisma.license.update({
        where: { id: license.id },
        data: { hwid: currentHwid }
      }).catch(() => { /* non-critical, ignore */ });
    }

    next();
  } catch (error) {
    console.error('License check error:', error);
    res.status(500).json({ message: 'Internal server error during license validation' });
  }
};
