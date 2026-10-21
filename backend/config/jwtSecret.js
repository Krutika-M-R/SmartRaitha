const crypto = require('crypto');
const configuredSecret = process.env.JWT_SECRET;
const hasConfiguredSecret = configuredSecret && !/^(replace|change|your)[_-]/i.test(configuredSecret);

if (!hasConfiguredSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production.');
  }

  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('JWT_SECRET is missing or still a placeholder; using a temporary development key. Sessions expire when the backend restarts.');
}

module.exports = process.env.JWT_SECRET;