/**
 * Phase 5a RBAC: compliance monitoring permissions. Dealing staff (junior) +
 * admin manage the penalty ledger; the rest of the chain reads it. Idempotent.
 */

const PERMS = [
  ['compliance:read', 'compliance', 'read'],
  ['compliance:manage', 'compliance', 'manage'],
];

const GRANTS = {
  junior_consultant: ['compliance:read', 'compliance:manage'],
  admin: ['compliance:read', 'compliance:manage'],
  senior_consultant: ['compliance:read'],
  board_member: ['compliance:read'],
  president: ['compliance:read'],
  commission_observer: ['compliance:read'],
};

exports.seed = async function seed(knex) {
  await knex('permissions')
    .insert(PERMS.map(([key, resource, action]) => ({ key, resource, action })))
    .onConflict('key').merge(['resource', 'action']);

  const rows = [];
  for (const [role_key, perms] of Object.entries(GRANTS)) {
    for (const permission_key of perms) rows.push({ role_key, permission_key });
  }
  await knex('role_permissions').insert(rows).onConflict(['role_key', 'permission_key']).ignore();
};
