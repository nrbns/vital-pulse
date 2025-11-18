const Redis = require('ioredis');
const { query } = require('../database/connection');

let redis = null;

/**
 * Initialize Redis connection
 */
function getRedis() {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });

    redis.on('error', (err) => {
      console.error('Redis error:', err);
    });

    redis.on('connect', () => {
      console.log('✅ Redis connected');
    });
  }
  return redis;
}

/**
 * Update donor presence in Redis
 */
async function updateDonorPresence(userId, data) {
  try {
    const client = getRedis();
    const { isAvailable, latitude, longitude, countryCode, socketId, bloodGroup } = data;

    // Store donor presence data
    const presenceKey = `donor:presence:${userId}`;
    const presenceData = {
      isAvailable: isAvailable ? '1' : '0',
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      countryCode: countryCode || 'IN',
      socketId: socketId || '',
      bloodGroup: bloodGroup || '',
      updatedAt: Date.now().toString()
    };

    await client.hset(presenceKey, presenceData);
    
    // Set expiration (30 minutes of inactivity)
    await client.expire(presenceKey, 1800);

    // Add to geo-index if available
    if (isAvailable && latitude && longitude) {
      const geoKey = `donors:geo:${countryCode.toLowerCase()}`;
      await client.geoadd(geoKey, longitude, latitude, userId);
      
      // Also store by blood group for faster lookup
      if (bloodGroup) {
        const bgGeoKey = `donors:geo:${countryCode.toLowerCase()}:${bloodGroup}`;
        await client.geoadd(bgGeoKey, longitude, latitude, userId);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating donor presence:', error);
    throw error;
  }
}

/**
 * Remove donor presence
 */
async function removeDonorPresence(userId) {
  try {
    const client = getRedis();

    // Get presence data to find geo-keys
    const presenceKey = `donor:presence:${userId}`;
    const presenceData = await client.hgetall(presenceKey);

    if (presenceData && presenceData.countryCode) {
      const countryCode = presenceData.countryCode.toLowerCase();
      const bloodGroup = presenceData.bloodGroup;

      // Remove from geo-index
      const geoKey = `donors:geo:${countryCode}`;
      await client.zrem(geoKey, userId);

      if (bloodGroup) {
        const bgGeoKey = `donors:geo:${countryCode}:${bloodGroup}`;
        await client.zrem(bgGeoKey, userId);
      }
    }

    // Remove presence data
    await client.del(presenceKey);

    return { success: true };
  } catch (error) {
    console.error('Error removing donor presence:', error);
    throw error;
  }
}

/**
 * Get nearby available donors
 */
async function getNearbyDonors(latitude, longitude, radiusKm, bloodGroup, countryCode) {
  try {
    const client = getRedis();
    const radiusM = radiusKm * 1000; // Convert to meters
    const countryCodeLower = (countryCode || 'IN').toLowerCase();

    // Use geo-index for fast lookup
    const geoKey = bloodGroup 
      ? `donors:geo:${countryCodeLower}:${bloodGroup}`
      : `donors:geo:${countryCodeLower}`;

    // Get donors within radius
    const results = await client.georadius(
      geoKey,
      longitude,
      latitude,
      radiusM,
      'm',
      'WITHCOORD',
      'WITHDIST'
    );

    // Filter only available donors and get details
    const nearbyDonors = [];
    
    for (const result of results) {
      const userId = result[0];
      const distance = parseFloat(result[1]);
      const [lng, lat] = result[2];

      // Check if donor is still available
      const presenceKey = `donor:presence:${userId}`;
      const presence = await client.hgetall(presenceKey);

      if (presence && presence.isAvailable === '1') {
        nearbyDonors.push({
          userId,
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          distance: Math.round(distance / 1000 * 100) / 100, // km with 2 decimals
          bloodGroup: presence.bloodGroup || '',
          socketId: presence.socketId || null
        });
      }
    }

    // Sort by distance
    nearbyDonors.sort((a, b) => a.distance - b.distance);

    return nearbyDonors;
  } catch (error) {
    console.error('Error getting nearby donors:', error);
    // Fallback to database query if Redis fails
    return await getNearbyDonorsFromDB(latitude, longitude, radiusKm, bloodGroup, countryCode);
  }
}

/**
 * Fallback: Get nearby donors from database
 */
async function getNearbyDonorsFromDB(latitude, longitude, radiusKm, bloodGroup, countryCode) {
  try {
    let queryText = `
      SELECT d.user_id, u.latitude, u.longitude, d.blood_group, d.is_eligible,
             ST_Distance(
               ST_MakePoint(u.longitude, u.latitude)::geography,
               ST_MakePoint($1, $2)::geography
             ) / 1000 as distance_km
      FROM donors d
      JOIN users u ON d.user_id = u.id
      WHERE d.is_active = true 
        AND d.is_eligible = true
        AND u.latitude IS NOT NULL 
        AND u.longitude IS NOT NULL
        AND u.country_code = $3
        AND ST_DWithin(
          ST_MakePoint(u.longitude, u.latitude)::geography,
          ST_MakePoint($1, $2)::geography,
          $4 * 1000
        )
    `;

    const params = [parseFloat(longitude), parseFloat(latitude), countryCode || 'IN', radiusKm];
    let paramCount = 5;

    if (bloodGroup) {
      queryText += ` AND d.blood_group = $${paramCount++}`;
      params.push(bloodGroup);
    }

    queryText += ` ORDER BY distance_km ASC LIMIT 50`;

    const result = await query(queryText, params);

    return result.rows.map(row => ({
      userId: row.user_id,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      distance: Math.round(parseFloat(row.distance_km) * 100) / 100,
      bloodGroup: row.blood_group,
      isEligible: row.is_eligible
    }));
  } catch (error) {
    console.error('Error getting nearby donors from DB:', error);
    return [];
  }
}

/**
 * Get donor presence
 */
async function getDonorPresence(userId) {
  try {
    const client = getRedis();
    const presenceKey = `donor:presence:${userId}`;
    const presence = await client.hgetall(presenceKey);

    if (!presence || Object.keys(presence).length === 0) {
      return null;
    }

    return {
      isAvailable: presence.isAvailable === '1',
      latitude: parseFloat(presence.latitude),
      longitude: parseFloat(presence.longitude),
      countryCode: presence.countryCode,
      bloodGroup: presence.bloodGroup || '',
      updatedAt: new Date(parseInt(presence.updatedAt))
    };
  } catch (error) {
    console.error('Error getting donor presence:', error);
    return null;
  }
}

/**
 * Get online donor count in region
 */
async function getOnlineDonorCount(countryCode, bloodGroup = null) {
  try {
    const client = getRedis();
    const countryCodeLower = (countryCode || 'IN').toLowerCase();

    if (bloodGroup) {
      const geoKey = `donors:geo:${countryCodeLower}:${bloodGroup}`;
      return await client.zcard(geoKey);
    } else {
      const geoKey = `donors:geo:${countryCodeLower}`;
      return await client.zcard(geoKey);
    }
  } catch (error) {
    console.error('Error getting online donor count:', error);
    return 0;
  }
}

module.exports = {
  getRedis,
  updateDonorPresence,
  removeDonorPresence,
  getNearbyDonors,
  getDonorPresence,
  getOnlineDonorCount
};

