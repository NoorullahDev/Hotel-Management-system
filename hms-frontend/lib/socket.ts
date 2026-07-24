import { io, Socket } from 'socket.io-client';
import { API_BASE } from './config';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') || localStorage.getItem('token') : null;
    
    const backendUrl = API_BASE;
    
    socket = io(backendUrl, {
      auth: { token },
      autoConnect: false // We will connect manually when needed or just rely on the component mount
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
  socket = null; // Ensure new logins get a fresh socket with their new token
};
