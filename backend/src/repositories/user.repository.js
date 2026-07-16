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
    institution_id: user.institution_id || null, // college users bind to one institution
    roles, permissions,
  };
}

async function touchLastLogin(id) {
  await db('users').where({ id }).update({ last_login_at: db.fn.now() });
}

/** All users with their role keys aggregated (admin console listing). */
async function listUsers() {
  const rows = await db('users')
    .leftJoin('user_roles', 'users.id', 'user_roles.user_id')
    .groupBy('users.id')
    .orderBy('users.name')
    .select(
      'users.id', 'users.email', 'users.name', 'users.status', 'users.supervisor_id',
      'users.last_login_at', 'users.created_at',
      db.raw("coalesce(array_agg(user_roles.role_key) filter (where user_roles.role_key is not null), '{}') as roles"),
    );
  return rows;
}

/** Single user with roles + permissions (admin detail view). */
async function getUserWithRoles(id) {
  const user = await findById(id);
  if (!user) return null;
  const roles = await roleKeys(id);
  const permissions = await permissionsForRoles(roles);
  return {
    id: user.id, email: user.email, name: user.name, status: user.status,
    supervisorId: user.supervisor_id, lastLoginAt: user.last_login_at,
    createdAt: user.created_at, roles, permissions,
  };
}

module.exports = {
  findByEmail, findById, roleKeys, permissionsForRoles, findWithAccess, touchLastLogin,
  listUsers, getUserWithRoles,
};
