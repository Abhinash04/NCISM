/**
 * Case-delete permission. The uploader (visitor) removes a mistaken upload while
 * it is still pre-processing; admin can delete any non-finalized case as an
 * override. State-gating lives in the workflow guard — this only grants the
 * permission. Idempotent.
 */

const PERMS = [
  ['application:delete', 'application', 'delete'],
];

const GRANTS = {
  visitor: ['application:delete'],
  admin: ['application:delete'],
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
