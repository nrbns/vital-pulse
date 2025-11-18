const { query } = require('../database/connection');

/**
 * Check if user has exceeded rate limits
 */
async function checkRateLimit(userId, type = 'request', maxCount = 3, windowHours = 24) {
  const rateLimitField = `${type}_rate_limit_count`;
  const resetField = `${type}_rate_limit_reset_at`;

  const result = await query(
    `SELECT ${rateLimitField}, ${resetField} FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return { allowed: false, reason: 'User not found' };
  }

  const user = result.rows[0];
  const resetAt = new Date(user[resetField]);
  const now = new Date();

  // Reset if window has passed
  if (now > resetAt) {
    await query(
      `UPDATE users 
       SET ${rateLimitField} = 0, 
           ${resetField} = CURRENT_TIMESTAMP + INTERVAL '${windowHours} hours'
       WHERE id = $1`,
      [userId]
    );
    return { allowed: true, remaining: maxCount };
  }

  const count = user[rateLimitField] || 0;
  if (count >= maxCount) {
    const hoursUntilReset = Math.ceil((resetAt - now) / (1000 * 60 * 60));
    return {
      allowed: false,
      reason: `Rate limit exceeded. Try again in ${hoursUntilReset} hour(s)`,
      resetAt
    };
  }

  return { allowed: true, remaining: maxCount - count };
}

/**
 * Increment rate limit counter
 */
async function incrementRateLimit(userId, type = 'request') {
  const rateLimitField = `${type}_rate_limit_count`;

  await query(
    `UPDATE users 
     SET ${rateLimitField} = ${rateLimitField} + 1 
     WHERE id = $1`,
    [userId]
  );
}

/**
 * Check and auto-hide request after 3 reports
 */
async function checkAndAutoHideRequest(requestId) {
  const result = await query(
    `SELECT report_count, status FROM blood_requests WHERE id = $1`,
    [requestId]
  );

  if (result.rows.length === 0 || result.rows[0].status === 'hidden') {
    return false;
  }

  const reportCount = result.rows[0].report_count || 0;

  if (reportCount >= 3) {
    // Auto-hide the request
    await query(
      `UPDATE blood_requests 
       SET status = 'hidden', 
           hidden_at = CURRENT_TIMESTAMP,
           hidden_reason = 'Auto-hidden after 3 reports'
       WHERE id = $1`,
      [requestId]
    );

    // Optionally temp-ban the user (24 hours)
    const requestResult = await query(
      'SELECT user_id FROM blood_requests WHERE id = $1',
      [requestId]
    );

    if (requestResult.rows.length > 0) {
      const userId = requestResult.rows[0].user_id;
      await query(
        `UPDATE users 
         SET is_banned = true, 
             ban_until = CURRENT_TIMESTAMP + INTERVAL '24 hours',
             ban_reason = 'Multiple reports on blood request'
         WHERE id = $1`,
        [userId]
      );
    }

    return true;
  }

  return false;
}

/**
 * Validate blood request - ensure mandatory fields
 */
function validateBloodRequest(data) {
  const errors = [];

  if (!data.hospital_name || data.hospital_name.trim().length === 0) {
    errors.push('Hospital name is mandatory. This helps verify the request is legitimate.');
  }

  if (!data.hospital_bed_number || data.hospital_bed_number.trim().length === 0) {
    errors.push('Hospital bed/ward number is mandatory. This helps verify the request is legitimate.');
  }

  if (!data.blood_group) {
    errors.push('Blood group is required');
  }

  if (!data.urgency) {
    errors.push('Urgency level is required');
  }

  // Validate urgency
  const validUrgencies = ['critical', 'high', 'medium', 'low'];
  if (data.urgency && !validUrgencies.includes(data.urgency)) {
    errors.push(`Urgency must be one of: ${validUrgencies.join(', ')}`);
  }

  // Validate blood group
  const validGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
  if (data.blood_group && !validGroups.includes(data.blood_group)) {
    errors.push(`Invalid blood group. Must be one of: ${validGroups.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if user is banned
 */
async function checkUserBan(userId) {
  const result = await query(
    `SELECT is_banned, ban_until, ban_reason FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return { banned: false };
  }

  const user = result.rows[0];

  if (!user.is_banned) {
    return { banned: false };
  }

  // Check if temporary ban has expired
  if (user.ban_until && new Date() > new Date(user.ban_until)) {
    await query(
      `UPDATE users SET is_banned = false, ban_until = NULL, ban_reason = NULL WHERE id = $1`,
      [userId]
    );
    return { banned: false };
  }

  return {
    banned: true,
    reason: user.ban_reason || 'Account temporarily banned',
    until: user.ban_until
  };
}

/**
 * Mask phone number for display
 */
function maskPhoneNumber(phone) {
  if (!phone || phone.length < 4) {
    return '****';
  }
  // Show last 4 digits: +91****1234
  const visible = phone.slice(-4);
  const masked = phone.slice(0, -4).replace(/\d/g, '*');
  return masked + visible;
}

module.exports = {
  checkRateLimit,
  incrementRateLimit,
  checkAndAutoHideRequest,
  validateBloodRequest,
  checkUserBan,
  maskPhoneNumber
};

