const twilio = require('twilio');
const { getRegionConfig } = require('./regionLoader');

let twilioClient = null;

/**
 * Initialize Twilio client
 */
function getTwilioClient() {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

/**
 * Send SMS via configured provider
 */
async function sendSMS(phone, message, countryCode) {
  const regionConfig = getRegionConfig(countryCode);
  const smsConfig = regionConfig?.sms || { 
    enabled: true, 
    provider: process.env.SMS_PROVIDER || 'twilio' 
  };

  if (!smsConfig.enabled) {
    throw new Error(`SMS disabled for country: ${countryCode}`);
  }

  const provider = smsConfig.provider || 'twilio';

  switch (provider) {
    case 'twilio':
      return await sendViaTwilio(phone, message);
    
    case 'msg91':
      return await sendViaMSG91(phone, message, smsConfig);
    
    default:
      console.warn(`Unknown SMS provider: ${provider}, using Twilio`);
      return await sendViaTwilio(phone, message);
  }
}

/**
 * Send SMS via Twilio
 */
async function sendViaTwilio(phone, message) {
  const client = getTwilioClient();
  
  if (!client) {
    // In development, just log
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SMS - Twilio] To: ${phone}, Message: ${message}`);
      return { success: true, sid: 'dev-mock-sid' };
    }
    throw new Error('Twilio not configured');
  }

  try {
    const result = await client.messages.create({
      body: message,
      to: phone,
      from: process.env.TWILIO_FROM_NUMBER || ''
    });
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('Twilio SMS error:', error);
    throw error;
  }
}

/**
 * Send SMS via MSG91 (India)
 */
async function sendViaMSG91(phone, message, smsConfig) {
  const axios = require('axios');
  const authKey = smsConfig.config?.authKey || process.env.MSG91_AUTH_KEY;
  const senderId = smsConfig.config?.senderId || 'PULSE';
  const route = smsConfig.config?.route || '4';

  if (!authKey) {
    throw new Error('MSG91 auth key not configured');
  }

  try {
    const url = 'https://api.msg91.com/api/v2/sendsms';
    const response = await axios.post(url, {
      sender: senderId,
      route: route,
      country: '91',
      sms: [{
        message: message,
        to: [phone.replace(/^\+91/, '')]
      }]
    }, {
      headers: {
        'authkey': authKey,
        'Content-Type': 'application/json'
      }
    });

    return { success: true, response: response.data };
  } catch (error) {
    console.error('MSG91 SMS error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  sendSMS,
  sendViaTwilio,
  sendViaMSG91
};

