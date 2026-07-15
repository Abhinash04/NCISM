const bcrypt = require('bcryptjs');
const ApiError = require('../utils/api-error');
const jwtUtil = require('../utils/jwt');
const userRepo = require('../repositories/user.repository');
const tokenRepo = require('../repositories/token.repository');

const REFRESH_COOKIE = 'ncism_rt';

class AuthService {
  /** Verifies credentials, issues an access token + a stored refresh token. */
  async login(email, password) {
    const user = await userRepo.findByEmail(email);
    // Constant-ish work whether or not the user exists (avoid enumeration).
    const hash = user ? user.password_hash : '$2a$12$0000000000000000000000000000000000000000000000000000';
    const ok = await bcrypt.compare(password || '', hash);
    if (!user || !ok) throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
    if (user.status !== 'active') throw ApiError.forbidden('ACCOUNT_DISABLED', 'Account is disabled');

    const access = await this.issueTokens(user.id);
    await userRepo.touchLastLogin(user.id);
    return access;
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
