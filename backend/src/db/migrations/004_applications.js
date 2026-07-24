/**
 * Phase 3a — assessment cases (applications) + their transition timeline.
 * A visitor uploads a report for an institution; it routes to the allotted
 * consultant, who runs the pipeline, then submits it up the org chain
 * (consultant → senior consultant → board) to an approve/reject decision.
 */

const STATUSES = [
  'uploaded', 'processing', 'processed', 'failed',
  'under_validation', 'senior_review', 'board_review', 'approved', 'rejected',
];

exports.up = async function up(knex) {
  await knex.schema.createTable('applications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('institution_id').notNullable().references('id').inTable('institutions').onDelete('RESTRICT');
    // Denormalized from the institution for routing/queue filters.
    t.enu('system', ['ayurveda', 'unani', 'siddha', 'sowa_rigpa'], { useNative: true, enumName: 'medicine_system', existingType: true })
      .notNullable();
    t.string('state').notNullable();
    t.string('session'); // e.g. "2026-27"
    t.enu('status', STATUSES, { useNative: true, enumName: 'application_status' })
      .notNullable().defaultTo('uploaded');
    t.string('job_id'); // link to the disk pipeline artifacts
    t.text('report_markdown');
    t.jsonb('report_json');
    t.string('decision'); // 'approved' | 'rejected'
    t.text('decision_note');
    t.string('error'); // failure reason when status = failed
    // Actors (nullable; filled as the case moves through the chain).
    t.uuid('uploaded_by').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('assigned_to').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('submitted_by').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('decided_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.index('status');
    t.index(['system', 'state']);
    t.index('assigned_to');
  });

  await knex.schema.createTable('application_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('application_id').notNullable().references('id').inTable('applications').onDelete('CASCADE');
    t.string('from_state');
    t.string('to_state').notNullable();
    t.uuid('actor_id').references('id').inTable('users').onDelete('SET NULL');
    t.text('note');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index('application_id');
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('application_events');
  await knex.schema.dropTableIfExists('applications');
  await knex.raw('DROP TYPE IF EXISTS application_status');
};
