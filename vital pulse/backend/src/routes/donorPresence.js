const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { query } = require('../database/connection');
const { updateDonorPresence, removeDonorPresence, getDonorPresence, getOnlineDonorCount } = require('../services/presence');

/**
 * Update donor availability/presence
 * PATCH /api/v1/donors/me/presence
 */
router.patch('/me/presence', authenticateToken, requireRole('donor'), async (req, res, next) => {
  try {
    const { isAvailable, latitude, longitude } = req.body;

    if (isAvailable === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'isAvailable is required'
        }
      });
    }

    if (isAvailable && (!latitude || !longitude)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Latitude and longitude are required when marking available'
        }
      });
    }

    // Get donor info
    const donorResult = await query(
      `SELECT d.blood_group, u.country_code
       FROM donors d
       JOIN users u ON d.user_id = u.id
       WHERE d.user_id = $1`,
      [req.user.id]
    );

    if (donorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Donor profile not found'
        }
      });
    }

    const donor = donorResult.rows[0];

    if (isAvailable) {
      // Update presence in Redis
      await updateDonorPresence(req.user.id, {
        isAvailable: true,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        countryCode: donor.country_code,
        bloodGroup: donor.blood_group
      });

      res.json({
        success: true,
        message: 'Donor marked as available',
        presence: {
          isAvailable: true,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        }
      });
    } else {
      // Remove presence
      await removeDonorPresence(req.user.id);

      res.json({
        success: true,
        message: 'Donor marked as unavailable',
        presence: {
          isAvailable: false
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Get donor presence status
 * GET /api/v1/donors/me/presence
 */
router.get('/me/presence', authenticateToken, requireRole('donor'), async (req, res, next) => {
  try {
    const presence = await getDonorPresence(req.user.id);

    res.json({
      success: true,
      presence: presence || {
        isAvailable: false
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get online donor count in region
 * GET /api/v1/donors/online?countryCode&bloodGroup
 */
router.get('/online', optionalAuth, async (req, res, next) => {
  try {
    const countryCode = req.query.countryCode || req.user?.country_code || 'IN';
    const bloodGroup = req.query.bloodGroup;

    const count = await getOnlineDonorCount(countryCode, bloodGroup);

    res.json({
      success: true,
      count,
      countryCode,
      bloodGroup: bloodGroup || 'all'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

