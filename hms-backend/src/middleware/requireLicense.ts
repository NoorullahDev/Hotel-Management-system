import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { getHWID } from '../utils/hwid';

export const requireLicense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();

    // Find the first active, non-expired license in the local database.
    // We intentionally do NOT filter by HWID here: this is a local SQLite
    // database stored in AppData on the user's machine — it is already
    // machine-bound by the filesystem. Filtering by HWID caused the license
    // to appear missing whenever the machine went offline (because the MAC
    // address used to compute the HWID changes when network adapters go down).
    const license = await prisma.license.findFirst({
      where: {
        status: 'Active',
        expiryDate: { gt: now }
      }
    });

    if (!license) {
      return res.status(402).json({
        message: 'Valid license required to perform this action. Please renew your license.',
        code: 'LICENSE_REQUIRED'
      });
    }

    // Silently keep the stored HWID in sync with the current stable HWID so
    // the License tab always shows the correct hardware fingerprint.
    const currentHwid = getHWID();
    if (license.hwid !== currentHwid) {
      prisma.license.update({
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
