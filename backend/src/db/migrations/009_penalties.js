/**
 * Phase 5a — compliance / penalty ledger. Seat-reduction + denial penalties are
 * auto-derived from the assessment's punitive summary at board decision; the
 * dealing staff add monetary (ghost-faculty) + teacher-code-revocation penalties
 * during monitoring and track their status through to compliance.
 */

exports.up = async function up(knex) {
  await knex.schema.alterTable('applications', (t) => {
    t.string('compliance_status'); // monitoring | complied | null
  });

  await knex.schema.createTable('penalties', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('application_id').notNullable().references('id').inTable('applications').onDelete('CASCADE');
    t.string('type').notNullable(); // seat_reduction | denial | monetary | teacher_code_revocation
    t.text('description');
    t.decimal('amount', 14, 2); // monetary penalties (e.g. 2500000.00)
    t.integer('seats'); // seat_reduction penalties
    t.string('status').notNullable().defaultTo('pending'); // pending | applied | paid | waived
    t.string('source').notNullable().defaultTo('manual'); // auto | manual
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('resolved_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('resolved_at');
    t.timestamps(true, true);
    t.index('application_id');
    t.index('status');
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('penalties');
  await knex.schema.alterTable('applications', (t) => t.dropColumn('compliance_status'));
};
