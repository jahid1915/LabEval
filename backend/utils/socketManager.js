/**
 * Socket.IO Manager for Real-Time Elective Course Updates
 * Manages socket connection, rooms, and scoped event broadcasting
 */
const { Server } = require('socket.io');

let io = null;

const initSocket = (httpServer, allowedOrigins = []) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/$/, '');
        const isAllowed = allowedOrigins.some(a => a.replace(/\/$/, '') === cleanOrigin);
        if (isAllowed || process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        return callback(new Error(`Socket CORS: Origin ${origin} not allowed`));
      },
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    // Client joins room for a specific elective offering
    socket.on('join:elective', (offeringId) => {
      if (offeringId) {
        socket.join(`elective:${offeringId}`);
      }
    });

    socket.on('leave:elective', (offeringId) => {
      if (offeringId) {
        socket.leave(`elective:${offeringId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
};

const getIO = () => io;

/**
 * Emit an elective event to clients subscribed to that offering
 * 
 * @param {string} offeringId 
 * @param {string} event - e.g. 'elective:countUpdated', 'elective:selectionUpdated'
 * @param {Object} data 
 */
const emitElectiveUpdate = (offeringId, event, data) => {
  if (!io) return;
  io.to(`elective:${offeringId}`).emit(event, data);
  // Also emit globally for admin dashboard monitor
  io.emit(event, { ...data, offeringId });
};

module.exports = {
  initSocket,
  getIO,
  emitElectiveUpdate
};
