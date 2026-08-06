import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../prisma';
import { getHWID } from '../utils/hwid';

const SECRET_KEY = process.env.LICENSE_SECRET || 'HMS-SECRET-LICENSE-KEY-2026-XQZ';
const normalizedSecret = crypto.createHash('sha256').update(SECRET_KEY).digest();

function decrypt(text: string) {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'base64');
    const encryptedText = Buffer.from(textParts.join(':'), 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', normalizedSecret, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    return null;
  }
}

export const getLicenseStatus = async (req: Request, res: Response) => {
  try {
    const hwid = getHWID();

    // Find the license in the local database.
    // We do NOT filter by HWID — the local SQLite file is already machine-bound.
    // HWID filtering previously caused "Invalid" status when the machine went
    // offline because MAC-address-based HWID changed with network adapter state.
    const license = await prisma.license.findFirst();

    if (!license) {
      return res.json({
        status: 'Invalid',
        hwid,
        licenseKey: null,
        activationDate: null,
        expiryDate: null,
        daysRemaining: 0,
        lastRenewed: null
      });
    }

    // Silently migrate the stored HWID to the current stable HWID if needed
    if (license.hwid !== hwid) {
      prisma.license.update({
        where: { id: license.id },
        data: { hwid }
      }).catch(() => { /* non-critical */ });
    }

    const now = new Date();
    const expiryDate = new Date(license.expiryDate);
    const daysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    let status = license.status;
    if (expiryDate < now && status === 'Active') {
      status = 'Expired';
      await prisma.license.update({
        where: { id: license.id },
        data: { status: 'Expired' }
      });
    }

    // Mask key
    const maskedKey = license.licenseKey.substring(0, 15) + '...' + license.licenseKey.substring(license.licenseKey.length - 10);

    return res.json({
      status,
      hwid,
      licenseKey: maskedKey,
      activationDate: license.activationDate,
      expiryDate: license.expiryDate,
      daysRemaining,
      lastRenewed: license.lastRenewed
    });
  } catch (error) {
    console.error('Error fetching license status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const activateLicense = async (req: Request, res: Response) => {
  try {
    const { licenseKey } = req.body;
    if (!licenseKey) {
      return res.status(400).json({ message: 'License key is required' });
    }

    const decrypted = decrypt(licenseKey);
    if (!decrypted) {
      return res.status(400).json({ message: 'Invalid license key format' });
    }

    let payload;
    try {
      payload = JSON.parse(decrypted);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid license key payload' });
    }

    const currentHWID = getHWID();
    if (payload.hwid !== currentHWID) {
      return res.status(400).json({ message: 'License key does not match this hardware' });
    }

    const expiryDate = new Date(payload.expiryDate);
    if (isNaN(expiryDate.getTime())) {
      return res.status(400).json({ message: 'Invalid expiry date in license' });
    }

    const now = new Date();
    if (expiryDate < now) {
      return res.status(400).json({ message: 'This license key is already expired' });
    }

    // Upsert license for this HWID
    const license = await prisma.license.upsert({
      where: { hwid: currentHWID },
      update: {
        licenseKey,
        status: 'Active',
        expiryDate,
        lastRenewed: new Date()
      },
      create: {
        hwid: currentHWID,
        licenseKey,
        status: 'Active',
        expiryDate,
        activationDate: new Date(),
        lastRenewed: new Date()
      }
    });

    res.json({ message: 'License activated successfully', license });
  } catch (error) {
    console.error('Error activating license:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

