/**
 * Socket.IO Manager for Real-Time Elective Courses & Project Team Collaboration
 * Manages socket connections, rooms, online presence, and scoped event broadcasting
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

// Track presence: projectId -> Map<userId, { userId, name, role, rollNumber, socketId, status: 'online' | 'away' }>
const projectPresence = new Map();

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
    // ── ELECTIVE ROOMS ───────────────────────────────────────────────
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

    // ── REAL-TIME PROJECT TEAM WORKSPACE ROOMS ────────────────────────
    socket.on('join:project', async (data) => {
      try {
        const { projectId, token, userInfo } = data || {};
        if (!projectId) return;

        // Verify token if provided
        let user = userInfo || {};
        if (token && process.env.JWT_SECRET) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            user = {
              userId: decoded.id || decoded._id || user.userId,
              name: decoded.name || user.name,
              role: decoded.role || user.role,
              rollNumber: decoded.rollNumber || decoded.identifier || user.rollNumber
            };
          } catch {
            // Token verification failed; fallback to provided basic info if safe
          }
        }

        const roomKey = `project:${projectId}`;
        socket.join(roomKey);
        socket.data = { ...(socket.data || {}), projectId, user };

        if (!projectPresence.has(projectId)) {
          projectPresence.set(projectId, new Map());
        }

        const roomUsers = projectPresence.get(projectId);
        const uId = user.userId || socket.id;

        roomUsers.set(uId, {
          userId: uId,
          name: user.name || 'Team Member',
          role: user.role || 'student',
          rollNumber: user.rollNumber || '',
          status: 'online',
          socketId: socket.id,
          lastSeen: new Date()
        });

        // Broadcast updated presence list to everyone in this project room
        const presenceList = Array.from(roomUsers.values()).map(u => ({
          userId: u.userId,
          name: u.name,
          role: u.role,
          rollNumber: u.rollNumber,
          status: u.status,
          lastSeen: u.lastSeen
        }));

        io.to(roomKey).emit('project:presenceUpdated', {
          projectId,
          members: presenceList
        });
      } catch (err) {
        console.error('Socket join:project error:', err.message);
      }
    });

    socket.on('leave:project', ({ projectId }) => {
      if (!projectId) return;
      const roomKey = `project:${projectId}`;
      socket.leave(roomKey);

      if (projectPresence.has(projectId)) {
        const roomUsers = projectPresence.get(projectId);
        const uId = socket.data?.user?.userId || socket.id;
        roomUsers.delete(uId);

        const presenceList = Array.from(roomUsers.values()).map(u => ({
          userId: u.userId,
          name: u.name,
          role: u.role,
          rollNumber: u.rollNumber,
          status: u.status,
          lastSeen: u.lastSeen
        }));

        io.to(roomKey).emit('project:presenceUpdated', {
          projectId,
          members: presenceList
        });
      }
    });

    socket.on('disconnect', () => {
      const projectId = socket.data?.projectId;
      if (projectId && projectPresence.has(projectId)) {
        const roomUsers = projectPresence.get(projectId);
        const uId = socket.data?.user?.userId || socket.id;
        roomUsers.delete(uId);

        const presenceList = Array.from(roomUsers.values()).map(u => ({
          userId: u.userId,
          name: u.name,
          role: u.role,
          rollNumber: u.rollNumber,
          status: u.status,
          lastSeen: u.lastSeen
        }));

        io.to(`project:${projectId}`).emit('project:presenceUpdated', {
          projectId,
          members: presenceList
        });
      }
    });
  });

  return io;
};

const getIO = () => io;

/**
 * Emit elective updates
 */
const emitElectiveUpdate = (offeringId, event, data) => {
  if (!io) return;
  io.to(`elective:${offeringId}`).emit(event, data);
  io.emit(event, { ...data, offeringId });
};

/**
 * Emit project updates to a specific project room
 */
const emitProjectUpdate = (projectId, event, data) => {
  if (!io || !projectId) return;
  io.to(`project:${projectId}`).emit(event, { ...data, projectId });
};

module.exports = {
  initSocket,
  getIO,
  emitElectiveUpdate,
  emitProjectUpdate
};
