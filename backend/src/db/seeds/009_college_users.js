/**
 * Phase 3b — mock college users bound to a real institution, so the
 * clarification cycle is testable end-to-end. Idempotent by email.
 */

const bcrypt = require('bcryptjs');

// Bound to institutions by institute_id (resolved at seed time).
const COLLEGES = [
  { email: 'college.ayu0140@ncism.local', name: 'Principal, AYU0140', instituteId: 'AYU0140' },
  { email: 'college.ayu0001@ncism.local', name: 'Principal, AYU0001', instituteId: 'AYU0001' },
];

exports.seed = async function seed(knex) {
  const password = process.env.MOCK_PASSWORD || 'Password123';
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const passwordHash = await bcrypt.hash(password, rounds);

  let created = 0;
  for (const c of COLLEGES) {
    const inst = await knex('institutions').where({ institute_id: c.instituteId }).first('id');
    if (!inst) continue; // skip if the institution isn't seeded

    let user = await knex('users').whereRaw('lower(email) = ?', [c.email]).first('id');
    if (!user) {
      const [row] = await knex('users')
        .insert({ email: c.email, name: c.name, password_hash: passwordHash, institution_id: inst.id })
        .returning('id');
      user = row;
      created += 1;
    } else {
      await knex('users').where({ id: user.id }).update({ institution_id: inst.id });
    }
    await knex('user_roles')
      .insert({ user_id: user.id, role_key: 'college' })
      .onConflict(['user_id', 'role_key']).ignore();
  }

  // eslint-disable-next-line no-console
  console.log(`[seed] College users: ${created} created, ${COLLEGES.length} ensured.`);
};
