import 'dotenv/config';
import express from 'express';
import http from 'http';
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
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

// Serve static uploads
const uploadDir = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

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

// For SPA routing, fallback to correct HTML files for non-API routes
app.use((req, res, next) => {
  if ((req.method === 'GET' || req.method === 'HEAD') && !req.path.startsWith('/api')) {
    if (req.path === '/' || req.path === '') {
      return res.sendFile(path.join(frontendPath, 'login.html'));
    }
    // If a specific route like /dashboard is requested and express.static didn't find it,
    // it usually means the HTML file exists as <route>.html
    const htmlFile = req.path === '/' ? 'login.html' : `${req.path.replace(/^\//, '')}.html`;
    res.sendFile(path.join(frontendPath, htmlFile), (err) => {
      if (err) {
        // Fallback to 404 if file doesn't exist
        res.status(404).sendFile(path.join(frontendPath, '404.html'));
      }
    });
  } else {
    next();
  }
});

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
      const defaults = ['Starter', 'Main Course', 'Beverage', 'Dessert'];
      await prisma.menuCategory.createMany({
        data: defaults.map(name => ({ name }))
      });
      console.log('Seeded default menu categories.');
    }
  } catch (err) {
    console.error('Failed to seed menu categories:', err);
  }
}

server.listen(port, async () => {
  await seedDefaultCategories();
  console.log(`Server is running on port ${port}`);
});
