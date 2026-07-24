/**
 * Phase 3a RBAC: the `visitor` role + `application:*` permissions, mapped onto
 * the case review chain (visitor → consultant → senior → board). Idempotent.
 */

const VISITOR_ROLE = {
  key: 'visitor', name: 'Visitor', description: 'Uploads visitation reports and starts assessment cases.',
};

const PERMS = [
  ['application:create', 'application', 'create'],
  ['application:read', 'application', 'read'],
  ['application:process', 'application', 'process'],
  ['application:submit', 'application', 'submit'],
  ['application:review', 'application', 'review'],
  ['application:decide', 'application', 'decide'],
];

// Grants added to each role (merged with whatever they already hold).
const GRANTS = {
  visitor: ['application:create', 'application:read', 'institution:read'],
  consultant: ['application:read', 'application:process', 'application:submit'],
  senior_consultant: ['application:read', 'application:review'],
  board_member: ['application:read', 'application:decide'],
  president: ['application:read', 'application:decide'],
  admin: ['application:read'],
  viewer: ['application:read'],
};

exports.seed = async function seed(knex) {
  await knex('roles').insert(VISITOR_ROLE).onConflict('key').merge(['name', 'description']);

  await knex('permissions')
    .insert(PERMS.map(([key, resource, action]) => ({ key, resource, action })))
    .onConflict('key').merge(['resource', 'action']);

  const rows = [];
  for (const [role_key, perms] of Object.entries(GRANTS)) {
    for (const permission_key of perms) rows.push({ role_key, permission_key });
  }
  await knex('role_permissions').insert(rows).onConflict(['role_key', 'permission_key']).ignore();
};
