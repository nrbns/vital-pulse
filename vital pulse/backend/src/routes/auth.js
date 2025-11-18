const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { query } = require('../database/connection');
const { generateOTP, sendOTP, verifyOTP } = require('../utils/otp');
const { generateTokens } = require('../utils/jwt');

/**
 * Request OTP
 * POST /api/v1/auth/otp/request
 */
router.post('/otp/request', async (req, res, next) => {
  try {
    const { phone, countryCode } = req.body;

    if (!phone || !countryCode) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Phone number and country code are required'
        }
      });
    }

    // Validate phone format (basic)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid phone number format'
        }
      });
    }

    // Generate and store OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + parseInt(process.env.OTP_EXPIRES_IN || 600) * 1000);

    // Delete old OTPs for this phone
    await query(
      'DELETE FROM otp_verifications WHERE phone = $1',
      [phone]
    );

    // Insert new OTP
    await query(
      `INSERT INTO otp_verifications (phone, otp, expires_at)
       VALUES ($1, $2, $3)`,
      [phone, otp, expiresAt]
    );

    // Send OTP via SMS
    try {
      await sendOTP(phone, otp, countryCode);
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      // Still return success in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`OTP for ${phone}: ${otp}`);
      }
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      ...(process.env.NODE_ENV === 'development' && { otp }) // Include OTP in dev mode
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Verify OTP and login/register
 * POST /api/v1/auth/otp/verify
 */
router.post('/otp/verify', async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Phone number and OTP are required'
        }
      });
    }

    // Verify OTP
    const isValid = await verifyOTP(phone, otp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OTP',
          message: 'Invalid or expired OTP'
        }
      });
    }

    // Find or create user
    let userResult = await query(
      'SELECT id, phone, country_code, roles FROM users WHERE phone = $1',
      [phone]
    );

    let userId;
    let isNewUser = false;

    if (userResult.rows.length === 0) {
      // Create new user
      const countryCode = phone.startsWith('+91') ? 'IN' : 'IN'; // Default, should be extracted from phone
      const result = await query(
        `INSERT INTO users (phone, country_code, roles)
         VALUES ($1, $2, $3)
         RETURNING id, phone, country_code, roles`,
        [phone, countryCode, ['user']]
      );
      userId = result.rows[0].id;
      isNewUser = true;
    } else {
      userId = userResult.rows[0].id;
    }

    // Generate tokens
    const tokens = generateTokens(userId);

    // Mark OTP as verified
    await query(
      'UPDATE otp_verifications SET verified = true WHERE phone = $1',
      [phone]
    );

    res.json({
      success: true,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: userId,
        phone,
        isNewUser
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Refresh token
 * POST /api/v1/auth/refresh
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required'
        }
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const tokens = generateTokens(decoded.userId);

      res.json({
        success: true,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token'
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;

