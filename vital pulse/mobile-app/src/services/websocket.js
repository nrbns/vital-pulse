import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

let socket = null;

/**
 * Initialize WebSocket connection
 */
export function initializeSocket(token) {
  // If already connected with same token, return existing
  if (socket && socket.connected) {
    return socket;
  }

  // Disconnect existing if token changed
  if (socket) {
    socket.disconnect();
  }

  const wsUrl = API_BASE_URL.replace('/api/v1', '').replace('http://', 'ws://').replace('https://', 'wss://');

  socket = io(wsUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    timeout: 20000,
    autoConnect: true
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ WebSocket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
  });

  // Heartbeat
  socket.on('pong', (data) => {
    console.log('Pong received:', data);
  });

  return socket;
}

/**
 * Get socket instance
 */
export function getSocket() {
  if (!socket) {
    throw new Error('Socket not initialized. Call initializeSocket first.');
  }
  return socket;
}

/**
 * Update donor presence
 */
export function updateDonorPresence(isAvailable, latitude, longitude) {
  const socket = getSocket();
  socket.emit('donor:update-presence', {
    isAvailable,
    latitude,
    longitude
  });
}

/**
 * Join emergency room
 */
export function joinEmergencyRoom(emergencyId) {
  const socket = getSocket();
  socket.emit('emergency:join', emergencyId);
}

/**
 * Leave emergency room
 */
export function leaveEmergencyRoom(emergencyId) {
  const socket = getSocket();
  socket.emit('emergency:leave', emergencyId);
}

/**
 * Respond to emergency
 */
export function respondToEmergency(emergencyId, responseType, available) {
  const socket = getSocket();
  socket.emit('emergency:respond', {
    emergencyId,
    responseType,
    available
  });
}

/**
 * Subscribe to emergency events
 */
export function onEmergencyEvent(event, callback) {
  const socket = getSocket();
  socket.on(event, callback);
}

/**
 * Unsubscribe from emergency events
 */
export function offEmergencyEvent(event, callback) {
  const socket = getSocket();
  socket.off(event, callback);
}

/**
 * Disconnect socket
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export default {
  initializeSocket,
  getSocket,
  updateDonorPresence,
  joinEmergencyRoom,
  leaveEmergencyRoom,
  respondToEmergency,
  onEmergencyEvent,
  offEmergencyEvent,
  disconnectSocket
};

