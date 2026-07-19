/**
 * Phase 6d — TOTP MFA. Users self-enroll: a base32 secret is stored (unset until
 * enrolled) and `mfa_enabled` flips true only after a first code is verified.
 * Login then requires a second factor for enabled users.
 */

exports.up = async function up(knex) {
  const hasSecret = await knex.schema.hasColumn('users', 'mfa_secret');
  const hasEnabled = await knex.schema.hasColumn('users', 'mfa_enabled');
  if (hasSecret && hasEnabled) return; // idempotent — columns already present
  await knex.schema.alterTable('users', (t) => {
    if (!hasSecret) t.string('mfa_secret'); // base32 TOTP secret; null until enrollment starts
    if (!hasEnabled) t.boolean('mfa_enabled').notNullable().defaultTo(false);
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('mfa_secret');
    t.dropColumn('mfa_enabled');
  });
};
