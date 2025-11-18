const { Queue, Worker } = require('bullmq');
const { getRedis } = require('./presence');
const { sendSMS } = require('../utils/sms');
const admin = require('firebase-admin');
const { query } = require('../database/connection');

let notificationQueue = null;

/**
 * Initialize notification queue
 */
function initializeNotificationQueue() {
  const redis = getRedis();
  
  notificationQueue = new Queue('emergency-notifications', {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 1000
      },
      removeOnFail: {
        age: 86400 // Keep failed jobs for 24 hours
      }
    }
  });

  // Initialize Firebase Admin if configured
  if (process.env.FCM_SERVER_KEY && !admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FCM_PROJECT_ID,
          privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FCM_CLIENT_EMAIL
        })
      });
      console.log('✅ Firebase Admin initialized');
    } catch (error) {
      console.warn('⚠️  Firebase Admin not configured:', error.message);
    }
  }

  // Start worker
  const worker = new Worker('emergency-notifications', processNotificationJob, {
    connection: redis,
    concurrency: 10,
    limiter: {
      max: 100,
      duration: 60000 // Max 100 jobs per minute
    }
  });

  worker.on('completed', (job) => {
    console.log(`✅ Notification job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Notification job ${job.id} failed:`, err.message);
  });

  return notificationQueue;
}

/**
 * Process notification job
 */
async function processNotificationJob(job) {
  const { type, recipient, data } = job.data;

  try {
    switch (type) {
      case 'emergency_push':
        await sendPushNotification(recipient, data);
        break;
      
      case 'emergency_sms':
        await sendEmergencySMS(recipient, data);
        break;
      
      default:
        console.warn(`Unknown notification type: ${type}`);
    }

    return { success: true };
  } catch (error) {
    console.error(`Error processing notification job ${job.id}:`, error);
    throw error;
  }
}

/**
 * Enqueue emergency notifications
 */
async function enqueueEmergencyNotifications({ emergency, nearbyDonors, nearbyHospitals }) {
  if (!notificationQueue) {
    notificationQueue = initializeNotificationQueue();
  }

  const jobs = [];

  // Push notifications to nearby donors
  for (const donorId of nearbyDonors) {
    // Get user's FCM tokens
    const tokensResult = await query(
      `SELECT fcm_token FROM user_tokens 
       WHERE user_id = $1 AND token_type = 'fcm' AND is_active = true`,
      [donorId]
    );

    for (const row of tokensResult.rows) {
      jobs.push({
        name: 'emergency-push',
        data: {
          type: 'emergency_push',
          recipient: row.fcm_token,
          data: {
            emergencyId: emergency.id,
            bloodGroup: emergency.blood_group,
            urgency: emergency.urgency,
            hospitalName: emergency.hospital_name,
            hospitalBedNumber: emergency.hospital_bed_number,
            title: `Urgent ${emergency.blood_group} blood needed`,
            body: `${emergency.blood_group} blood needed at ${emergency.hospital_name}. Bed: ${emergency.hospital_bed_number}`,
            priority: emergency.urgency === 'critical' ? 'high' : 'normal'
          }
        }
      });
    }

    // SMS fallback for critical emergencies
    if (emergency.urgency === 'critical') {
      const userResult = await query(
        'SELECT phone, country_code FROM users WHERE id = $1',
        [donorId]
      );

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        jobs.push({
          name: 'emergency-sms',
          data: {
            type: 'emergency_sms',
            recipient: user.phone,
            data: {
              emergencyId: emergency.id,
              bloodGroup: emergency.blood_group,
              hospitalName: emergency.hospital_name,
              countryCode: user.country_code
            }
          },
          opts: {
            delay: 5000 // Delay SMS by 5 seconds to let push go first
          }
        });
      }
    }
  }

  // Add jobs to queue
  if (jobs.length > 0) {
    await notificationQueue.addBulk(jobs);
    console.log(`✅ Enqueued ${jobs.length} emergency notifications`);
  }

  return { queued: jobs.length };
}

/**
 * Send push notification via FCM
 */
async function sendPushNotification(token, data) {
  try {
    if (!admin.apps.length) {
      console.warn('Firebase Admin not initialized, skipping push notification');
      return;
    }

    const message = {
      token,
      notification: {
        title: data.title || 'Emergency Blood Request',
        body: data.body || `${data.bloodGroup} blood needed urgently`
      },
      data: {
        emergencyId: data.emergencyId,
        bloodGroup: data.bloodGroup,
        urgency: data.urgency,
        hospitalName: data.hospitalName,
        hospitalBedNumber: data.hospitalBedNumber || '',
        type: 'emergency'
      },
      android: {
        priority: data.priority === 'high' ? 'high' : 'normal',
        notification: {
          sound: 'default',
          channelId: 'emergency'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log(`✅ Push notification sent: ${response}`);
    return response;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

/**
 * Send emergency SMS
 */
async function sendEmergencySMS(phone, data) {
  try {
    const { bloodGroup, hospitalName, countryCode } = data;
    const message = `URGENT: ${bloodGroup} blood needed at ${hospitalName}. Reply YES if available. Pulse App`;

    await sendSMS(phone, message, countryCode);
    console.log(`✅ Emergency SMS sent to ${phone}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending emergency SMS:', error);
    throw error;
  }
}

/**
 * Get notification queue stats
 */
async function getNotificationQueueStats() {
  if (!notificationQueue) {
    return { waiting: 0, active: 0, completed: 0, failed: 0 };
  }

  const [waiting, active, completed, failed] = await Promise.all([
    notificationQueue.getWaitingCount(),
    notificationQueue.getActiveCount(),
    notificationQueue.getCompletedCount(),
    notificationQueue.getFailedCount()
  ]);

  return { waiting, active, completed, failed };
}

module.exports = {
  initializeNotificationQueue,
  enqueueEmergencyNotifications,
  sendPushNotification,
  sendEmergencySMS,
  getNotificationQueueStats
};

