/**
 * Auth + RBAC foundation: users, roles, permissions, and their joins, plus
 * refresh tokens. Roles/permissions are seeded (see src/db/seeds).
 */

exports.up = async function up(knex) {
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('email').notNullable().unique();
    t.string('name').notNullable();
    t.string('password_hash').notNullable();
    t.enu('status', ['active', 'disabled'], { useNative: true, enumName: 'user_status' })
      .notNullable().defaultTo('active');
    t.boolean('mfa_enabled').notNullable().defaultTo(false);
    t.timestamp('last_login_at');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('roles', (t) => {
    t.string('key').primary(); // 'admin' | 'reviewer' | 'analyst' | 'viewer'
    t.string('name').notNullable();
    t.string('description');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('permissions', (t) => {
    // e.g. 'assessment:approve', 'institution:create'
    t.string('key').primary();
    t.string('resource').notNullable();
    t.string('action').notNullable();
    t.string('description');
  });

  await knex.schema.createTable('role_permissions', (t) => {
    t.string('role_key').notNullable().references('key').inTable('roles').onDelete('CASCADE');
    t.string('permission_key').notNullable().references('key').inTable('permissions').onDelete('CASCADE');
    t.primary(['role_key', 'permission_key']);
  });

  await knex.schema.createTable('user_roles', (t) => {
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('role_key').notNullable().references('key').inTable('roles').onDelete('CASCADE');
    t.primary(['user_id', 'role_key']);
  });

  await knex.schema.createTable('refresh_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('token_hash').notNullable().unique(); // sha-256 of the refresh token
    t.timestamp('expires_at').notNullable();
    t.timestamp('revoked_at');
    t.timestamps(true, true);
    t.index('user_id');
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('users');
  await knex.raw('DROP TYPE IF EXISTS user_status');
};
