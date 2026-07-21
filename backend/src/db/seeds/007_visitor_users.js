/**
 * Phase 3a — mock visitor users so the upload → review flow is testable.
 * Mock password: MOCK_PASSWORD env (default 'Password123'). Idempotent by email.
 */

const bcrypt = require('bcryptjs');

const VISITORS = [
  { email: 'visitor@ncism.local', name: 'Dr. Anoop Indoria' },
  { email: 'visitor2@ncism.local', name: 'Dr. Visitor Two' },
];

exports.seed = async function seed(knex) {
  const password = process.env.MOCK_PASSWORD || 'Password123';
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const passwordHash = await bcrypt.hash(password, rounds);

  for (const v of VISITORS) {
    let user = await knex('users').whereRaw('lower(email) = ?', [v.email]).first('id');
    if (!user) {
      const [row] = await knex('users')
        .insert({ email: v.email, name: v.name, password_hash: passwordHash })
        .returning('id');
      user = row;
    }
    await knex('user_roles')
      .insert({ user_id: user.id, role_key: 'visitor' })
      .onConflict(['user_id', 'role_key']).ignore();
  }

  // eslint-disable-next-line no-console
  console.log(`[seed] Visitor users: ${VISITORS.length} upserted.`);
};
