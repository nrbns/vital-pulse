const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { query } = require('../database/connection');
const { checkUserBan } = require('../utils/safety');
const { getDonorPresence, updateDonorPresence, removeDonorPresence } = require('../services/presence');
const { joinEmergencyRoom, leaveEmergencyRoom } = require('../services/emergencyRealtime');

let io = null;

/**
 * Initialize Socket.IO server
 */
function initializeSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verify user
      const result = await query(
        'SELECT id, phone, country_code, roles, is_active FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        return next(new Error('Invalid or inactive user'));
      }

      // Check ban (allow connection for safety endpoints)
      const banCheck = await checkUserBan(decoded.userId);
      if (banCheck.banned) {
        return next(new Error('Account is temporarily banned'));
      }

      socket.user = result.rows[0];
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  // Connection handling
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const countryCode = socket.user.country_code || 'IN';

    console.log(`✅ WebSocket connected: ${userId} (${countryCode})`);

    // Join region room
    socket.join(`region:${countryCode.toLowerCase()}`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Initialize donor presence if user is a donor
    if (socket.user.roles && socket.user.roles.includes('donor')) {
      socket.on('donor:update-presence', async (data) => {
        try {
          const { isAvailable, latitude, longitude } = data;
          
          if (isAvailable && latitude && longitude) {
            await updateDonorPresence(userId, {
              isAvailable: true,
              latitude,
              longitude,
              countryCode,
              socketId: socket.id
            });
            
            // Join available donors room
            socket.join('donors:available');
            
            socket.emit('donor:presence-updated', { success: true });
          } else {
            await removeDonorPresence(userId);
            socket.leave('donors:available');
            socket.emit('donor:presence-updated', { success: true });
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to update presence' });
        }
      });
    }

    // Join emergency room
    socket.on('emergency:join', async (emergencyId) => {
      try {
        await joinEmergencyRoom(socket, emergencyId);
        socket.emit('emergency:joined', { emergencyId });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join emergency room' });
      }
    });

    // Leave emergency room
    socket.on('emergency:leave', async (emergencyId) => {
      try {
        await leaveEmergencyRoom(socket, emergencyId);
        socket.emit('emergency:left', { emergencyId });
      } catch (error) {
        socket.emit('error', { message: 'Failed to leave emergency room' });
      }
    });

    // Respond to emergency
    socket.on('emergency:respond', async (data) => {
      try {
        const { emergencyId, responseType, available } = data;
        
        // Emit to emergency room
        io.to(`emergency:${emergencyId}`).emit('emergency:response', {
          emergencyId,
          userId,
          responseType,
          available,
          timestamp: new Date().toISOString()
        });

        socket.emit('emergency:response-sent', { success: true });
      } catch (error) {
        socket.emit('error', { message: 'Failed to send response' });
      }
    });

    // Heartbeat for presence
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Disconnect handling
    socket.on('disconnect', async () => {
      console.log(`❌ WebSocket disconnected: ${userId}`);
      
      // Remove donor presence
      if (socket.user.roles && socket.user.roles.includes('donor')) {
        await removeDonorPresence(userId);
      }
    });
  });

  return io;
}

/**
 * Get Socket.IO instance
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocketIO first.');
  }
  return io;
}

/**
 * Emit to room
 */
function emitToRoom(room, event, data) {
  if (!io) return;
  io.to(room).emit(event, data);
}

/**
 * Emit to user
 */
function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

module.exports = {
  initializeSocketIO,
  getIO,
  emitToRoom,
  emitToUser
};

