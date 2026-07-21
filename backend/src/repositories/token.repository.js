const crypto = require('crypto');
const { db } = require('../db');

/** Refresh tokens are stored only as a SHA-256 hash (never plaintext). */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function save(userId, token, expiresAt) {
  await db('refresh_tokens').insert({
    user_id: userId, token_hash: hashToken(token), expires_at: expiresAt,
  });
}

/** Returns the active (unrevoked, unexpired) token row or undefined. */
function findActive(token) {
  return db('refresh_tokens')
    .where({ token_hash: hashToken(token) })
    .andWhere('expires_at', '>', db.fn.now())
    .whereNull('revoked_at')
    .first();
}

async function revoke(token) {
  await db('refresh_tokens').where({ token_hash: hashToken(token) }).update({ revoked_at: db.fn.now() });
}

async function revokeAllForUser(userId) {
  await db('refresh_tokens').where({ user_id: userId }).whereNull('revoked_at').update({ revoked_at: db.fn.now() });
}

module.exports = { save, findActive, revoke, revokeAllForUser, hashToken };
