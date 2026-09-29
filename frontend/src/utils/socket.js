import { io } from 'socket.io-client';

// Derive server root URL from Vite environment or default localhost:5000
const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '');
  }
  return window.location.origin.includes('localhost') ? 'http://localhost:5000' : window.location.origin;
};

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });
  }
  return socketInstance;
};

export default getSocket;
