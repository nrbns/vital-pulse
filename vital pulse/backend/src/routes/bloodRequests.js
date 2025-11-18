const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { query } = require('../database/connection');
const { 
  checkRateLimit, 
  incrementRateLimit, 
  validateBloodRequest, 
  checkUserBan,
  maskPhoneNumber 
} = require('../utils/safety');

/**
 * Create blood request
 * POST /api/v1/blood-requests
 */
router.post('/', authenticateToken, async (req, res, next) => {
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

    // Check rate limit (max 3 requests per 24 hours)
    const rateLimitCheck = await checkRateLimit(req.user.id, 'request', 3, 24);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: rateLimitCheck.reason || 'Too many requests. Maximum 3 requests per 24 hours.',
          resetAt: rateLimitCheck.resetAt
        }
      });
    }

    const {
      bloodGroup,
      urgency,
      patientName,
      hospitalName,
      hospitalAddress,
      hospitalBedNumber,
      hospitalWard,
      hospitalLatitude,
      hospitalLongitude,
      contactPhone,
      notes,
      prescriptionImageUrl
    } = req.body;

    // Validate with mandatory fields
    const validation = validateBloodRequest({
      bloodGroup,
      urgency,
      hospitalName,
      hospitalBedNumber
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: validation.errors
        }
      });
    }

    // Get user's country code
    const userResult = await query('SELECT country_code FROM users WHERE id = $1', [req.user.id]);
    const countryCode = userResult.rows[0]?.country_code || 'IN';

    // Create blood request with mandatory fields
    const result = await query(
      `INSERT INTO blood_requests 
       (user_id, blood_group, urgency, patient_name, hospital_name, hospital_address,
        hospital_bed_number, hospital_ward, hospital_latitude, hospital_longitude, 
        contact_phone, contact_phone_masked, notes, prescription_image_url, 
        visible_radius_km, country_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [req.user.id, bloodGroup, urgency, patientName, hospitalName, hospitalAddress,
       hospitalBedNumber, hospitalWard, hospitalLatitude, hospitalLongitude, 
       contactPhone, true, notes, prescriptionImageUrl, 30, countryCode]
    );

    // Increment rate limit
    await incrementRateLimit(req.user.id, 'request');

    const request = result.rows[0];

    // Match donors and blood banks (simplified - would use geospatial queries in production)
    // This would typically trigger background jobs for notifications

    res.json({
      success: true,
      request: {
        ...request,
        matchedDonors: 0, // Would be calculated
        matchedBloodBanks: 0 // Would be calculated
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get active blood requests
 * GET /api/v1/blood-requests
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 50, bloodGroup, urgency } = req.query;

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
      SELECT id, blood_group, urgency, hospital_name, hospital_address,
             hospital_bed_number, hospital_latitude, hospital_longitude, 
             status, created_at,
             ST_Distance(
               ST_MakePoint(hospital_longitude, hospital_latitude)::geography,
               ST_MakePoint($1, $2)::geography
             ) / 1000 as distance_km
      FROM blood_requests
      WHERE status = 'active' AND status != 'hidden'
    `;

    const params = [parseFloat(longitude), parseFloat(latitude)];
    let paramCount = 3;

    if (bloodGroup) {
      queryText += ` AND blood_group = $${paramCount++}`;
      params.push(bloodGroup);
    }

    if (urgency) {
      queryText += ` AND urgency = $${paramCount++}`;
      params.push(urgency);
    }

    // Only show requests within visible_radius_km (default 30km)
    queryText += `
      AND ST_DWithin(
        ST_MakePoint(hospital_longitude, hospital_latitude)::geography,
        ST_MakePoint($1, $2)::geography,
        LEAST(visible_radius_km, $${paramCount++}) * 1000
      )
      ORDER BY distance_km ASC, created_at DESC
      LIMIT 50
    `;

    params.push(parseFloat(radius));

    const result = await query(queryText, params);

    res.json({
      success: true,
      requests: result.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get blood request details
 * GET /api/v1/blood-requests/:id
 */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT br.*, 
              ST_Distance(
                ST_MakePoint(br.hospital_longitude, br.hospital_latitude)::geography,
                ST_MakePoint($1, $2)::geography
              ) / 1000 as distance_km
       FROM blood_requests br
       WHERE br.id = $3`,
      [req.query.longitude || 0, req.query.latitude || 0, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Blood request not found'
        }
      });
    }

    const request = result.rows[0];
    
    // Mask contact phone if present
    if (request.contact_phone && request.contact_phone_masked) {
      request.contact_phone = maskPhoneNumber(request.contact_phone);
    }

    res.json({
      success: true,
      request
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Report fake/abuse
 * POST /api/v1/blood-requests/:id/report
 */
router.post('/:id/report', authenticateToken, async (req, res, next) => {
  try {
    const { reason, details } = req.body;
    const requestId = req.params.id;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Report reason is required'
        }
      });
    }

    const validReasons = ['fake_request', 'abuse', 'spam', 'harassment', 'wrong_info'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Reason must be one of: ${validReasons.join(', ')}`
        }
      });
    }

    // Check if already reported by this user
    const existingReport = await query(
      `SELECT id FROM reports 
       WHERE reporter_id = $1 AND target_type = 'blood_request' AND target_id = $2 
       AND status != 'dismissed'`,
      [req.user.id, requestId]
    );

    if (existingReport.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_REPORTED',
          message: 'You have already reported this request'
        }
      });
    }

    // Create report
    await query(
      `INSERT INTO reports (reporter_id, report_type, target_type, target_id, reason, details)
       VALUES ($1, $2, 'blood_request', $3, $4, $5)`,
      [req.user.id, reason, requestId, reason, details]
    );

    // Increment report count on request
    await query(
      `UPDATE blood_requests 
       SET report_count = report_count + 1 
       WHERE id = $1`,
      [requestId]
    );

    // Check and auto-hide if 3+ reports
    const { checkAndAutoHideRequest } = require('../utils/safety');
    const wasHidden = await checkAndAutoHideRequest(requestId);

    res.json({
      success: true,
      message: 'Report submitted successfully',
      autoHidden: wasHidden
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

