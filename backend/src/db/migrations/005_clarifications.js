/**
 * Phase 3b — clarification cycle. The board can issue a clarification letter to
 * a college, which responds; the consultant then re-examines. Adds the two new case
 * statuses, binds college users to an institution, and stores each round.
 *
 * transaction:false because ALTER TYPE ... ADD VALUE cannot run inside a
 * transaction block that later depends on the value in some PG setups.
 */

exports.config = { transaction: false };

exports.up = async function up(knex) {
  await knex.raw("ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'clarification_open'");
  await knex.raw("ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'clarification_responded'");

  const hasCol = await knex.schema.hasColumn('users', 'institution_id');
  if (!hasCol) {
    await knex.schema.alterTable('users', (t) => {
      t.uuid('institution_id').references('id').inTable('institutions').onDelete('SET NULL');
      t.index('institution_id');
    });
  }

  const hasTable = await knex.schema.hasTable('clarifications');
  if (!hasTable) {
    await knex.schema.createTable('clarifications', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('application_id').notNullable().references('id').inTable('applications').onDelete('CASCADE');
      t.integer('round').notNullable().defaultTo(1);
      t.text('letter_text').notNullable();
      t.uuid('issued_by').references('id').inTable('users').onDelete('SET NULL');
      t.timestamp('issued_at').notNullable().defaultTo(knex.fn.now());
      t.text('response_text');
      t.string('response_file');
      t.uuid('responded_by').references('id').inTable('users').onDelete('SET NULL');
      t.timestamp('responded_at');
      t.string('status').notNullable().defaultTo('open'); // open | responded
      t.timestamps(true, true);
      t.index('application_id');
    });
  }
};

exports.down = async function down(knex) {
  // Enum values can't be removed in Postgres; leave the type as-is.
  await knex.schema.dropTableIfExists('clarifications');
  const hasCol = await knex.schema.hasColumn('users', 'institution_id');
  if (hasCol) {
    await knex.schema.alterTable('users', (t) => t.dropColumn('institution_id'));
  }
};
