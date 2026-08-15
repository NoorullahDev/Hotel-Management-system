import 'dotenv/config';
import express from 'express';
import http from 'http';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { initializeSocket } from './socket';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './prisma';
import authRoutes from './routes/authRoutes';
import settingsRoutes from './routes/settingsRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import roomRoutes from './routes/roomRoutes';
import uploadRoutes from './routes/uploadRoutes';
import bookingRoutes from './routes/bookingRoutes';
import paymentRoutes from './routes/paymentRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import path from 'path';
import housekeepingRoutes from './routes/housekeepingRoutes';
import restaurantRoutes from './routes/restaurantRoutes';
import staffRoutes from './routes/staffRoutes';
import reportRoutes from './routes/reportRoutes';
import guestRoutes from './routes/guestRoutes';
import notificationRoutes from './routes/notificationRoutes';
import auditLogRoutes from './routes/auditLogRoutes';
import roleRoutes from './routes/roleRoutes';
import licenseRoutes from './routes/licenseRoutes';
import { requireLicense } from './middleware/requireLicense';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Serve static uploads
const uploadDir = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

// License Middleware
app.use('/api/license', licenseRoutes);

app.use((req, res, next) => {
  const openPaths = ['/api/auth', '/api/license', '/api/settings', '/api/health', '/api/restaurant/menu', '/api/restaurant/categories'];
  if (openPaths.some(p => req.path.startsWith(p)) || !req.path.startsWith('/api')) {
    return next();
  }
  return requireLicense(req, res, next);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/upload', uploadRoutes);
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Cleaned up debug endpoints


app.use('/api', dashboardRoutes);
app.use('/api/housekeeping', housekeepingRoutes);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/roles', roleRoutes);

// Serve frontend static files
const frontendPath = path.join(__dirname, '../../hms-frontend/out');
app.use(express.static(frontendPath, { extensions: ['html'] }));

// For SPA routing, fallback to correct HTML files for non-API routes.
// Tries in order:
//   1. {route}.html          ← flat export (what Next.js `output: 'export'` currently produces)
//   2. {route}/index.html    ← sub-directory export (alternate Next.js convention)
//   3. 404.html              ← explicit not-found page
app.use((req, res, next) => {
  if ((req.method === 'GET' || req.method === 'HEAD') && !req.path.startsWith('/api')) {
    if (req.path === '/' || req.path === '') {
      return res.redirect('/login');
    }

    const cleanPath = req.path.replace(/^\//, '').replace(/\/$/, '');

    const flatHtml   = path.join(frontendPath, `${cleanPath}.html`);
    const indexHtml  = path.join(frontendPath, cleanPath, 'index.html');
    const notFound   = path.join(frontendPath, '404.html');

    if (fs.existsSync(flatHtml)) {
      return res.sendFile(flatHtml);
    }
    if (fs.existsSync(indexHtml)) {
      return res.sendFile(indexHtml);
    }
    return res.status(404).sendFile(notFound, (err) => {
      if (err) next(err);
    });
  } else {
    next();
  }
});


app.get('/api/test-nodemon', (req, res) => res.json({ ok: true }));

// 404 Not Found Handler
app.use('/api', (req, res, next) => {
  res.status(404).json({ message: 'Resource not found' });
});

// Global Error Handler
app.use(errorHandler);

const server = http.createServer(app);
initializeSocket(server);

async function seedDefaultCategories() {
  try {
    const count = await prisma.menuCategory.count();
    if (count === 0) {
      const defaults = [
        'Breakfast', 'Lunch', 'Dinner', 'Main Course',
        'BBQ', 'Fast Food', 'Beverages', 'Tea & Coffee',
        'Desserts', 'Others'
      ];
      await prisma.menuCategory.createMany({
        data: defaults.map(name => ({ name }))
      });
      console.log('Seeded default menu categories.');
    }
  } catch (err) {
    console.error('Failed to seed menu categories:', err);
  }
}

async function seedDefaultRolePermissions() {
  try {
    // Ensure the Housekeeping role always has manage_housekeeping permission.
    // This is additive-only — any permissions already set by the Admin are preserved.
    const roleDefaults: Record<string, string[]> = {
      'Housekeeping': ['manage_housekeeping'],
      'Manager': [
        'view_dashboard', 'manage_bookings', 'view_bookings', 'manage_rooms',
        'view_rooms', 'manage_guests', 'manage_billing', 'manage_restaurant',
        'manage_housekeeping', 'manage_staff', 'view_reports'
      ],
      'Receptionist': [
        'view_dashboard', 'manage_bookings', 'view_bookings', 'manage_rooms',
        'view_rooms', 'manage_guests', 'manage_billing'
      ],
      'Restaurant': ['manage_restaurant'],
    };

    for (const [roleName, defaultPerms] of Object.entries(roleDefaults)) {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (!role) continue;

      const existingPerms: string[] = Array.isArray(role.permissions) ? role.permissions as string[] : [];
      const merged = Array.from(new Set([...existingPerms, ...defaultPerms]));

      if (merged.length !== existingPerms.length) {
        await prisma.role.update({
          where: { name: roleName },
          data: { permissions: merged }
        });
        console.log(`[Seed] Updated permissions for role "${roleName}": added ${merged.length - existingPerms.length} permission(s).`);
      }
    }
  } catch (err) {
    console.error('Failed to seed role permissions:', err);
  }
}

// First-run only: when the database has no users at all (fresh installation),
// create an 'admin' account with a random temporary password that must be
// changed on first login. The password is logged once, and the Electron shell
// surfaces it to the installer in a dialog. It is never a hardcoded default.
async function seedDefaultAdmin() {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) return;

    // Fresh installations start from an empty init.db, so the Admin role may
    // not exist yet. requirePermission treats the Admin role as full-access,
    // so an empty permission set is fine.
    let adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } });
    if (!adminRole) {
      adminRole = await prisma.role.create({ data: { name: 'Admin', permissions: [] } });
    }

    const tempPassword = crypto.randomBytes(6).toString('base64url');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@hotel.local',
        name: 'System Administrator',
        roleId: adminRole.id,
        passwordHash,
        mustChangePassword: true,
      }
    });
    console.log(`[FIRST_RUN_ADMIN_CREATED] username=admin password=${tempPassword}`);
  } catch (err) {
    console.error('Failed to seed default admin:', err);
  }
}

server.listen(port, async () => {
  await seedDefaultCategories();
  await seedDefaultRolePermissions();
  await seedDefaultAdmin();
  console.log(`Server is running on port ${port}`);
});
