const bcrypt = require('bcryptjs');
const qrcode = require('qrcode');
const { authenticator } = require('otplib');
const ApiError = require('../utils/api-error');
const jwtUtil = require('../utils/jwt');
const userRepo = require('../repositories/user.repository');
const tokenRepo = require('../repositories/token.repository');

const REFRESH_COOKIE = 'ncism_rt';
const MFA_ISSUER = 'NCISM Portal';

class AuthService {
  /**
   * Verifies credentials. If the user has MFA enabled, returns a step-up
   * challenge instead of tokens — the caller must complete `completeMfaLogin`.
   */
  async login(email, password) {
    const user = await userRepo.findByEmail(email);
    // Constant-ish work whether or not the user exists (avoid enumeration).
    const hash = user ? user.password_hash : '$2a$12$0000000000000000000000000000000000000000000000000000';
    const ok = await bcrypt.compare(password || '', hash);
    if (!user || !ok) throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
    if (user.status !== 'active') throw ApiError.forbidden('ACCOUNT_DISABLED', 'Account is disabled');

    if (user.mfa_enabled) {
      return { mfaRequired: true, challenge: jwtUtil.signMfaChallenge(user.id) };
    }

    const access = await this.issueTokens(user.id);
    await userRepo.touchLastLogin(user.id);
    return access;
  }

  /** Second factor: verify the step-up challenge + TOTP code, then issue tokens. */
  async completeMfaLogin(challenge, token) {
    let payload;
    try { payload = jwtUtil.verifyMfaChallenge(challenge); }
    catch { throw ApiError.unauthorized('MFA_CHALLENGE_INVALID', 'MFA challenge is invalid or expired'); }

    const user = await userRepo.findById(payload.sub);
    if (!user || !user.mfa_enabled || !user.mfa_secret) {
      throw ApiError.unauthorized('MFA_NOT_ENABLED', 'MFA is not enabled for this account');
    }
    if (!authenticator.check(String(token || ''), user.mfa_secret)) {
      throw ApiError.unauthorized('MFA_CODE_INVALID', 'Incorrect authentication code');
    }

    const access = await this.issueTokens(user.id);
    await userRepo.touchLastLogin(user.id);
    return access;
  }

  /**
   * Starts MFA enrollment: generates a fresh secret (stored, not yet enabled)
   * and returns it plus a QR data URL for an authenticator app. Verifying a
   * code from that app (`verifyMfa`) is what actually enables MFA.
   */
  async enrollMfa(userId) {
    const user = await userRepo.findById(userId);
    if (!user) throw ApiError.unauthorized('USER_NOT_FOUND', 'User no longer exists');
    if (user.mfa_enabled) throw ApiError.conflict('MFA_ALREADY_ENABLED', 'MFA is already enabled');

    const secret = authenticator.generateSecret();
    await userRepo.updateMfa(userId, { mfa_secret: secret, mfa_enabled: false });
    const otpauth = authenticator.keyuri(user.email, MFA_ISSUER, secret);
    const qr = await qrcode.toDataURL(otpauth);
    return { secret, qr, otpauth };
  }

  /** Confirms enrollment by checking a code against the stored secret. */
  async verifyMfa(userId, token) {
    const user = await userRepo.findById(userId);
    if (!user || !user.mfa_secret) throw ApiError.badRequest('MFA_NOT_ENROLLED', 'Start MFA enrollment first');
    if (!authenticator.check(String(token || ''), user.mfa_secret)) {
      throw ApiError.badRequest('MFA_CODE_INVALID', 'Incorrect authentication code');
    }
    await userRepo.updateMfa(userId, { mfa_enabled: true });
    return { enabled: true };
  }

  /** Turns MFA off (self-service) — clears the secret and the flag. */
  async disableMfa(userId) {
    await userRepo.updateMfa(userId, { mfa_secret: null, mfa_enabled: false });
    return { enabled: false };
  }

  /** Rotates a refresh token: revoke old, issue new pair. */
  async refresh(refreshToken) {
    if (!refreshToken) throw ApiError.unauthorized('NO_REFRESH_TOKEN', 'Missing refresh token');
    const row = await tokenRepo.findActive(refreshToken);
    if (!row) throw ApiError.unauthorized('INVALID_REFRESH_TOKEN', 'Refresh token invalid or expired');
    await tokenRepo.revoke(refreshToken);
    return this.issueTokens(row.user_id);
  }

  async logout(refreshToken) {
    if (refreshToken) await tokenRepo.revoke(refreshToken);
  }

  async me(userId) {
    const profile = await userRepo.findWithAccess(userId);
    if (!profile) throw ApiError.unauthorized('USER_NOT_FOUND', 'User no longer exists');
    return profile;
  }

  async issueTokens(userId) {
    const profile = await userRepo.findWithAccess(userId);
    if (!profile) throw ApiError.unauthorized('USER_NOT_FOUND', 'User no longer exists');
    const accessToken = jwtUtil.signAccess(profile);
    const { token: refreshToken, expiresAt } = jwtUtil.newRefreshToken();
    await tokenRepo.save(userId, refreshToken, expiresAt);
    return { accessToken, refreshToken, refreshExpiresAt: expiresAt, user: profile };
  }
}

module.exports = new AuthService();
module.exports.REFRESH_COOKIE = REFRESH_COOKIE;
