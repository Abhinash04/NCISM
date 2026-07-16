/**
 * Phase 4 — system-wide append-only audit trail. Every write request (POST/
 * PATCH/PUT/DELETE that succeeds) is recorded by the audit middleware. The
 * per-case `application_events` timeline stays; this generalizes it across all
 * entities (users, institutions, applications, meetings, letters, …).
 */

exports.up = async function up(knex) {
  await knex.schema.createTable('audit_log', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('actor_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('actor_email');
    t.string('action').notNullable(); // path-derived verb (e.g. process, decide, dispatch, POST)
    t.string('entity'); // applications | institutions | meetings | admin | auth | …
    t.string('entity_id');
    t.string('path').notNullable();
    t.integer('status');
    t.jsonb('meta');
    t.string('ip');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['entity', 'created_at']);
    t.index('actor_id');
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('audit_log');
};
