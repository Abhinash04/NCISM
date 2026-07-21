/**
 * Phase 6a — ruleset registry + activation. Rules themselves stay file-based
 * (data/rulesets/<id>/<version>/); this table tracks the versions the system
 * knows about and which one is ACTIVE per (system, level). Activation carries a
 * Board reference (SoD) and retires the previous active. `application.process`
 * resolves the active ruleset for the case's (system, level) instead of
 * hardcoding Ayurveda.
 */

exports.up = async function up(knex) {
  await knex.schema.createTable('ruleset_versions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('ruleset_id').notNullable();          // e.g. mesar-ug-ayurveda-2024
    t.string('version').notNullable();             // e.g. v1
    t.string('system').notNullable();              // ayurveda | unani | siddha | sowa_rigpa
    t.string('level').notNullable().defaultTo('UG'); // UG | PG
    t.string('title');
    t.string('status').notNullable().defaultTo('draft'); // draft | active | retired
    t.string('effective_session');                 // e.g. 2026-27
    t.string('board_ref');                          // Board/policy reference (required to activate)
    t.jsonb('supported_intakes');                   // [50, 60, 100]
    t.string('dir_path').notNullable();             // rulesets/<id>/<version>
    t.uuid('activated_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('activated_at');
    t.timestamps(true, true);
    t.unique(['ruleset_id', 'version']);
    t.index(['system', 'level']);
  });

  // At most one ACTIVE ruleset per (system, level).
  await knex.raw(
    "CREATE UNIQUE INDEX ruleset_active_per_system_level ON ruleset_versions (system, level) WHERE status = 'active'",
  );
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('ruleset_versions');
};
