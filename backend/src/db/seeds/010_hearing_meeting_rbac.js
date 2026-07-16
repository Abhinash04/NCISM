/**
 * Phase 3c RBAC: hearing committee, secretariat, and commission observer roles +
 * their permissions. Idempotent (mirrors 006/008).
 */

const ROLES = [
  { key: 'hearing_committee', name: 'Hearing Committee Member', description: 'Conducts appointed hearings; records minutes.' },
  { key: 'secretariat', name: 'Board Secretariat', description: 'Assembles board meetings, dispatches final orders.' },
  { key: 'commission_observer', name: 'Commission Observer', description: 'Read-only oversight across cases.' },
];

const PERMS = [
  ['hearing:appoint', 'hearing', 'appoint'],
  ['hearing:conduct', 'hearing', 'conduct'],
  ['meeting:manage', 'meeting', 'manage'],
  ['order:dispatch', 'order', 'dispatch'],
];

const GRANTS = {
  president: ['hearing:appoint'],
  hearing_committee: ['application:read', 'hearing:conduct'],
  secretariat: ['application:read', 'meeting:manage', 'order:dispatch'],
  commission_observer: ['application:read', 'audit:read'],
};

exports.seed = async function seed(knex) {
  await knex('roles').insert(ROLES).onConflict('key').merge(['name', 'description']);

  await knex('permissions')
    .insert(PERMS.map(([key, resource, action]) => ({ key, resource, action })))
    .onConflict('key').merge(['resource', 'action']);

  const rows = [];
  for (const [role_key, perms] of Object.entries(GRANTS)) {
    for (const permission_key of perms) rows.push({ role_key, permission_key });
  }
  await knex('role_permissions').insert(rows).onConflict(['role_key', 'permission_key']).ignore();
};
