const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendWelcomeEmail, sendDonationReceiptEmail } = require('./mailer');

const VAPID_KEY = process.env.VAPID_KEY || 'BBwDEVstNGP3C1QqSjKF1vw-mPWp5sI7fSsx9vwx-SvuJHZDhTS-a7pnWVlkqral_y6c6x2fZb4BK30gFKWi_YA';

let initializeApp = null;
let cert = null;
let getApps = null;
let getMessaging = null;

try {
  const firebaseAppModule = require('firebase-admin/app');
  const firebaseMessagingModule = require('firebase-admin/messaging');
  initializeApp = firebaseAppModule.initializeApp;
  cert = firebaseAppModule.cert;
  getApps = firebaseAppModule.getApps;
  getMessaging = firebaseMessagingModule.getMessaging;
} catch (e) {
  console.log('[FIREBASE ADMIN NOTICE] firebase-admin submodules not loaded:', e.message);
}

// Initialize Firebase Admin SDK
try {
  let serviceAccount = null;
  const path = require('path');
  const fs = require('fs');
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../firebase-service-account.json');
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try { serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON); } catch (e) {}
  }
  if (!serviceAccount && fs.existsSync(serviceAccountPath)) {
    try { serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')); } catch (e) {}
  }

  if (serviceAccount && initializeApp && cert && getApps && getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('[FIREBASE ADMIN SDK] Successfully initialized for project:', serviceAccount.project_id);
  } else if (!serviceAccount) {
    console.warn('[FIREBASE ADMIN WARNING] No Firebase service account JSON found! Place firebase-service-account.json in project root or set FIREBASE_SERVICE_ACCOUNT_JSON env variable on server.');
  }
} catch (err) {
  console.error('[FIREBASE ADMIN INIT ERROR]', err.message);
}

const sendFcmPushNotification = async (targetToken, pushPayload) => {
  if (!targetToken) return null;

  console.log(`[FCM PUSH DISPATCHED] Token: ${targetToken.slice(0, 20)}... | Payload:`, JSON.stringify(pushPayload));

  if (getApps && getMessaging && getApps().length > 0) {
    try {
      const messaging = getMessaging();
      const message = {
        token: targetToken,
        notification: {
          title: pushPayload.notification.title,
          body: pushPayload.notification.body
        },
        data: {
          type: String(pushPayload.data?.type || 'general'),
          id: String(pushPayload.data?.id || ''),
          screen: String(pushPayload.data?.screen || 'home'),
          title: String(pushPayload.notification.title || ''),
          body: String(pushPayload.notification.body || ''),
          message: String(pushPayload.notification.body || ''),
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        android: {
          priority: 'high',
          notification: {
            title: pushPayload.notification.title,
            body: pushPayload.notification.body,
            sound: 'default',
            channelId: 'high_importance_channel',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            defaultSound: true,
            defaultVibrateTimings: true
          }
        },
        apns: {
          headers: {
            'apns-priority': '10'
          },
          payload: {
            aps: {
              alert: {
                title: pushPayload.notification.title,
                body: pushPayload.notification.body
              },
              sound: 'default',
              badge: 1,
              'content-available': 1
            }
          }
        }
      };

      const response = await messaging.send(message);
      console.log('[FCM FIREBASE ADMIN PUSH SUCCESS]', response);
      return { success: true, messageId: response };
    } catch (fcmErr) {
      console.error('[FCM FIREBASE ADMIN PUSH ERROR]', fcmErr.message);
      return { success: false, error: fcmErr.message };
    }
  }

  const fcmServerKey = process.env.FCM_SERVER_KEY || process.env.FIREBASE_SERVER_KEY;
  if (!fcmServerKey) {
    console.log('[FCM PUSH NOTICE] FCM_SERVER_KEY missing in .env and Firebase Admin SDK not initialized.');
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

    console.log(`[CREATE & SEND NOTIFICATION] userId: ${userId || 'N/A'} | title: "${title}" | targetToken: ${targetToken ? targetToken.slice(0, 25) + '...' : 'NONE'}`);

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
      console.log(`[NOTIFICATION DB SAVED] Notification ID: ${notification._id}`);
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

    // 3. Dispatch to FCM Google Push Gateway if user enabled push notifications
    let fcmResult = null;
    if (user && user.pushNotification === false) {
      console.log(`[FCM PUSH SKIPPED] User ${userId} has pushNotification turned OFF (pushNotification: false)`);
    } else if (targetToken) {
      console.log(`[FCM DISPATCHING PUSH] Sending to token: ${targetToken.slice(0, 25)}...`);
      fcmResult = await sendFcmPushNotification(targetToken, pushPayload);
      console.log(`[FCM DISPATCH RESULT] Result:`, JSON.stringify(fcmResult));
    } else {
      console.log(`[FCM DISPATCH SKIPPED] No fcmToken/deviceToken found for user ${userId}`);
    }

    // 4. Email trigger hooks for system events if user enabled email notifications
    if (user && user.emailNotification !== false) {
      if (type === 'registration' || type === 'welcome') {
        if (user.email) sendWelcomeEmail(user.email, user.name);
      } else if (type === 'donation') {
        if (user.email) sendDonationReceiptEmail(user.email, user.name, dataId || '0', 'General Support', 'TXN-DISPATCH');
      }
    } else if (user) {
      console.log(`[EMAIL SKIPPED] User ${userId} has emailNotification turned OFF (emailNotification: false)`);
    }

    return { notification, fcmResult };
  } catch (err) {
    console.error('[NOTIFICATION DISPATCH EXCEPTION]', err);
    return null;
  }
};

module.exports = {
  createAndSendNotification,
  sendFcmPushNotification,
  VAPID_KEY
};
