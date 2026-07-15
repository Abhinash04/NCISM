/**
 * Creates the first administrator so the system is reachable after install.
 * Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD env vars, else safe dev
 * defaults (printed with a warning). Idempotent by email.
 */

const bcrypt = require('bcryptjs');

exports.seed = async function seed(knex) {
  const email = (process.env.ADMIN_EMAIL || 'admin@ncism.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

  const existing = await knex('users').where({ email }).first();
  if (existing) {
    await knex('user_roles').insert({ user_id: existing.id, role_key: 'admin' }).onConflict().ignore();
    return;
  }

  const [user] = await knex('users')
    .insert({ email, name: 'Administrator', password_hash: await bcrypt.hash(password, rounds) })
    .returning('id');

  await knex('user_roles').insert({ user_id: user.id, role_key: 'admin' });

  if (!process.env.ADMIN_PASSWORD) {
    // eslint-disable-next-line no-console
    console.warn(`[seed] Bootstrap admin created: ${email} / ${password}  — CHANGE THIS PASSWORD.`);
  }
};
