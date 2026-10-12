const nodemailer = require('nodemailer');

async function sendVerificationCode({ email, name, code }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Email service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS.');
  }

  const port = Number(SMTP_PORT);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS.replace(/\s/g, '') },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || SMTP_USER,
    to: email,
    subject: 'Your SmartRaitha signup code',
    text: `Hi ${name},\n\nYour SmartRaitha signup code is ${code}. It expires in 10 minutes.`,
    html: `<p>Hi ${name},</p><p>Your SmartRaitha signup code is:</p><h2>${code}</h2><p>This code expires in 10 minutes.</p>`,
  });
}

async function sendPasswordResetCode({ email, name, code }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Email service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS.');
  }

  const port = Number(SMTP_PORT);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS.replace(/\s/g, '') },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || SMTP_USER,
    to: email,
    subject: 'Your SmartRaitha password reset code',
    text: `Hi ${name},\n\nYour SmartRaitha password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<p>Hi ${name},</p><p>Your SmartRaitha password reset code is:</p><h2>${code}</h2><p>This code expires in 10 minutes. If you did not request this, ignore this email.</p>`,
  });
}

async function sendWelcomeEmail({ email, name }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Email service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS.');
  }

  const port = Number(SMTP_PORT);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS.replace(/\s/g, '') },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || SMTP_USER,
    to: email,
    subject: 'You successfully registered with SmartRaitha',
    text: `Hi ${name},\n\nYou successfully registered for the SmartRaitha app. Welcome!`,
    html: `<p>Hi ${name},</p><p>You successfully registered for the SmartRaitha app. Welcome!</p>`,
  });
}

async function sendPasswordChangedEmail({ email, name }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Email service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS.');
  }

  const port = Number(SMTP_PORT);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS.replace(/\s/g, '') },
  });

  const result = await transporter.sendMail({
    from: process.env.SMTP_FROM || SMTP_USER,
    to: email,
    subject: 'SmartRaitha password changed successfully',
    text: `Hi ${name},\n\nYour SmartRaitha app password was changed successfully. If you did not make this change, contact support immediately.`,
    html: `<p>Hi ${name},</p><p>Your SmartRaitha app password was changed successfully.</p><p>If you did not make this change, contact support immediately.</p>`,
  });

  const recipientAccepted = result.accepted.some((recipient) => String(recipient).toLowerCase() === email.toLowerCase());
  if (!recipientAccepted) {
    throw new Error('SMTP server did not accept the account email address.');
  }
}

module.exports = { sendVerificationCode, sendPasswordResetCode, sendWelcomeEmail, sendPasswordChangedEmail };