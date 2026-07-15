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
      const { accessToken, refreshToken, refreshExpiresAt, user } = await authService.login(email, password);
      setRefreshCookie(res, refreshToken, refreshExpiresAt);
      res.json({ success: true, data: { accessToken, user } });
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
