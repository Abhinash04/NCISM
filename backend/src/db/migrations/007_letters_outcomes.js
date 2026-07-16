/**
 * Phase 3d — structured board outcomes + generated official letters/orders.
 * Adds decision-outcome + letter-context columns to applications and a `letters`
 * table storing the issued Clarification Letters, Hearing Notices, and Final
 * Orders (reproducing the approved NCISM formats).
 */

exports.up = async function up(knex) {
  await knex.schema.alterTable('applications', (t) => {
    // Structured board decision (set on decide/dispatch).
    t.string('outcome'); // grant | grant_with_conditions | reduce_intake | deny
    t.integer('approved_seats');
    // Letter-context fields (captured at visitor upload; used to fill the subject line).
    t.integer('intake');
    t.string('level').defaultTo('UG'); // UG | PG
    t.string('permission_type'); // e.g. "yearly" / "2nd renewal" / "extended"
    t.string('visitation_from');
    t.string('visitation_to');
    t.string('visitation_mode').defaultTo('hybrid');
  });

  await knex.schema.createTable('letters', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('application_id').notNullable().references('id').inTable('applications').onDelete('CASCADE');
    t.string('kind').notNullable(); // clarification | hearing_without_clarification | hearing_with_clarification | final_order
    t.string('ref_no');
    t.text('content_markdown').notNullable();
    t.uuid('generated_by').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('signed_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('status').notNullable().defaultTo('issued'); // draft | issued
    t.timestamps(true, true);
    t.index('application_id');
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('letters');
  await knex.schema.alterTable('applications', (t) => {
    t.dropColumn('outcome');
    t.dropColumn('approved_seats');
    t.dropColumn('intake');
    t.dropColumn('level');
    t.dropColumn('permission_type');
    t.dropColumn('visitation_from');
    t.dropColumn('visitation_to');
    t.dropColumn('visitation_mode');
  });
};
