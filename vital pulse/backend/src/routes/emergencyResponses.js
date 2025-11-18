const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../database/connection');
const { requireRole } = require('../middleware/auth');
const { updateEmergencyStatus } = require('../services/emergencyRealtime');
const { emitToRoom } = require('../ws');

/**
 * Respond to emergency
 * POST /api/v1/blood-requests/:id/respond
 */
router.post('/:id/respond', authenticateToken, requireRole('donor'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { available, estimatedArrival, responseType = 'donor' } = req.body;

    if (available === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'available field is required (true/false)'
        }
      });
    }

    // Verify emergency exists
    const emergencyResult = await query(
      'SELECT id, user_id, blood_group, status FROM blood_requests WHERE id = $1',
      [id]
    );

    if (emergencyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Emergency not found'
        }
      });
    }

    const emergency = emergencyResult.rows[0];

    if (emergency.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Emergency is ${emergency.status}, cannot respond`
        }
      });
    }

    // Get donor ID
    const donorResult = await query(
      'SELECT id FROM donors WHERE user_id = $1',
      [req.user.id]
    );

    if (donorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Donor profile not found. Please register as donor first.'
        }
      });
    }

    const donorId = donorResult.rows[0].id;

    // Check if already responded
    const existingResponse = await query(
      `SELECT id, status FROM blood_request_responses 
       WHERE request_id = $1 AND donor_id = $2`,
      [id, donorId]
    );

    let response;

    if (existingResponse.rows.length > 0) {
      // Update existing response
      response = await query(
        `UPDATE blood_request_responses 
         SET available = $1, 
             estimated_arrival = $2,
             status = CASE 
               WHEN $1 = true THEN 'confirmed'
               ELSE 'cancelled'
             END,
             created_at = CURRENT_TIMESTAMP
         WHERE request_id = $3 AND donor_id = $4
         RETURNING *`,
        [available, estimatedArrival ? new Date(estimatedArrival) : null, id, donorId]
      );
    } else {
      // Create new response
      response = await query(
        `INSERT INTO blood_request_responses 
         (request_id, donor_id, response_type, available, estimated_arrival, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          id,
          donorId,
          responseType,
          available,
          estimatedArrival ? new Date(estimatedArrival) : null,
          available ? 'confirmed' : 'rejected'
        ]
      );
    }

    // Emit to emergency room via WebSocket
    emitToRoom(`emergency:${id}`, 'emergency:response', {
      emergencyId: id,
      donorId: donorId,
      userId: req.user.id,
      available,
      estimatedArrival,
      responseType,
      status: available ? 'confirmed' : 'rejected',
      timestamp: new Date().toISOString()
    });

    // Update emergency status if needed
    if (available) {
      const confirmedCount = await query(
        `SELECT COUNT(*) as count 
         FROM blood_request_responses 
         WHERE request_id = $1 AND status = 'confirmed'`,
        [id]
      );

      await updateEmergencyStatus(id, {
        matchedDonorsCount: parseInt(confirmedCount.rows[0].count)
      });
    }

    // Emit to requester's personal room
    emitToRoom(`user:${emergency.user_id}`, 'emergency:donor-responded', {
      emergencyId: id,
      donorId: donorId,
      available,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: available ? 'Response recorded. Thank you for helping!' : 'Response recorded.',
      response: response.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get emergency responses
 * GET /api/v1/blood-requests/:id/responses
 */
router.get('/:id/responses', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify user has access (requester or donor who responded)
    const emergencyResult = await query(
      'SELECT user_id FROM blood_requests WHERE id = $1',
      [id]
    );

    if (emergencyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Emergency not found'
        }
      });
    }

    const emergency = emergencyResult.rows[0];

    // Only requester can see all responses, others see limited info
    const isRequester = emergency.user_id === req.user.id;

    const responses = await query(
      `SELECT brr.*, 
              d.user_id,
              u.name,
              u.phone,
              CASE WHEN $1 = true THEN u.phone ELSE NULL END as contact_phone
       FROM blood_request_responses brr
       JOIN donors d ON brr.donor_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE brr.request_id = $2
       ORDER BY brr.created_at DESC`,
      [isRequester, id]
    );

    res.json({
      success: true,
      responses: responses.rows.map(r => ({
        ...r,
        phone: isRequester ? r.contact_phone : undefined // Mask for non-requester
      }))
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

