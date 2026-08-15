import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcrypt';
import { emitToHotel } from '../socket';
import { getPublicSettingsData, invalidateTaxCache, invalidatePublicSettingsCache } from '../utils/settings';
import { AuthRequest } from '../middleware/authMiddleware';
import { withTxRetry } from '../services/booking.service';

// ── Public Settings (Login page, guest-facing) ──────────────────────────────

/**
 * BEFORE: 4 separate DB queries (3 category-filtered + 1 legacy).
 * AFTER:  2 queries (all settings + legacy fallback) via shared utility.
 */
export const getPublicSettings = asyncHandler(async (req: Request, res: Response) => {
    const settings = await getPublicSettingsData();
    res.json(settings);
  });

// ── Get All Settings (grouped by category) ──────────────────────────────────

export const getAllSettings = asyncHandler(async (req: Request, res: Response) => {
    // Single query — group in memory (settings table is tiny)
    const [settings, legacy] = await Promise.all([
      prisma.setting.findMany(),
      prisma.hotelSettings.findFirst(),
    ]);

    const parseVal = (val: unknown): unknown => {
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return val; }
      }
      return val;
    };

    const grouped: Record<string, Record<string, unknown>> = {};
    for (const s of settings) {
      if (!grouped[s.category]) grouped[s.category] = {};
      grouped[s.category][s.key] = parseVal(s.value);
    }

    if (legacy) {
      grouped.general  ??= {};
      grouped.hotel    ??= {};
      grouped.tax      ??= {};
      grouped.general.hotelName    ??= legacy.name;
      grouped.hotel.currency       ??= legacy.currency;
      grouped.hotel.checkInTime    ??= legacy.defaultCheckIn;
      grouped.hotel.checkOutTime   ??= legacy.defaultCheckOut;
      grouped.tax.rate             ??= legacy.taxRate.toString();
    }

    res.json(grouped);
  });

// ── Update Settings ─────────────────────────────────────────────────────────

export const updateSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { category, updates } = req.body as { category: string; updates: Record<string, unknown> };

    if (!category || !updates || typeof updates !== 'object') {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    if (category === 'general') {
      if (updates.hotelName !== undefined && typeof updates.hotelName === 'string' && updates.hotelName.trim() === '') {
        return res.status(400).json({ message: 'Hotel Name cannot be empty' });
      }
      if (updates.loginHeadingMain !== undefined && typeof updates.loginHeadingMain === 'string' && updates.loginHeadingMain.trim() === '') {
        return res.status(400).json({ message: 'Main Login Heading cannot be empty' });
      }
    }

    if (category === 'tax') {
      if (updates.rate !== undefined) {
        const rateNum = parseFloat(updates.rate as string);
        if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
          return res.status(400).json({ message: 'Invalid tax rate. Must be between 0 and 100.' });
        }
      }
    }

    // Batch upserts sequentially (SQLite doesn't support parallel writes)
    for (const [key, value] of Object.entries(updates)) {
      // Pass value directly. Prisma automatically handles JSON serialization for Json fields.
      await prisma.setting.upsert({
        where:  { key },
        update: { category, value: value as any },
        create: { key, category, value: value as any },
      });
    }

    // Invalidate the tax cache whenever tax settings change
    if (category === 'tax') invalidateTaxCache();
    
    // Always invalidate public settings cache on any settings update
    invalidatePublicSettingsCache();

    await prisma.auditLog.create({
      data: {
        userId:  req.user!.userId,
        action:  'UPDATE_SETTINGS',
        module:  'Settings',
        details: `Updated settings for category: ${category}`,
      },
    });

    emitToHotel('main', 'settings:updated', { category, updates });

    res.json({ message: 'Settings updated successfully' });
  });

// ── Account Settings ────────────────────────────────────────────────────────

export const getAccountSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true, email: true, phone: true, profilePhoto: true, role: true },
    });

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  });

export const updateAccountSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { name, phone, profilePhoto } = req.body as { name: string; phone?: string; profilePhoto?: string };

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name, phone, profilePhoto },
      select: { id: true, name: true, username: true, email: true, phone: true, profilePhoto: true },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action:  'UPDATE_PROFILE',
        module:  'Settings',
        details: 'Updated account profile details',
      },
    });

    res.json(user);
  });

// ── Change Password ─────────────────────────────────────────────────────────

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) return res.status(400).json({ message: 'Incorrect current password' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ 
      where: { id: userId }, 
      data: { passwordHash, mustChangePassword: false } 
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action:  'CHANGE_PASSWORD',
        module:  'Settings',
        details: 'Changed account password',
      },
    });

    res.json({ message: 'Password changed successfully' });
  });

// ── Change Username ("email" field in UI is actually the login username) ────

export const changeEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { newEmail } = req.body as { newEmail: string };

    if (!newEmail || newEmail.trim() === '') {
      return res.status(400).json({ message: 'New username is required' });
    }

    const normalizedUsername = newEmail.trim().toLowerCase();

    if (normalizedUsername.length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters' });
    }

    // Check if the username is already taken by another user (check both username and email columns)
    const [existingByUsername, existingByEmail] = await Promise.all([
      prisma.user.findUnique({ where: { username: normalizedUsername } }),
      prisma.user.findUnique({ where: { email: normalizedUsername } }),
    ]);

    if ((existingByUsername && existingByUsername.id !== userId) ||
        (existingByEmail && existingByEmail.id !== userId)) {
      return res.status(400).json({ message: 'Username is already in use by another account' });
    }

    // Update BOTH username and email so login works with the new value
    // regardless of which column the auth lookup matches first
    const user = await prisma.user.update({
      where: { id: userId },
      data: { username: normalizedUsername, email: normalizedUsername },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action:  'UPDATE_PROFILE',
        module:  'Settings',
        details: `Changed login username to ${normalizedUsername}`,
      },
    });

    res.json({ message: 'Username changed successfully', email: user.email, username: user.username });
  });


// ── Shared backup data collector ─────────────────────────────────────────────

/**
 * Collect all tables needed for a backup in parallel.
 * @param includeSecrets  When true, includes passwordHash and lockedUntil (for file download only).
 */
async function collectBackupData(includeSecrets = false) {
  const userSelect = includeSecrets
    ? undefined  // select everything
    : { id: true, email: true, name: true, phone: true, profilePhoto: true, roleId: true, oauthProvider: true, failedLoginAttempts: true };

  const [
    roles, users, guests, roomTypes, rooms, bookings, payments,
    invoices, invoiceItems, foodOrders, orderItems, menuCategories,
    menuItems, housekeepingTasks, roomMaintenances, feedbacks,
    notifications, notificationPreferences, auditLogs, hotelSettings, settings, staff,
  ] = await Promise.all([
    prisma.role.findMany(),
    prisma.user.findMany(userSelect ? { select: userSelect } : undefined),
    prisma.guest.findMany(),
    prisma.roomType.findMany(),
    prisma.room.findMany(),
    prisma.booking.findMany(),
    prisma.payment.findMany(),
    prisma.invoice.findMany(),
    prisma.invoiceItem.findMany(),
    prisma.foodOrder.findMany(),
    prisma.orderItem.findMany(),
    prisma.menuCategory.findMany(),
    prisma.menuItem.findMany(),
    prisma.housekeepingTask.findMany(),
    prisma.roomMaintenance.findMany(),
    prisma.feedback.findMany(),
    prisma.notification.findMany(),
    prisma.notificationPreference.findMany(),
    prisma.auditLog.findMany(),
    prisma.hotelSettings.findMany(),
    prisma.setting.findMany(),
    prisma.staff.findMany(),
  ]);

  return {
    roles, users, guests, roomTypes, rooms, bookings, payments,
    invoices, invoiceItems, foodOrders, orderItems, menuCategories,
    menuItems, housekeepingTasks, roomMaintenances, feedbacks,
    notifications, notificationPreferences, auditLogs,
    hotelSettings, settings, staff,
  };
}

// ── Backup Database (JSON preview) ───────────────────────────────────────────

export const backupDatabase = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await collectBackupData(false);

    const backup = {
      version:   '1.0',
      createdAt: new Date().toISOString(),
      data,
    };

    await Promise.all([
      prisma.setting.upsert({
        where:  { key: 'lastBackupAt' },
        update: { value: new Date().toISOString() as any },
        create: { key: 'lastBackupAt', category: 'system', value: new Date().toISOString() as any },
      }),
      prisma.auditLog.create({
        data: {
          userId:  req.user!.userId,
          action:  'DATABASE_BACKUP',
          module:  'Settings',
          details: 'Created database backup',
        },
      }),
    ]);

    res.json(backup);
  });

import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import os from 'os';

import { generateSqlDump } from '../utils/sqlDump';

// ── Backup archive builder (single source of truth for manual + auto backup) ─

/**
 * Build a unique backup filename with date + time (including seconds) so
 * consecutive backups never overwrite each other.
 */
function buildBackupFilename(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = date.toISOString().slice(0, 10);
  return `HMS_Backup_${dateStr}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}.zip`;
}

/**
 * Build a complete backup ZIP (SQL dump, verification report and uploaded
 * images). Shared by the manual download and the automatic on-close backup so
 * backup logic is never duplicated.
 */
async function buildBackupArchive(): Promise<{ buffer: Buffer; filename: string }> {
    // includeSecrets=true to fetch passwordHash + lockedUntil for a complete restore
    const backupData = await collectBackupData(true);

    // Create a new ZIP archive
    const zip = new AdmZip();
    let reportLog = 'Backup Verification Report\n===========================\n\n';
    let missingFiles = 0;

    const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');

    // Helper to validate and add file
    const processImageField = (obj: any, fieldName: string, entityName: string) => {
      const filePath = obj[fieldName];
      if (!filePath) return;

      const fullPath = path.join(uploadsDir, filePath.replace('/uploads/', ''));
      let isValid = false;

      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        if (stats.isFile() && stats.size > 100) { // Valid file, larger than 100 bytes
          try {
            zip.addLocalFile(fullPath, 'uploads');
            isValid = true;
          } catch (err) {
            console.error(`Failed to zip file: ${fullPath}`, err);
          }
        }
      }
      if (!isValid) missingFiles++;
    };

    // Process image references in the database
    backupData.users.forEach((u: any) => processImageField(u, 'profilePhoto', 'User'));
    backupData.menuItems.forEach((m: any) => processImageField(m, 'imageUrl', 'MenuItem'));
    backupData.rooms.forEach((r: any) => processImageField(r, 'imageUrl', 'Room'));
    backupData.hotelSettings.forEach((hs: any) => processImageField(hs, 'loginBackgroundImage', 'HotelSettings'));
    
    // Process settings that contain images
    const logoSetting = backupData.settings?.find((s: any) => s.key === 'hotelLogo');
    if (logoSetting && logoSetting.value) {
      processImageField(logoSetting, 'value', 'HotelLogo Setting');
    }
    const bannerSetting = backupData.settings?.find((s: any) => s.key === 'hotelBanner');
    if (bannerSetting && bannerSetting.value) {
      processImageField(bannerSetting, 'value', 'HotelBanner Setting');
    }

    if (missingFiles === 0) {
      reportLog += 'All file references are valid and successfully backed up.\n';
    } else {
      reportLog += `\nTotal missing/corrupted files stripped: ${missingFiles}\n`;
    }

    // Add report to zip
    zip.addFile('backup-report.txt', Buffer.from(reportLog, 'utf8'));

    // Generate SQL string from the validated/cleaned data
    const sqlScript = generateSqlDump(backupData);
    
    // Add SQL dump to zip
    zip.addFile('database.sql', Buffer.from(sqlScript, 'utf8'));

    return { buffer: zip.toBuffer(), filename: buildBackupFilename() };
}

// ── Download Backup as File ─────────────────────────────────────────────────

export const downloadBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { buffer, filename } = await buildBackupArchive();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  });

// ── Automatic Backup (on app close) ─────────────────────────────────────────

/**
 * Creates a full backup file on disk (dedicated Backup folder on the Desktop)
 * when the desktop app closes. Reuses buildBackupArchive so there is no
 * duplicated backup logic. Guarded by the AUTO_BACKUP_KEY header checked in the
 * route middleware so only the desktop main process can trigger it.
 */
export const createAutoBackup = asyncHandler(async (req: Request, res: Response) => {
    const { buffer, filename: baseFilename } = await buildBackupArchive();

    const backupDir = process.env.BACKUP_DIR || path.join(os.homedir(), 'Desktop', 'Backup');
    fs.mkdirSync(backupDir, { recursive: true });

    // Guarantee we never overwrite an existing backup. If a file with the same
    // date+time name already exists (e.g. two closes within the same second),
    // append a numeric suffix to keep every backup on disk.
    let filename = baseFilename;
    let filePath = path.join(backupDir, filename);
    let counter = 1;
    while (fs.existsSync(filePath)) {
      filename = `${path.basename(baseFilename, '.zip')}-${++counter}.zip`;
      filePath = path.join(backupDir, filename);
    }
    fs.writeFileSync(filePath, buffer);

    await prisma.setting.upsert({
      where:  { key: 'lastBackupAt' },
      update: { value: new Date().toISOString() as any },
      create: { key: 'lastBackupAt', category: 'system', value: new Date().toISOString() as any },
    });

    // No logged-in user exists during an automatic backup, so record it against
    // the admin account (best effort) to keep the audit trail complete.
    try {
      const admin = await prisma.user.findFirst({
        where: { role: { name: 'Admin' } },
        select: { id: true },
      });
      if (admin) {
        await prisma.auditLog.create({
          data: {
            userId:  admin.id,
            action:  'AUTO_BACKUP',
            module:  'Settings',
            details: 'Automatic backup created on application close',
          },
        });
      }
    } catch (err) {
      console.error('Failed to record automatic backup audit entry:', err);
    }

    res.json({ message: 'Automatic backup created successfully', filename, path: filePath });
  });

// ── Restore Database ────────────────────────────────────────────────────────

export const restoreDatabase = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No backup file provided' });
    }

    // Re-verify the user's current password: restore overwrites the entire DB
    const userId = req.user!.userId;
    const { currentPassword } = req.body as { currentPassword?: string };

    if (!currentPassword) {
      return res.status(400).json({ message: 'Current password required to restore database' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) return res.status(400).json({ message: 'Incorrect current password' });

    const zipPath = req.file.path;
    try {
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();

      const dbEntry = zipEntries.find(entry => entry.entryName === 'database.sql');
      if (!dbEntry) {
        return res.status(400).json({ message: 'Invalid backup: missing database.sql' });
      }

      const sqlScript = dbEntry.getData().toString('utf8');

      // Parse SQL statements properly — handle semicolons inside quoted strings
      const statements: string[] = [];
      let current = '';
      let inString = false;
      let stringChar = '';
      
      for (let i = 0; i < sqlScript.length; i++) {
        const ch = sqlScript[i];
        
        if (inString) {
          current += ch;
          // Check for escaped quote (doubled quote like '')
          if (ch === stringChar) {
            if (i + 1 < sqlScript.length && sqlScript[i + 1] === stringChar) {
              current += sqlScript[i + 1];
              i++; // skip the escaped quote
            } else {
              inString = false;
            }
          }
        } else {
          if (ch === "'" || ch === '"') {
            inString = true;
            stringChar = ch;
            current += ch;
          } else if (ch === ';') {
            const trimmed = current.trim();
            if (trimmed.length > 0 && !trimmed.startsWith('--')) {
              statements.push(trimmed);
            }
            current = '';
          } else if (ch === '-' && i + 1 < sqlScript.length && sqlScript[i + 1] === '-') {
            // Skip comment line
            const newlineIdx = sqlScript.indexOf('\n', i);
            if (newlineIdx === -1) break;
            i = newlineIdx;
          } else {
            current += ch;
          }
        }
      }
      // Don't forget the last statement if there's no trailing semicolon
      const lastTrimmed = current.trim();
      if (lastTrimmed.length > 0 && !lastTrimmed.startsWith('--')) {
        statements.push(lastTrimmed);
      }

      // --- PATCH FOR OLD BACKUPS MISSING USERNAME ---
      function splitSqlValues(str: string): string[] {
        let result: string[] = [];
        let cur = '';
        let insideStr = false;
        for (let idx = 0; idx < str.length; idx++) {
          const char = str[idx];
          if (char === "'") {
            if (insideStr && idx + 1 < str.length && str[idx + 1] === "'") {
              cur += "''";
              idx++;
            } else {
              insideStr = !insideStr;
              cur += char;
            }
          } else if (char === ',' && !insideStr) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        if (cur) result.push(cur.trim());
        return result;
      }

      for (let j = 0; j < statements.length; j++) {
        let stmt = statements[j];
        if (stmt.startsWith('INSERT INTO "User"')) {
          const match = stmt.match(/INSERT INTO "User" \((.*?)\) VALUES \((.*)\)$/is);
          if (match) {
            const cols = match[1].split(',').map(c => c.trim().replace(/"/g, ''));
            const vals = splitSqlValues(match[2]);
            
            if (!cols.includes('username')) {
              const emailIndex = cols.indexOf('email');
              if (emailIndex !== -1) {
                const emailVal = vals[emailIndex].replace(/^'|'$/g, '');
                const username = emailVal.split('@')[0].toLowerCase();
                
                cols.push('username');
                vals.push(`'${username}'`);
              }
            }

            if (!cols.includes('mustChangePassword')) {
              cols.push('mustChangePassword');
              vals.push('1');
            }
            
            const newColsStr = cols.map(c => `"${c}"`).join(', ');
            const newValsStr = vals.join(', ');
            statements[j] = `INSERT INTO "User" (${newColsStr}) VALUES (${newValsStr})`;
          }
        }
      }
      // ----------------------------------------------

      // Execute all statements within a transaction to ensure atomicity
      try {
        await withTxRetry(() => prisma.$transaction(async (tx) => {
          // We do not need PRAGMA foreign_keys = OFF because tables are deleted/inserted in dependency order
          for (const stmt of statements) {
            await tx.$executeRawUnsafe(stmt);
          }
        }));
        res.json({ message: 'Database restored successfully' });
      } catch (err: any) {
        console.error('Restore failed:', err);
        res.status(500).json({ message: `Restore failed: ${err.message}` });
      }
    } finally {
      try {
        fs.unlinkSync(zipPath);
      } catch (cleanupErr) {
        // Ignore errors if the file was already removed or inaccessible
      }
    }
  });

// ── Get Last Backup Info ────────────────────────────────────────────────────

export const getBackupInfo = asyncHandler(async (req: Request, res: Response) => {
    const lastBackup = await prisma.setting.findUnique({
      where: { key: 'lastBackupAt' }
    });

    res.json({
      lastBackupAt: lastBackup?.value || null
    });
  });
