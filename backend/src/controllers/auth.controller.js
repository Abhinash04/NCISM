const authService = require('../services/auth.service');

const REFRESH_COOKIE = authService.REFRESH_COOKIE;

function refreshCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/v1/auth',
    expires: expiresAt,
  };
}

function setRefreshCookie(res, refreshToken, expiresAt) {
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(expiresAt));
}

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body || {};
      const result = await authService.login(email, password);
      // MFA-enabled accounts get a step-up challenge instead of tokens.
      if (result.mfaRequired) return res.json({ success: true, data: { mfaRequired: true, challenge: result.challenge } });
      const { accessToken, refreshToken, refreshExpiresAt, user } = result;
      setRefreshCookie(res, refreshToken, refreshExpiresAt);
      res.json({ success: true, data: { accessToken, user } });
    } catch (err) { next(err); }
  }

  /** Completes an MFA login step-up: { challenge, token } → tokens. */
  async mfaLogin(req, res, next) {
    try {
      const { challenge, token } = req.body || {};
      const { accessToken, refreshToken, refreshExpiresAt, user } = await authService.completeMfaLogin(challenge, token);
      setRefreshCookie(res, refreshToken, refreshExpiresAt);
      res.json({ success: true, data: { accessToken, user } });
    } catch (err) { next(err); }
  }

  /** Starts enrollment for the signed-in user → { secret, qr }. */
  async mfaEnroll(req, res, next) {
    try {
      res.json({ success: true, data: await authService.enrollMfa(req.user.id) });
    } catch (err) { next(err); }
  }

  /** Confirms enrollment with a code → enables MFA. */
  async mfaVerify(req, res, next) {
    try {
      res.json({ success: true, data: await authService.verifyMfa(req.user.id, req.body?.token) });
    } catch (err) { next(err); }
  }

  /** Self-service disable. */
  async mfaDisable(req, res, next) {
    try {
      res.json({ success: true, data: await authService.disableMfa(req.user.id) });
    } catch (err) { next(err); }
  }

  async refresh(req, res, next) {
    try {
      const token = req.cookies?.[REFRESH_COOKIE];
      const { accessToken, refreshToken, refreshExpiresAt, user } = await authService.refresh(token);
      setRefreshCookie(res, refreshToken, refreshExpiresAt);
      res.json({ success: true, data: { accessToken, user } });
    } catch (err) { next(err); }
  }

  async logout(req, res, next) {
    try {
      await authService.logout(req.cookies?.[REFRESH_COOKIE]);
      res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
      res.json({ success: true });
    } catch (err) { next(err); }
  }

  async me(req, res, next) {
    try {
      res.json({ success: true, data: { user: await authService.me(req.user.id) } });
    } catch (err) { next(err); }
  }
}

module.exports = new AuthController();
