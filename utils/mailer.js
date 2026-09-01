const nodemailer = require('nodemailer');

const SMTP_USER = process.env.SMTP_USER || 'd.tekchandani@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'xdxncylyetbwcjob';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = process.env.SMTP_PORT || 465;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

/**
 * Send email helper
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) return false;
  try {
    const info = await transporter.sendMail({
      from: `"Divine Platform" <${SMTP_USER}>`,
      to,
      subject: subject || 'Divine Platform Notification',
      text: text || '',
      html: html || `<p>${text || subject}</p>`
    });
    console.log(`[SMTP EMAIL SENT] To: ${to} | Subject: ${subject} | MessageId: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`[SMTP EMAIL ERROR] To: ${to} | Error: ${err.message}`);
    return false;
  }
};

/**
 * Prebuilt Email Templates
 */
const sendWelcomeEmail = async (toEmail, userName) => {
  const subject = 'Welcome to Divine Platform! 🙏';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #2563EB;">Welcome to Divine Platform, ${userName || 'Valued Partner'}!</h2>
      <p>Thank you for joining the Divine community. Together, we empower grassroots social welfare, transparent giving, and impactful campaigns.</p>
      <p>You can now explore ongoing campaigns, manage your wallet, and track your contribution impact in real time.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 0.85rem; color: #666;">If you have any questions, feel free to reply to this email or contact support.</p>
    </div>
  `;
  return sendEmail({ to: toEmail, subject, html });
};

const sendOtpEmail = async (toEmail, otpCode) => {
  const subject = 'Your Divine Platform Verification Code 🔑';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #2563EB;">Verification Code</h2>
      <p>Your OTP code to verify your Divine account is:</p>
      <div style="font-size: 28px; font-weight: bold; color: #1D4ED8; letter-spacing: 4px; padding: 12px; background: #EFF6FF; display: inline-block; border-radius: 6px; margin: 10px 0;">
        ${otpCode}
      </div>
      <p style="font-size: 0.9rem; color: #555;">This code will expire in 10 minutes. Please do not share this code with anyone.</p>
    </div>
  `;
  return sendEmail({ to: toEmail, subject, html });
};

const sendDonationReceiptEmail = async (toEmail, userName, amount, campaignTitle, transactionId) => {
  const subject = `Donation Confirmation - ₹${amount} Received! ❤️`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #16A34A;">Thank You for Your Donation, ${userName || 'Generous Donor'}!</h2>
      <p>Your contribution has been successfully processed.</p>
      <div style="background: #F0FDF4; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #DCFCE7;">
        <p style="margin: 4px 0;"><strong>Amount Donated:</strong> ₹${Number(amount).toLocaleString('en-IN')}</p>
        <p style="margin: 4px 0;"><strong>Campaign/Item:</strong> ${campaignTitle || 'General Welfare Support'}</p>
        <p style="margin: 4px 0;"><strong>Transaction ID:</strong> ${transactionId}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
      </div>
      <p style="font-size: 0.9rem; color: #555;">Your generosity brings light and relief to lives in need.</p>
    </div>
  `;
  return sendEmail({ to: toEmail, subject, html });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendOtpEmail,
  sendDonationReceiptEmail
};
