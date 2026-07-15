const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

/** Signs a short-lived access token carrying identity + roles. */
function signAccess(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, roles: user.roles },
    config.auth.jwtSecret,
    { expiresIn: config.auth.accessTtl },
  );
}

function verifyAccess(token) {
  return jwt.verify(token, config.auth.jwtSecret);
}

/** Opaque random refresh token (stored hashed) + its expiry Date. */
function newRefreshToken() {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + ttlToMs(config.auth.refreshTtl));
  return { token, expiresAt };
}

function ttlToMs(ttl) {
  const m = String(ttl).match(/^(\d+)([smhd])$/);
  if (!m) return 7 * 24 * 3600 * 1000;
  const n = parseInt(m[1], 10);
  return n * { s: 1e3, m: 60e3, h: 3600e3, d: 86400e3 }[m[2]];
}

module.exports = { signAccess, verifyAccess, newRefreshToken };
