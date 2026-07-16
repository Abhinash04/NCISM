const { db } = require('../db');
const userRepo = require('../repositories/user.repository');
const ApiError = require('../utils/api-error');

class OrgController {
  /** GET /admin/users — org users with role keys. */
  async listUsers(req, res, next) {
    try {
      const users = await userRepo.listUsers();
      res.json({ success: true, users });
    } catch (error) {
      next(error);
    }
  }

  /** GET /admin/users/:id — user with roles + permissions. */
  async getUser(req, res, next) {
    try {
      const user = await userRepo.getUserWithRoles(req.params.id);
      if (!user) return next(ApiError.notFound('USER_NOT_FOUND', `User ${req.params.id} not found`));
      res.json({ success: true, user });
    } catch (error) {
      next(error);
    }
  }

  /** GET /admin/roles — role catalogue with permission keys. */
  async listRoles(req, res, next) {
    try {
      const roles = await db('roles').orderBy('key').select('key', 'name', 'description');
      const maps = await db('role_permissions').select('role_key', 'permission_key');
      const byRole = {};
      for (const m of maps) (byRole[m.role_key] ||= []).push(m.permission_key);
      res.json({ success: true, roles: roles.map((r) => ({ ...r, permissions: byRole[r.key] || [] })) });
    } catch (error) {
      next(error);
    }
  }

  /** GET /admin/permissions — permission catalogue. */
  async listPermissions(req, res, next) {
    try {
      const permissions = await db('permissions').orderBy('key').select('key', 'resource', 'action', 'description');
      res.json({ success: true, permissions });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrgController();
