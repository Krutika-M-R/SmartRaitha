const nodemailer = require('nodemailer');

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Email service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS.');
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function sendVerificationEmail({ email, name, token }) {
  const appUrl = process.env.APP_URL || 'http://localhost:5000';
  const verificationUrl = `${appUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Verify your SmartRaitha account',
    text: `Hi ${name},\n\nVerify your SmartRaitha account by opening this link:\n${verificationUrl}\n\nThis link expires in 24 hours.`,
    html: `<p>Hi ${name},</p><p>Verify your SmartRaitha account by clicking the link below:</p><p><a href="${verificationUrl}">Verify my email</a></p><p>This link expires in 24 hours.</p>`,
  });
}

async function sendVerificationCode({ email, name, code }) {
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Your SmartRaitha verification code',
    text: `Hi ${name},\n\nYour SmartRaitha verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Hi ${name},</p><p>Your SmartRaitha verification code is:</p><h2>${code}</h2><p>This code expires in 10 minutes.</p>`,
  });
}

module.exports = { sendVerificationEmail, sendVerificationCode };