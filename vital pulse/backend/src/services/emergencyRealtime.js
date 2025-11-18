const { getIO, emitToRoom } = require('../ws');
const { getNearbyDonors } = require('./presence');
const { query } = require('../database/connection');
const { enqueueEmergencyNotifications } = require('./notifications');

/**
 * Create emergency and fan-out notifications
 */
async function createEmergency(emergencyData) {
  try {
    const {
      userId,
      bloodGroup,
      urgency,
      hospitalName,
      hospitalBedNumber,
      hospitalLatitude,
      hospitalLongitude,
      countryCode,
      ...otherData
    } = emergencyData;

    // Create emergency record
    const result = await query(
      `INSERT INTO blood_requests 
       (user_id, blood_group, urgency, patient_name, hospital_name, hospital_address,
        hospital_bed_number, hospital_ward, hospital_latitude, hospital_longitude, 
        contact_phone, contact_phone_masked, notes, prescription_image_url, 
        visible_radius_km, country_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        userId, bloodGroup, urgency, otherData.patientName, hospitalName,
        otherData.hospitalAddress, hospitalBedNumber, otherData.hospitalWard,
        hospitalLatitude, hospitalLongitude, otherData.contactPhone, true,
        otherData.notes, otherData.prescriptionImageUrl, 30, countryCode
      ]
    );

    const emergency = result.rows[0];

    // Find nearby donors (realtime + database)
    const nearbyDonors = await getNearbyDonors(
      hospitalLatitude,
      hospitalLongitude,
      30, // 30km radius
      bloodGroup,
      countryCode
    );

    // Find nearby hospitals/blood banks
    const nearbyHospitals = await query(
      `SELECT id, name, latitude, longitude, type, emergency,
              ST_Distance(
                ST_MakePoint(longitude, latitude)::geography,
                ST_MakePoint($1, $2)::geography
              ) / 1000 as distance_km
       FROM hospitals
       WHERE is_active = true
         AND latitude IS NOT NULL 
         AND longitude IS NOT NULL
         AND country_code = $3
         AND (type = 'blood_bank' OR emergency = true)
         AND ST_DWithin(
           ST_MakePoint(longitude, latitude)::geography,
           ST_MakePoint($1, $2)::geography,
           50 * 1000
         )
       ORDER BY distance_km ASC
       LIMIT 20`,
      [parseFloat(hospitalLongitude), parseFloat(hospitalLatitude), countryCode]
    );

    // Update matched counts
    await query(
      `UPDATE blood_requests 
       SET matched_donors_count = $1, matched_blood_banks_count = $2
       WHERE id = $3`,
      [nearbyDonors.length, nearbyHospitals.rows.length, emergency.id]
    );

    // Emit to WebSocket rooms
    const io = getIO();
    if (io) {
      // Emit to region room for hospitals
      emitToRoom(`region:${countryCode.toLowerCase()}`, 'emergency:created', {
        emergencyId: emergency.id,
        bloodGroup,
        urgency,
        hospitalName,
        distance: 0, // Will be calculated per recipient
        latitude: hospitalLatitude,
        longitude: hospitalLongitude
      });

      // Emit to emergency room for requester
      emitToRoom(`emergency:${emergency.id}`, 'emergency:status-updated', {
        emergencyId: emergency.id,
        status: 'active',
        matchedDonors: nearbyDonors.length,
        matchedHospitals: nearbyHospitals.rows.length
      });

      // Emit to nearby donors via WebSocket (if online)
      for (const donor of nearbyDonors) {
        if (donor.socketId) {
          io.to(donor.socketId).emit('emergency:nearby', {
            emergencyId: emergency.id,
            bloodGroup,
            urgency,
            hospitalName,
            hospitalBedNumber,
            distance: donor.distance,
            latitude: hospitalLatitude,
            longitude: hospitalLongitude,
            createdAt: emergency.created_at
          });
        }
      }
    }

    // Enqueue push notifications and SMS (background jobs)
    await enqueueEmergencyNotifications({
      emergency,
      nearbyDonors: nearbyDonors.map(d => d.userId),
      nearbyHospitals: nearbyHospitals.rows.map(h => h.id)
    });

    return {
      ...emergency,
      matchedDonors: nearbyDonors.length,
      matchedHospitals: nearbyHospitals.rows.length,
      nearbyDonors: nearbyDonors.slice(0, 10) // Return first 10 for preview
    };
  } catch (error) {
    console.error('Error creating emergency:', error);
    throw error;
  }
}

/**
 * Join emergency room (WebSocket)
 */
async function joinEmergencyRoom(socket, emergencyId) {
  try {
    // Verify emergency exists
    const result = await query(
      'SELECT id, user_id, status FROM blood_requests WHERE id = $1',
      [emergencyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Emergency not found');
    }

    const emergency = result.rows[0];

    // Join emergency room
    socket.join(`emergency:${emergencyId}`);

    // If user is the requester, also join personal room
    if (emergency.user_id === socket.user.id) {
      socket.join(`emergency:${emergencyId}:requester`);
    }

    // Get current emergency status
    const statusResult = await query(
      `SELECT br.*, 
              COUNT(DISTINCT brr.id) as response_count
       FROM blood_requests br
       LEFT JOIN blood_request_responses brr ON br.id = brr.request_id 
         AND brr.status = 'confirmed'
       WHERE br.id = $1
       GROUP BY br.id`,
      [emergencyId]
    );

    if (statusResult.rows.length > 0) {
      socket.emit('emergency:status', statusResult.rows[0]);
    }

    return { success: true, emergencyId };
  } catch (error) {
    console.error('Error joining emergency room:', error);
    throw error;
  }
}

/**
 * Leave emergency room
 */
async function leaveEmergencyRoom(socket, emergencyId) {
  socket.leave(`emergency:${emergencyId}`);
  socket.leave(`emergency:${emergencyId}:requester`);
  return { success: true, emergencyId };
}

/**
 * Update emergency status (when donor responds, etc.)
 */
async function updateEmergencyStatus(emergencyId, updates) {
  try {
    const { emitToRoom } = require('../ws');
    
    // Update database
    const updatesList = [];
    const values = [];
    let paramCount = 1;

    if (updates.status) {
      updatesList.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }
    if (updates.matchedDonorsCount !== undefined) {
      updatesList.push(`matched_donors_count = $${paramCount++}`);
      values.push(updates.matchedDonorsCount);
    }

    if (updatesList.length > 0) {
      values.push(emergencyId);
      await query(
        `UPDATE blood_requests 
         SET ${updatesList.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${paramCount}`,
        values
      );
    }

    // Emit to emergency room
    emitToRoom(`emergency:${emergencyId}`, 'emergency:status-updated', {
      emergencyId,
      ...updates,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating emergency status:', error);
    throw error;
  }
}

module.exports = {
  createEmergency,
  joinEmergencyRoom,
  leaveEmergencyRoom,
  updateEmergencyStatus
};

