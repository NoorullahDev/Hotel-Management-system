import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { getHWID } from '../utils/hwid';

export const requireLicense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hwid = getHWID();
    const license = await prisma.license.findUnique({
      where: { hwid }
    });

    if (!license || license.status !== 'Active') {
      return res.status(402).json({
        message: 'Valid license required to perform this action. Please renew your license.',
        code: 'LICENSE_REQUIRED'
      });
    }

    const now = new Date();
    const expiryDate = new Date(license.expiryDate);

    if (expiryDate < now) {
      // Update status to Expired if it hasn't been updated yet
      await prisma.license.update({
        where: { id: license.id },
        data: { status: 'Expired' }
      });
      
      return res.status(402).json({
        message: 'Your license has expired. Please renew it to continue using the software.',
        code: 'LICENSE_EXPIRED'
      });
    }

    next();
  } catch (error) {
    console.error('License check error:', error);
    res.status(500).json({ message: 'Internal server error during license validation' });
  }
};
