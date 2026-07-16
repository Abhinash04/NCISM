/**
 * Phase 3c — hearings, board meetings, and case closure. When shortcomings
 * persist, the board requests a hearing, the President appoints a 2-member
 * committee, the committee records minutes, the board decides (in a board
 * meeting the secretariat assembles), and the secretariat dispatches the final
 * order → Closed.
 *
 * transaction:false because of ALTER TYPE ... ADD VALUE.
 */

exports.config = { transaction: false };

exports.up = async function up(knex) {
  await knex.raw("ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'hearing_requested'");
  await knex.raw("ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'hearing_scheduled'");
  await knex.raw("ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'closed'");

  if (!(await knex.schema.hasTable('hearings'))) {
    await knex.schema.createTable('hearings', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('application_id').notNullable().references('id').inTable('applications').onDelete('CASCADE');
      t.uuid('appointed_by').references('id').inTable('users').onDelete('SET NULL');
      t.timestamp('scheduled_at');
      t.string('status').notNullable().defaultTo('open'); // open | held
      t.text('minutes_text');
      t.text('verdict');
      t.uuid('recorded_by').references('id').inTable('users').onDelete('SET NULL');
      t.timestamp('recorded_at');
      t.timestamps(true, true);
      t.index('application_id');
    });
  }

  if (!(await knex.schema.hasTable('hearing_members'))) {
    await knex.schema.createTable('hearing_members', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('hearing_id').notNullable().references('id').inTable('hearings').onDelete('CASCADE');
      t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.unique(['hearing_id', 'user_id']);
    });
  }

  if (!(await knex.schema.hasTable('board_meetings'))) {
    await knex.schema.createTable('board_meetings', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('number').notNullable();
      t.timestamp('scheduled_at');
      t.string('status').notNullable().defaultTo('scheduled'); // scheduled | confirmed
      t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
      t.text('minutes_text');
      t.timestamps(true, true);
    });
  }

  if (!(await knex.schema.hasTable('board_meeting_items'))) {
    await knex.schema.createTable('board_meeting_items', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('meeting_id').notNullable().references('id').inTable('board_meetings').onDelete('CASCADE');
      t.uuid('application_id').notNullable().references('id').inTable('applications').onDelete('CASCADE');
      t.unique(['meeting_id', 'application_id']);
      t.index('meeting_id');
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('board_meeting_items');
  await knex.schema.dropTableIfExists('board_meetings');
  await knex.schema.dropTableIfExists('hearing_members');
  await knex.schema.dropTableIfExists('hearings');
  // Enum values can't be removed in Postgres; leave the type as-is.
};
