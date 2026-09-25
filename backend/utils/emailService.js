const nodemailer = require('nodemailer');

/**
 * Configure Nodemailer Transporter
 * Supports Gmail SMTP via EMAIL_USER and EMAIL_PASS
 */
const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (user && pass) {
    return nodemailer.createTransport({
      service: 'gmail',
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 465,
      secure: process.env.EMAIL_PORT === '587' ? false : true,
      auth: { user, pass }
    });
  }

  return null;
};

/**
 * Send Password Reset OTP Email
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.userName - Recipient full name
 * @param {string} options.otp - 6-digit OTP code
 * @param {string} options.role - User role (Student, Teacher, Admin)
 * @param {string} options.identifier - Roll Number or Teacher ID or Username
 */
const sendOtpEmail = async ({ to, userName, otp, role, identifier }) => {
  const transporter = createTransporter();

  const formattedRole = role ? role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ') : 'User';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LabEval RUET - Password Reset OTP</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 13px; opacity: 0.9; font-weight: 500; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .otp-container { background: #f8fafc; border: 2px dashed #0284c7; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .otp-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 8px; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0369a1; margin: 0; }
    .expiry { font-size: 12px; color: #ea580c; font-weight: 600; margin-top: 8px; }
    .details { background: #f1f5f9; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #334155; }
    .details p { margin: 4px 0; }
    .details span { font-weight: 600; }
    .footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
    .warning { font-size: 12px; color: #64748b; border-left: 3px solid #f59e0b; padding-left: 12px; margin-bottom: 20px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>LabEval RUET</h1>
      <p>Rajshahi University of Engineering & Technology</p>
    </div>
    <div class="content">
      <div class="greeting">Hello, ${userName || 'User'}!</div>
      <p class="text">
        You requested a password change for your LabEval account. Use the following One-Time Password (OTP) to verify your identity and set a new password.
      </p>

      <div class="otp-container">
        <div class="otp-label">Verification OTP Code</div>
        <div class="otp-code">${otp}</div>
        <div class="expiry">⏱ Valid for 10 minutes only</div>
      </div>

      <div class="details">
        <p><span>Account Role:</span> ${formattedRole}</p>
        <p><span>Account Identifier:</span> ${identifier || 'N/A'}</p>
        <p><span>Registered Email:</span> ${to}</p>
      </div>

      <div class="warning">
        <strong>Security Notice:</strong> If you did not make this request, please ignore this email. Your current password remains secure until this OTP is used. Never share this code with anyone.
      </div>
    </div>
    <div class="footer">
      Lab Performance & Evaluation Tracking System &bull; RUET<br>
      Automated System Message &bull; Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
  `;

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"LabEval RUET" <${process.env.EMAIL_USER}>`,
        to,
        subject: `[LabEval RUET] Password Reset OTP Code: ${otp}`,
        text: `Your LabEval RUET password change OTP is ${otp}. It is valid for 10 minutes.`,
        html: htmlContent
      });
      console.log(`✅ [Email Service] OTP successfully sent to ${to} (Message ID: ${info.messageId})`);
      return { success: true, mode: 'smtp', messageId: info.messageId };
    } catch (err) {
      console.warn(`⚠️ [Email Service] SMTP send failed: ${err.message}. Logging OTP for fallback.`);
      console.log(`\n======================================================`);
      console.log(`📧 [FALLBACK OTP] To: ${to}`);
      console.log(`🔑 [OTP CODE]: ${otp} (Valid for 10 minutes)`);
      console.log(`======================================================\n`);
      return { success: true, mode: 'fallback', error: err.message };
    }
  } else {
    // Development / demo environment without SMTP credentials
    console.log(`\n======================================================`);
    console.log(`📧 [LOCAL DEV EMAIL] No EMAIL_USER/EMAIL_PASS configured in .env`);
    console.log(`👤 Recipient: ${userName} (${to})`);
    console.log(`🔑 OTP CODE: ${otp}`);
    console.log(`⏱ Expires in: 10 minutes`);
    console.log(`======================================================\n`);
    return { success: true, mode: 'dev' };
  }
};

module.exports = {
  sendOtpEmail
};
