// Singleton Knex instance for the app. Import `db` anywhere that needs the
// database; repositories should be the primary consumers.
const knex = require('knex');
const knexConfig = require('../../knexfile');

const env = process.env.NODE_ENV === 'production' ? 'production'
  : process.env.NODE_ENV === 'test' ? 'test'
  : 'development';

const db = knex(knexConfig[env]);

/** Verifies connectivity; call on boot so failures surface immediately. */
async function assertConnection() {
  await db.raw('select 1');
}

module.exports = { db, assertConnection };
