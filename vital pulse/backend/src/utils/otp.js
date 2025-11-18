const { query } = require('../database/connection');
const { sendSMS } = require('./sms');

/**
 * Generate a random OTP
 */
function generateOTP() {
  const length = parseInt(process.env.OTP_LENGTH) || 6;
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

/**
 * Send OTP via SMS
 */
async function sendOTP(phone, otp, countryCode) {
  const regionConfig = require('./regionLoader').getRegionConfig(countryCode);
  const smsConfig = regionConfig?.sms || { enabled: true, provider: 'twilio' };

  if (!smsConfig.enabled) {
    console.log(`SMS disabled for ${countryCode}, skipping OTP send`);
    return;
  }

  const message = smsConfig.templates?.otp 
    ? smsConfig.templates.otp.replace('{code}', otp)
    : `Your Pulse verification code is: ${otp}. Valid for 10 minutes.`;

  try {
    await sendSMS(phone, message, countryCode);
  } catch (error) {
    console.error('Failed to send OTP SMS:', error);
    throw error;
  }
}

/**
 * Verify OTP
 */
async function verifyOTP(phone, otp) {
  const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 3;

  const result = await query(
    `SELECT otp, attempts, expires_at, verified
     FROM otp_verifications
     WHERE phone = $1 AND verified = false
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone]
  );

  if (result.rows.length === 0) {
    return false;
  }

  const otpRecord = result.rows[0];

  // Check if expired
  if (new Date() > new Date(otpRecord.expires_at)) {
    return false;
  }

  // Check attempts
  if (otpRecord.attempts >= maxAttempts) {
    return false;
  }

  // Verify OTP
  if (otpRecord.otp !== otp) {
    // Increment attempts
    await query(
      'UPDATE otp_verifications SET attempts = attempts + 1 WHERE phone = $1',
      [phone]
    );
    return false;
  }

  return true;
}

/**
 * Clean up expired OTPs
 */
async function cleanupExpiredOTPs() {
  await query(
    'DELETE FROM otp_verifications WHERE expires_at < NOW() OR verified = true'
  );
}

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP,
  cleanupExpiredOTPs
};

