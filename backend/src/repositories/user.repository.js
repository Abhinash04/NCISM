const { db } = require('../db');

/** Raw user row by email (login path — includes password_hash). */
function findByEmail(email) {
  return db('users').whereRaw('lower(email) = ?', [String(email).toLowerCase()]).first();
}

function findById(id) {
  return db('users').where({ id }).first();
}

/** Role keys held by a user. */
async function roleKeys(userId) {
  const rows = await db('user_roles').where({ user_id: userId }).select('role_key');
  return rows.map((r) => r.role_key);
}

/** Distinct permission keys granted by a set of roles. */
async function permissionsForRoles(roles) {
  if (!roles.length) return [];
  const rows = await db('role_permissions').whereIn('role_key', roles).distinct('permission_key');
  return rows.map((r) => r.permission_key);
}

/** Full access profile for req.user: identity + roles + permission set. */
async function findWithAccess(id) {
  const user = await findById(id);
  if (!user) return null;
  const roles = await roleKeys(id);
  const permissions = await permissionsForRoles(roles);
  return {
    id: user.id, email: user.email, name: user.name, status: user.status,
    roles, permissions,
  };
}

async function touchLastLogin(id) {
  await db('users').where({ id }).update({ last_login_at: db.fn.now() });
}

module.exports = { findByEmail, findById, roleKeys, permissionsForRoles, findWithAccess, touchLastLogin };
