const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendWelcomeEmail, sendDonationReceiptEmail } = require('./mailer');

const VAPID_KEY = process.env.VAPID_KEY || 'BBwDEVstNGP3C1QqSjKF1vw-mPWp5sI7fSsx9vwx-SvuJHZDhTS-a7pnWVlkqral_y6c6x2fZb4BK30gFKWi_YA';

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
  imageUrl = null
}) => {
  if (!userId) return null;
  const finalBody = body || message || title;
  
  try {
    // 1. Save in MongoDB Notification collection
    const notification = new Notification({
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

    // 2. Fetch user to check FCM token & Email
    const user = await User.findById(userId);
    if (user) {
      // Structured Push Payload matching requirement:
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

      if (user.fcmToken) {
        console.log(`[FCM PUSH DISPATCHED] Token: ${user.fcmToken.slice(0, 15)}... | Payload:`, JSON.stringify(pushPayload));
      }

      // Email trigger hooks for system events
      if (type === 'registration' || type === 'welcome') {
        if (user.email) sendWelcomeEmail(user.email, user.name);
      } else if (type === 'donation') {
        if (user.email) sendDonationReceiptEmail(user.email, user.name, dataId || '0', 'General Support', 'TXN-DISPATCH');
      }
    }

    return notification;
  } catch (err) {
    console.error('Notification dispatch error:', err);
    return null;
  }
};

module.exports = {
  createAndSendNotification,
  VAPID_KEY
};
