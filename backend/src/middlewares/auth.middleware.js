const ApiError = require('../utils/api-error');
const jwtUtil = require('../utils/jwt');
const userRepo = require('../repositories/user.repository');

/**
 * Verifies the Bearer access token and attaches the full access profile
 * (identity + roles + live permission set) to req.user. Permissions are loaded
 * from the DB each request so role changes take effect without re-login.
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('NO_TOKEN', 'Authentication required');

    let payload;
    try {
      payload = jwtUtil.verifyAccess(token);
    } catch {
      throw ApiError.unauthorized('INVALID_TOKEN', 'Invalid or expired token');
    }

    const profile = await userRepo.findWithAccess(payload.sub);
    if (!profile || profile.status !== 'active') {
      throw ApiError.unauthorized('USER_INACTIVE', 'User not found or disabled');
    }
    req.user = profile; // { id, email, name, status, roles[], permissions[] }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate };
