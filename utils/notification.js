const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendWelcomeEmail, sendDonationReceiptEmail } = require('./mailer');

const VAPID_KEY = process.env.VAPID_KEY || 'BBwDEVstNGP3C1QqSjKF1vw-mPWp5sI7fSsx9vwx-SvuJHZDhTS-a7pnWVlkqral_y6c6x2fZb4BK30gFKWi_YA';

const sendFcmPushNotification = async (targetToken, pushPayload) => {
  if (!targetToken) return null;

  const fcmServerKey = process.env.FCM_SERVER_KEY || process.env.FIREBASE_SERVER_KEY;
  console.log(`[FCM PUSH DISPATCHED] Token: ${targetToken.slice(0, 20)}... | Payload:`, JSON.stringify(pushPayload));

  if (!fcmServerKey) {
    console.log('[FCM PUSH NOTICE] FCM_SERVER_KEY is not set in environment variables. Add FCM_SERVER_KEY in .env to deliver to physical devices.');
    return { status: 'logged_only', note: 'FCM_SERVER_KEY missing in .env' };
  }

  try {
    const https = require('https');
    const payloadData = JSON.stringify({
      to: targetToken,
      notification: pushPayload.notification,
      data: pushPayload.data,
      priority: 'high'
    });

    return new Promise((resolve) => {
      const req = https.request({
        hostname: 'fcm.googleapis.com',
        path: '/fcm/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${fcmServerKey}`,
          'Content-Length': Buffer.byteLength(payloadData)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            console.log('[FCM GOOGLE API RESPONSE]', json);
            resolve(json);
          } catch (e) {
            resolve({ raw: data });
          }
        });
      });
      req.on('error', (err) => {
        console.error('[FCM GOOGLE API ERROR]', err.message);
        resolve({ error: err.message });
      });
      req.write(payloadData);
      req.end();
    });
  } catch (err) {
    console.error('[FCM DISPATCH EXCEPTION]', err.message);
    return { error: err.message };
  }
};

/**
 * Dispatch structured notification to DB, FCM Push, and Email
 */
const createAndSendNotification = async ({
  userId,
  title,
  body,
  message,
  type = 'general',
  dataId = '',
  screen = 'home',
  imageUrl = null,
  fcmToken = null
}) => {
  const finalBody = body || message || title;
  
  try {
    let user = null;
    if (userId) user = await User.findById(userId);

    const targetToken = fcmToken || user?.fcmToken || user?.deviceToken;

    // 1. Save in MongoDB Notification collection if user exists
    let notification = null;
    if (userId) {
      notification = new Notification({
        user: userId,
        title,
        body: finalBody,
        message: finalBody,
        type,
        dataId: String(dataId),
        screen,
        imageUrl
      });
      await notification.save();
    }

    // 2. Build structured push payload
    const pushPayload = {
      notification: {
        title: title,
        body: finalBody
      },
      data: {
        type: type,
        id: String(dataId),
        screen: screen
      }
    };

    // 3. Dispatch to FCM Google Push Gateway
    let fcmResult = null;
    if (targetToken) {
      fcmResult = await sendFcmPushNotification(targetToken, pushPayload);
    }

    // 4. Email trigger hooks for system events
    if (user) {
      if (type === 'registration' || type === 'welcome') {
        if (user.email) sendWelcomeEmail(user.email, user.name);
      } else if (type === 'donation') {
        if (user.email) sendDonationReceiptEmail(user.email, user.name, dataId || '0', 'General Support', 'TXN-DISPATCH');
      }
    }

    return { notification, fcmResult };
  } catch (err) {
    console.error('Notification dispatch error:', err);
    return null;
  }
};

module.exports = {
  createAndSendNotification,
  sendFcmPushNotification,
  VAPID_KEY
};
