const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../database/connection');
const { getDonationRules } = require('../utils/regionLoader');

/**
 * Register as donor
 * POST /api/v1/donors/register
 */
router.post('/register', authenticateToken, async (req, res, next) => {
  try {
    const { bloodGroup, lastDonationDate, healthNotes, availability, latitude, longitude } = req.body;

    if (!bloodGroup) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Blood group is required'
        }
      });
    }

    // Validate blood group
    const validGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
    if (!validGroups.includes(bloodGroup)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid blood group'
        }
      });
    }

    // Get user's country code
    const userResult = await query('SELECT country_code FROM users WHERE id = $1', [req.user.id]);
    const countryCode = userResult.rows[0]?.country_code || 'IN';
    const rules = getDonationRules(countryCode);

    // Calculate next donation date
    const intervalDays = rules?.donationIntervalDays || 56;
    const lastDonation = lastDonationDate ? new Date(lastDonationDate) : null;
    const nextDonationDate = lastDonation 
      ? new Date(lastDonation.getTime() + intervalDays * 24 * 60 * 60 * 1000)
      : new Date();

    const isEligible = !lastDonation || nextDonationDate <= new Date();

    // Update user with blood group
    await query(
      `UPDATE users 
       SET blood_group = $1, last_donation_date = $2, health_notes = $3,
           latitude = COALESCE($4, latitude), longitude = COALESCE($5, longitude)
       WHERE id = $6`,
      [bloodGroup, lastDonationDate, healthNotes, latitude, longitude, req.user.id]
    );

    // Create or update donor record
    const result = await query(
      `INSERT INTO donors (user_id, blood_group, last_donation_date, health_notes, 
                          availability, latitude, longitude, is_eligible, next_donation_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id) DO UPDATE SET
         blood_group = EXCLUDED.blood_group,
         last_donation_date = EXCLUDED.last_donation_date,
         health_notes = EXCLUDED.health_notes,
         availability = EXCLUDED.availability,
         latitude = COALESCE(EXCLUDED.latitude, donors.latitude),
         longitude = COALESCE(EXCLUDED.longitude, donors.longitude),
         is_eligible = EXCLUDED.is_eligible,
         next_donation_date = EXCLUDED.next_donation_date,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.id, bloodGroup, lastDonationDate, healthNotes, availability, 
       latitude, longitude, isEligible, nextDonationDate]
    );

    // Update user roles to include donor
    await query(
      `UPDATE users 
       SET roles = array_append(roles, 'donor')
       WHERE id = $1 AND NOT 'donor' = ANY(roles)`,
      [req.user.id]
    );

    res.json({
      success: true,
      donor: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get donor profile
 * GET /api/v1/donors/me
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT d.*, u.name, u.phone
       FROM donors d
       JOIN users u ON d.user_id = u.id
       WHERE d.user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Donor profile not found'
        }
      });
    }

    res.json({
      success: true,
      donor: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get donation history
 * GET /api/v1/donors/me/history
 */
router.get('/me/history', authenticateToken, async (req, res, next) => {
  try {
    const donorResult = await query(
      'SELECT id FROM donors WHERE user_id = $1',
      [req.user.id]
    );

    if (donorResult.rows.length === 0) {
      return res.json({
        success: true,
        donations: []
      });
    }

    const donorId = donorResult.rows[0].id;
    const result = await query(
      `SELECT id, donation_date, location, blood_group, verified, notes, created_at
       FROM donation_history
       WHERE donor_id = $1
       ORDER BY donation_date DESC`,
      [donorId]
    );

    res.json({
      success: true,
      donations: result.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Check eligibility
 * GET /api/v1/donors/me/eligibility
 */
router.get('/me/eligibility', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT is_eligible, next_donation_date
       FROM donors
       WHERE user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Donor profile not found'
        }
      });
    }

    const donor = result.rows[0];
    const nextDonation = donor.next_donation_date ? new Date(donor.next_donation_date) : null;
    const now = new Date();
    const daysUntilEligible = nextDonation && nextDonation > now
      ? Math.ceil((nextDonation - now) / (1000 * 60 * 60 * 24))
      : 0;

    res.json({
      success: true,
      eligible: donor.is_eligible && daysUntilEligible === 0,
      nextDonationDate: donor.next_donation_date,
      daysUntilEligible,
      reasons: daysUntilEligible > 0 ? [`Wait ${daysUntilEligible} more days before next donation`] : []
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

