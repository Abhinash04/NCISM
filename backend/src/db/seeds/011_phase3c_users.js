/**
 * Phase 3c — mock users for the hearing/meeting roles so the closure flow is
 * testable end-to-end. Idempotent by email.
 */

const bcrypt = require('bcryptjs');

const USERS = [
  { email: 'hearing1@ncism.local', name: 'Dr. Hearing Member One', role: 'hearing_committee' },
  { email: 'hearing2@ncism.local', name: 'Dr. Hearing Member Two', role: 'hearing_committee' },
  { email: 'secretariat@ncism.local', name: 'Board Secretariat', role: 'secretariat' },
  { email: 'observer@ncism.local', name: 'Commission Observer', role: 'commission_observer' },
];

exports.seed = async function seed(knex) {
  const password = process.env.MOCK_PASSWORD || 'Password123';
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const passwordHash = await bcrypt.hash(password, rounds);

  for (const u of USERS) {
    let user = await knex('users').whereRaw('lower(email) = ?', [u.email]).first('id');
    if (!user) {
      const [row] = await knex('users')
        .insert({ email: u.email, name: u.name, password_hash: passwordHash })
        .returning('id');
      user = row;
    }
    await knex('user_roles')
      .insert({ user_id: user.id, role_key: u.role })
      .onConflict(['user_id', 'role_key']).ignore();
  }

  // eslint-disable-next-line no-console
  console.log(`[seed] Phase 3c users: ${USERS.length} ensured.`);
};
