const { Client } = require('pg');
const { getIO } = require('../ws');
const { updateEmergencyStatus } = require('../services/emergencyRealtime');

let pgClient = null;
let isListening = false;

/**
 * Initialize PostgreSQL LISTEN client
 */
function initializePGListener() {
  if (isListening) {
    return;
  }

  const connectionString = process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

  pgClient = new Client({
    connectionString,
    connectionTimeoutMillis: 5000
  });

  pgClient.on('error', (err) => {
    console.error('PostgreSQL listener error:', err);
    isListening = false;
    // Reconnect after 5 seconds
    setTimeout(() => {
      if (!isListening) {
        initializePGListener();
      }
    }, 5000);
  });

  pgClient.on('notification', async (msg) => {
    try {
      const channel = msg.channel;
      const payload = JSON.parse(msg.payload);

      console.log(`📢 PostgreSQL notification: ${channel}`, payload);

      switch (channel) {
        case 'emergency_created':
          await handleEmergencyCreated(payload);
          break;
        
        case 'emergency_response':
          await handleEmergencyResponse(payload);
          break;
        
        case 'emergency_status_update':
          await handleEmergencyStatusUpdate(payload);
          break;
        
        case 'hospital_status_update':
          await handleHospitalStatusUpdate(payload);
          break;
        
        case 'blood_inventory_update':
          await handleBloodInventoryUpdate(payload);
          break;
        
        default:
          console.warn(`Unknown notification channel: ${channel}`);
      }
    } catch (error) {
      console.error('Error processing PostgreSQL notification:', error);
    }
  });

  pgClient.connect()
    .then(() => {
      console.log('✅ PostgreSQL listener connected');
      
      // Listen to all channels
      pgClient.query('LISTEN emergency_created');
      pgClient.query('LISTEN emergency_response');
      pgClient.query('LISTEN emergency_status_update');
      pgClient.query('LISTEN hospital_status_update');
      pgClient.query('LISTEN blood_inventory_update');
      
      isListening = true;
      console.log('✅ PostgreSQL listener started');
    })
    .catch((err) => {
      console.error('Failed to connect PostgreSQL listener:', err);
      isListening = false;
    });
}

/**
 * Handle emergency created notification
 */
async function handleEmergencyCreated(payload) {
  try {
    const io = getIO();
    if (!io) return;

    // Emit to region room
    io.to(`region:${payload.country_code?.toLowerCase() || 'in'}`).emit('emergency:created', {
      emergencyId: payload.id,
      bloodGroup: payload.blood_group,
      urgency: payload.urgency,
      latitude: payload.hospital_latitude,
      longitude: payload.hospital_longitude,
      createdAt: payload.created_at
    });
  } catch (error) {
    console.error('Error handling emergency created:', error);
  }
}

/**
 * Handle emergency response notification
 */
async function handleEmergencyResponse(payload) {
  try {
    const io = getIO();
    if (!io) return;

    // Emit to emergency room
    io.to(`emergency:${payload.emergency_id}`).emit('emergency:response', {
      emergencyId: payload.emergency_id,
      donorId: payload.donor_id,
      hospitalId: payload.hospital_id,
      responseType: payload.response_type,
      status: payload.status,
      timestamp: payload.created_at
    });

    // Update emergency status if needed
    if (payload.status === 'confirmed') {
      await updateEmergencyStatus(payload.emergency_id, {
        matchedDonorsCount: null // Will be recalculated
      });
    }
  } catch (error) {
    console.error('Error handling emergency response:', error);
  }
}

/**
 * Handle emergency status update notification
 */
async function handleEmergencyStatusUpdate(payload) {
  try {
    const io = getIO();
    if (!io) return;

    // Emit to emergency room
    io.to(`emergency:${payload.id}`).emit('emergency:status-updated', {
      emergencyId: payload.id,
      oldStatus: payload.old_status,
      newStatus: payload.new_status,
      timestamp: payload.updated_at
    });
  } catch (error) {
    console.error('Error handling emergency status update:', error);
  }
}

/**
 * Handle hospital status update notification
 */
async function handleHospitalStatusUpdate(payload) {
  try {
    const io = getIO();
    if (!io) return;

    // Emit to region room
    io.to(`region:${payload.country_code?.toLowerCase() || 'in'}`).emit('hospital:status-updated', {
      hospitalId: payload.id,
      name: payload.name,
      type: payload.type,
      emergency: payload.emergency,
      isActive: payload.is_active,
      latitude: payload.latitude,
      longitude: payload.longitude
    });
  } catch (error) {
    console.error('Error handling hospital status update:', error);
  }
}

/**
 * Handle blood inventory update notification
 */
async function handleBloodInventoryUpdate(payload) {
  try {
    const io = getIO();
    if (!io) return;

    // Emit to region room (hospitals/blood banks)
    // You can also emit to specific emergency rooms if there are active requests for this blood group
    io.emit('blood_inventory:updated', {
      hospitalId: payload.hospital_id,
      bloodGroup: payload.blood_group,
      status: payload.status,
      units: payload.units,
      lastUpdated: payload.last_updated
    });
  } catch (error) {
    console.error('Error handling blood inventory update:', error);
  }
}

/**
 * Stop listening
 */
function stopPGListener() {
  if (pgClient && isListening) {
    pgClient.end();
    isListening = false;
    console.log('❌ PostgreSQL listener stopped');
  }
}

module.exports = {
  initializePGListener,
  stopPGListener
};

