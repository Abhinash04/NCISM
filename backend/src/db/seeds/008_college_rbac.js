/**
 * Phase 3b RBAC: the external `college` role + `clarification:*` permissions.
 * Board/president issue clarifications; the college responds. Idempotent.
 */

const COLLEGE_ROLE = {
  key: 'college', name: 'College User', description: 'Institution respondent: views own cases, answers clarifications.',
};

const PERMS = [
  ['clarification:issue', 'clarification', 'issue'],
  ['clarification:respond', 'clarification', 'respond'],
];

const GRANTS = {
  board_member: ['clarification:issue'],
  president: ['clarification:issue'],
  college: ['application:read', 'clarification:respond'],
};

exports.seed = async function seed(knex) {
  await knex('roles').insert(COLLEGE_ROLE).onConflict('key').merge(['name', 'description']);

  await knex('permissions')
    .insert(PERMS.map(([key, resource, action]) => ({ key, resource, action })))
    .onConflict('key').merge(['resource', 'action']);

  const rows = [];
  for (const [role_key, perms] of Object.entries(GRANTS)) {
    for (const permission_key of perms) rows.push({ role_key, permission_key });
  }
  await knex('role_permissions').insert(rows).onConflict(['role_key', 'permission_key']).ignore();
};
