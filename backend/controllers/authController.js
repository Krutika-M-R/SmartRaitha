const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const jwtSecret = require('../config/jwtSecret');
const { sendVerificationCode, sendPasswordResetCode, sendWelcomeEmail, sendPasswordChangedEmail } = require('../services/emailService');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isDatabaseUnavailable(error) {
  return error?.code === 'P1001' || error?.cause?.code === 'P1001';
}

function sendDatabaseUnavailable(res) {
  return res.status(503).json({
    error: 'The database is unreachable. Check your Wi-Fi DNS and DATABASE_URL, then try again.',
  });
}

// POST /api/auth/signup
async function signup(req, res) {
  try {
    const { name: rawName, email: rawEmail, password } = req.body;
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationCode = String(crypto.randomInt(100000, 1000000));
    const verificationToken = crypto.createHash('sha256').update(verificationCode).digest('hex');
    const verificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    try {
      await sendVerificationCode({ email, name, code: verificationCode });
    } catch (err) {
      if (err.code === 'EAUTH' || err.responseCode === 535) {
        return res.status(503).json({
          error: 'Gmail rejected the SMTP login. Use the sender account\'s 16-character Google App Password in SMTP_PASS, not its regular password.',
        });
      }
      console.error(err);
      return res.status(503).json({ error: 'We could not send the verification code. Check the SMTP settings and try again.' });
    }

    await prisma.user.create({
      data: { name, email, passwordHash, emailVerified: false, verificationToken, verificationExpiresAt }
    });

    res.status(201).json({ message: 'Verification code sent. Enter it to finish creating your account.' });
  } catch (err) {
    console.error(err);
    if (isDatabaseUnavailable(err)) return sendDatabaseUnavailable(res);
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
}

// POST /api/auth/verify-code { email, code }
async function verifyCode(req, res) {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
    if (!email || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'A valid email and 6-digit verification code are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerified || !user.verificationExpiresAt || user.verificationExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    if (user.verificationToken !== codeHash) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verificationToken: null, verificationExpiresAt: null },
    });
    try {
      await sendWelcomeEmail({ email: verifiedUser.email, name: verifiedUser.name });
    } catch (err) {
      console.error('Signup welcome email could not be sent:', err.message);
    }
    const token = jwt.sign({ userId: verifiedUser.id }, jwtSecret, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: verifiedUser.id,
        name: verifiedUser.name,
        email: verifiedUser.email,
        gender: verifiedUser.gender,
        age: verifiedUser.age,
        place: verifiedUser.place,
      },
    });
  } catch (err) {
    console.error(err);
    if (isDatabaseUnavailable(err)) return sendDatabaseUnavailable(res);
    res.status(500).json({ error: 'Could not verify the signup code.' });
  }
}

// POST /api/auth/password-reset/request { email }
async function requestPasswordReset(req, res) {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.emailVerified) {
      return res.json({ message: 'If a verified account exists for that email, a reset code has been sent.' });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const verificationToken = crypto.createHash('sha256').update(code).digest('hex');
    const verificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.user.update({ where: { id: user.id }, data: { verificationToken, verificationExpiresAt } });

    try {
      await sendPasswordResetCode({ email, name: user.name, code });
    } catch (err) {
      await prisma.user.update({ where: { id: user.id }, data: { verificationToken: null, verificationExpiresAt: null } });
      if (err.code === 'EAUTH' || err.responseCode === 535) {
        return res.status(503).json({ error: 'Email delivery is unavailable. Check the SMTP account settings and try again.' });
      }
      console.error(err);
      return res.status(503).json({ error: 'Could not send the password reset code. Check the mail settings and try again.' });
    }

    res.json({ message: 'If a verified account exists for that email, a reset code has been sent.' });
  } catch (err) {
    console.error(err);
    if (isDatabaseUnavailable(err)) return sendDatabaseUnavailable(res);
    res.status(500).json({ error: 'Could not request a password reset.' });
  }
}

// POST /api/auth/password-reset/confirm { email, code, password }
async function confirmPasswordReset(req, res) {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Enter a valid email and the 6-digit reset code.' });
    }
    if (password.length < 8 || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and include a number and special character.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    if (!user || !user.emailVerified || user.verificationToken !== codeHash || !user.verificationExpiresAt || user.verificationExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset code. Request a new code and try again.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, verificationToken: null, verificationExpiresAt: null },
    });

    let confirmationEmailSent = true;
    try {
      await sendPasswordChangedEmail({ email: updatedUser.email, name: updatedUser.name });
    } catch (err) {
      confirmationEmailSent = false;
      console.error('Password changed, but confirmation email could not be sent:', err.message);
    }

    res.json({
      message: confirmationEmailSent
        ? 'Password changed successfully. A confirmation email has been sent.'
        : 'Password changed successfully, but the confirmation email could not be sent.',
    });
  } catch (err) {
    console.error(err);
    if (isDatabaseUnavailable(err)) return sendDatabaseUnavailable(res);
    res.status(500).json({ error: 'Could not reset the password.' });
  }
}

// POST /api/auth/google { idToken }
async function googleLogin(req, res) {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Google ID token is required.' });
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Google sign-in is not configured on the server.' });
    }

    const response = await require('../services/googleAuthService').getGoogleUser(idToken);
    const googleUser = response.data;
    if (googleUser.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({ error: 'Google client configuration is invalid.' });
    }
    if (googleUser.email_verified !== 'true' || !googleUser.email) {
      return res.status(401).json({ error: 'Google email is not verified.' });
    }

    let user = await prisma.user.findUnique({ where: { email: googleUser.email.toLowerCase() } });
    if (!user) {
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      user = await prisma.user.create({
        data: { name: googleUser.name || googleUser.email.split('@')[0], email: googleUser.email.toLowerCase(), passwordHash, emailVerified: true },
      });
    } else if (!user.emailVerified) {
      user = await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    }

    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, gender: user.gender, age: user.age, place: user.place } });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(502).json({ error: 'Google sign-in failed. Please try again.' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Verify the code sent during signup before logging in.' });
    }

    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    if (isDatabaseUnavailable(err)) return sendDatabaseUnavailable(res);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}

// GET /api/auth/me  (requires auth middleware)
async function me(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, gender: true, age: true, place: true, createdAt: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch user.' });
  }
}

// PUT /api/auth/profile (requires auth)
async function updateProfile(req, res) {
  try {
    const { gender, age, place } = req.body;
    const normalizedGender = typeof gender === 'string' ? gender.trim() : null;
    const normalizedPlace = typeof place === 'string' ? place.trim() : null;
    const parsedAge = age === '' || age == null ? null : Number(age);

    if (parsedAge !== null && (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120)) {
      return res.status(400).json({ error: 'Age must be a whole number between 1 and 120.' });
    }
    if (normalizedGender && normalizedGender.length > 40) {
      return res.status(400).json({ error: 'Gender is too long.' });
    }
    if (normalizedPlace && normalizedPlace.length > 120) {
      return res.status(400).json({ error: 'Place is too long.' });
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { gender: normalizedGender || null, age: parsedAge, place: normalizedPlace || null },
      select: { id: true, name: true, email: true, gender: true, age: true, place: true, createdAt: true },
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update profile.' });
  }
}

module.exports = { signup, verifyCode, requestPasswordReset, confirmPasswordReset, login, googleLogin, me, updateProfile };
