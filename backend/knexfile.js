// Knex configuration. Connection comes from DATABASE_URL (see .env.example).
// Migrations + seeds live under src/db. Used by the `db:*` npm scripts and by
// src/db/index.js at runtime.
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const connection = process.env.DATABASE_URL || {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  user: process.env.POSTGRES_USER || 'ncism',
  password: process.env.POSTGRES_PASSWORD || 'ncism_dev_pw',
  database: process.env.POSTGRES_DB || 'ncism',
};

/** @type {import('knex').Knex.Config} */
const base = {
  client: 'pg',
  connection,
  pool: { min: 2, max: 10 },
  migrations: {
    directory: path.join(__dirname, 'src', 'db', 'migrations'),
    tableName: 'knex_migrations',
    extension: 'js',
  },
  seeds: {
    directory: path.join(__dirname, 'src', 'db', 'seeds'),
  },
};

module.exports = {
  development: base,
  test: { ...base, connection: process.env.TEST_DATABASE_URL || connection },
  production: base,
};
