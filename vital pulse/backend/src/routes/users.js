const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../database/connection');
const { checkUserBan } = require('../utils/safety');

/**
 * Get current user profile
 * GET /api/v1/users/me
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    // Check if user is banned
    const banCheck = await checkUserBan(req.user.id);
    if (banCheck.banned) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'BANNED',
          message: banCheck.reason || 'Account is temporarily banned',
          until: banCheck.until
        }
      });
    }

    const result = await query(
      `SELECT id, phone, country_code, preferred_language, name, age, city, 
              gender, blood_group, last_donation_date, health_notes, roles,
              latitude, longitude, location_updated_at, is_verified, 
              privacy_settings, disclaimer_accepted, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update user profile
 * PUT /api/v1/users/me
 */
router.put('/me', authenticateToken, async (req, res, next) => {
  try {
    const { name, age, city, gender, preferredLanguage } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (age !== undefined) {
      updates.push(`age = $${paramCount++}`);
      values.push(age);
    }
    if (city !== undefined) {
      updates.push(`city = $${paramCount++}`);
      values.push(city);
    }
    if (gender !== undefined) {
      updates.push(`gender = $${paramCount++}`);
      values.push(gender);
    }
    if (preferredLanguage !== undefined) {
      updates.push(`preferred_language = $${paramCount++}`);
      values.push(preferredLanguage);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No fields to update'
        }
      });
    }

    values.push(req.user.id);
    const queryText = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, phone, country_code, preferred_language, name, age, city, 
                gender, blood_group, roles, created_at, updated_at
    `;

    const result = await query(queryText, values);

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update user location
 * PUT /api/v1/users/me/location
 */
router.put('/me/location', authenticateToken, async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Latitude and longitude are required'
        }
      });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid latitude or longitude values'
        }
      });
    }

    await query(
      `UPDATE users 
       SET latitude = $1, longitude = $2, location_updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [latitude, longitude, req.user.id]
    );

    res.json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

