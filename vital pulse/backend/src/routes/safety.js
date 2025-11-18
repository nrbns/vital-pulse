const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../database/connection');
const { checkRateLimit, incrementRateLimit } = require('../utils/safety');

/**
 * Accept disclaimer (mandatory before using app)
 * POST /api/v1/safety/disclaimer/accept
 */
router.post('/disclaimer/accept', authenticateToken, async (req, res, next) => {
  try {
    await query(
      `UPDATE users 
       SET disclaimer_accepted = true, 
           disclaimer_accepted_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'Disclaimer accepted'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get disclaimer text
 * GET /api/v1/safety/disclaimer
 */
router.get('/disclaimer', async (req, res, next) => {
  try {
    const countryCode = req.query.countryCode || 'IN';
    
    // Get disclaimer text based on country
    const disclaimer = {
      title: 'IMPORTANT DISCLAIMER - PLEASE READ CAREFULLY',
      sections: [
        {
          heading: 'Community Platform, Not Medical Service',
          text: 'Pulse is a community platform that connects blood donors with people in need. We are NOT a medical service, hospital, or blood bank. We do NOT store, test, or transfuse blood. We only facilitate connections between registered users and verified medical facilities.'
        },
        {
          heading: 'No Guarantees',
          text: 'We CANNOT guarantee that: (1) Blood will be available, (2) Donors will respond, (3) Blood matches will be successful, (4) All information provided is accurate. Always verify blood availability directly with hospitals or blood banks before relying on any information from this platform.'
        },
        {
          heading: 'Your Responsibility',
          text: 'You are solely responsible for: (1) Verifying the legitimacy of any blood request, (2) Confirming blood availability with hospitals directly, (3) Ensuring proper medical procedures are followed, (4) Validating donor information before arranging donations. NEVER exchange money for blood donations on this platform.'
        },
        {
          heading: 'Mandatory Information',
          text: 'Every blood request MUST include: (1) Hospital name, (2) Bed/ward number for verification. Requests without this information will be rejected to prevent fake/hoax requests.'
        },
        {
          heading: 'Privacy & Safety',
          text: 'Your phone number is never shown directly to other users. All communication happens through masked numbers or in-app messaging. Report any abuse, fake requests, or harassment immediately using the report button.'
        },
        {
          heading: 'Auto-Moderation',
          text: 'Blood requests automatically hide after 3 reports. Users who create fake requests may be temporarily banned. Rate limits apply: maximum 3 blood requests per 24 hours per user, maximum 3 calls per day.'
        },
        {
          heading: 'No Liability',
          text: 'Pulse, its developers, and contributors are NOT liable for: (1) Any medical complications, (2) Failed donations, (3) Infections or health issues, (4) Incorrect hospital information, (5) Donors not showing up. This platform is provided "AS IS" with NO WARRANTIES of any kind.'
        },
        {
          heading: 'Open Source',
          text: 'This platform is open-source software licensed under Apache 2.0. Use at your own risk. By continuing, you acknowledge that you have read, understood, and agree to these terms.'
        }
      ],
      acceptance: {
        required: true,
        message: 'I understand and accept the risks. I will use this platform responsibly and verify all information with hospitals directly.'
      }
    };

    res.json({
      success: true,
      disclaimer
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get privacy settings
 * GET /api/v1/safety/privacy
 */
router.get('/privacy', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT privacy_settings FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    res.json({
      success: true,
      privacy: result.rows[0].privacy_settings || {
        showPhone: false,
        showName: true,
        availabilityMode: 'always',
        contactPreference: 'in_app_only'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update privacy settings
 * PUT /api/v1/safety/privacy
 */
router.put('/privacy', authenticateToken, async (req, res, next) => {
  try {
    const { showPhone, showName, availabilityMode, contactPreference } = req.body;

    const privacySettings = {
      showPhone: showPhone !== undefined ? showPhone : false,
      showName: showName !== undefined ? showName : true,
      availabilityMode: availabilityMode || 'always',
      contactPreference: contactPreference || 'in_app_only'
    };

    // Validate availability mode
    const validModes = ['always', 'weekends_only', 'emergency_only'];
    if (!validModes.includes(privacySettings.availabilityMode)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `availabilityMode must be one of: ${validModes.join(', ')}`
        }
      });
    }

    // Validate contact preference
    const validPrefs = ['in_app_only', 'hospitals_only', 'all'];
    if (!validPrefs.includes(privacySettings.contactPreference)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `contactPreference must be one of: ${validPrefs.join(', ')}`
        }
      });
    }

    await query(
      `UPDATE users 
       SET privacy_settings = $1::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [JSON.stringify(privacySettings), req.user.id]
    );

    res.json({
      success: true,
      privacy: privacySettings
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

