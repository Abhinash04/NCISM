/**
 * Phase 5b RBAC: reports/analytics read access. `report:read` already exists
 * (seed 001) and is granted to admin/reviewer/analyst/viewer + junior/senior/
 * board/president. This extends it to the oversight (commission_observer) and
 * support (secretariat) roles, which review portfolio trends but lacked it.
 * Idempotent.
 */

const GRANTS = {
  commission_observer: ['report:read'],
  secretariat: ['report:read'],
};

exports.seed = async function seed(knex) {
  const rows = [];
  for (const [role_key, perms] of Object.entries(GRANTS)) {
    for (const permission_key of perms) rows.push({ role_key, permission_key });
  }
  await knex('role_permissions').insert(rows).onConflict(['role_key', 'permission_key']).ignore();
};
