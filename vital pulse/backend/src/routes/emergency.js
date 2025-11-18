const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { query } = require('../database/connection');

/**
 * Find nearest hospitals
 * GET /api/v1/emergency/hospitals
 */
router.get('/hospitals', optionalAuth, async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 25, emergency, openNow } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Latitude and longitude are required'
        }
      });
    }

    let queryText = `
      SELECT id, name, address, city, type, latitude, longitude, phone, emergency,
             operating_hours, specialties, rating, verified,
             ST_Distance(
               ST_MakePoint(longitude, latitude)::geography,
               ST_MakePoint($1, $2)::geography
             ) / 1000 as distance_km,
             CASE 
               WHEN operating_hours IS NOT NULL THEN check_hospital_open(operating_hours::jsonb)
               ELSE true
             END as open_now
      FROM hospitals
      WHERE is_active = true
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND ST_DWithin(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint($1, $2)::geography,
          $3 * 1000
        )
    `;

    const params = [parseFloat(longitude), parseFloat(latitude), parseFloat(radius)];
    let paramCount = 4;

    if (emergency === 'true') {
      queryText += ` AND emergency = true`;
    }

    // Note: openNow filtering would need a proper function
    // Simplified for now

    queryText += `
      ORDER BY 
        CASE WHEN emergency = true THEN 0 ELSE 1 END,
        distance_km ASC
      LIMIT 20
    `;

    const result = await query(queryText, params);

    res.json({
      success: true,
      hospitals: result.rows.map(h => ({
        ...h,
        eta: calculateETA(h.distance_km),
        openNow: h.open_now !== false // Simplified
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get hospital details
 * GET /api/v1/emergency/hospitals/:id
 */
router.get('/hospitals/:id', optionalAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT *
       FROM hospitals
       WHERE id = $1 AND is_active = true`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Hospital not found'
        }
      });
    }

    res.json({
      success: true,
      hospital: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Find nearest blood banks
 * GET /api/v1/emergency/blood-banks
 */
router.get('/blood-banks', optionalAuth, async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 50, bloodGroup } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Latitude and longitude are required'
        }
      });
    }

    let queryText = `
      SELECT h.id, h.name, h.address, h.city, h.latitude, h.longitude, h.phone,
             ST_Distance(
               ST_MakePoint(h.longitude, h.latitude)::geography,
               ST_MakePoint($1, $2)::geography
             ) / 1000 as distance_km
      FROM hospitals h
      WHERE h.type = 'blood_bank'
        AND h.is_active = true
        AND h.latitude IS NOT NULL 
        AND h.longitude IS NOT NULL
        AND ST_DWithin(
          ST_MakePoint(h.longitude, h.latitude)::geography,
          ST_MakePoint($1, $2)::geography,
          $3 * 1000
        )
    `;

    const params = [parseFloat(longitude), parseFloat(latitude), parseFloat(radius)];

    queryText += `
      ORDER BY distance_km ASC
      LIMIT 20
    `;

    const result = await query(queryText, params);

    // Get inventory for each blood bank
    const bloodBanks = await Promise.all(
      result.rows.map(async (bank) => {
        const inventoryResult = await query(
          `SELECT blood_group, status, units
           FROM blood_inventory
           WHERE hospital_id = $1
           ${bloodGroup ? 'AND blood_group = $2' : ''}`,
          bloodGroup ? [bank.id, bloodGroup] : [bank.id]
        );

        const inventory = {};
        inventoryResult.rows.forEach(row => {
          inventory[row.blood_group] = row.status;
        });

        return {
          ...bank,
          inventory
        };
      })
    );

    res.json({
      success: true,
      bloodBanks
    });
  } catch (error) {
    next(error);
  }
});

function calculateETA(distanceKm) {
  // Rough estimate: 40 km/h average in city
  const minutes = Math.ceil((distanceKm / 40) * 60);
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
}

module.exports = router;

