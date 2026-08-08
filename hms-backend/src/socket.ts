import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET must be defined in environment variables.');
}

let io: SocketIOServer | null = null;

export const initializeSocket = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      // The statically-exported frontend is served by this same Express server
      // (the desktop app loads it from http://127.0.0.1:PORT), so socket
      // connections arrive from that origin — not from the old Next.js dev
      // server at localhost:3000, which does not exist in the desktop build.
      origin: process.env.FRONTEND_URL || 'http://127.0.0.1:4000',
      methods: ['GET', 'POST'],
    }
  });

  io.use((socket, next) => {
    // Authenticate socket connection
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    // Default to main hotel for now since multi-tenancy is not yet in schema
    const hotelId = 'main';
    const roomName = `hotel:${hotelId}`;
    
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined room: ${roomName}`);

    // Join user-specific room for targeted notifications
    const user = (socket as any).user;
    if (user && user.userId) {
      socket.join(`user:${user.userId}`);
      console.log(`Socket ${socket.id} joined user room: user:${user.userId}`);
    }

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

export const emitToHotel = (hotelId: string = 'main', event: string, payload: any) => {
  if (!io) {
    console.warn('Socket.io not initialized. Skipping emit.');
    return;
  }
  io.to(`hotel:${hotelId}`).emit(event, payload);
};
