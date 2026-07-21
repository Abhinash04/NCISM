/**
 * Phase 7 — activate the PG rulesets (Ayurveda / Unani / Siddha). Seed 015
 * auto-registers every on-disk ruleset as `draft`; this flips the PG rulesets to
 * `active` for their (system, PG) with a Board reference — guarded so it never
 * steals an already-active row. Idempotent.
 */

const EFFECTIVE_SESSION = '2026-27';

const ACTIVATIONS = [
  { rulesetId: 'mesar-pg-ayurveda-2024', version: 'v1', system: 'ayurveda', level: 'PG', boardRef: 'MESAR (PG) Ayurveda 2024 — Board-approved' },
  { rulesetId: 'mesar-pg-unani-2024', version: 'v1', system: 'unani', level: 'PG', boardRef: 'MESAR (PG) Unani 2024 — Board-approved' },
  { rulesetId: 'mesar-pg-siddha-2024', version: 'v1', system: 'siddha', level: 'PG', boardRef: 'MESAR (PG) Siddha 2024 — Board-approved' },
];

exports.seed = async function seed(knex) {
  let activated = 0;
  for (const a of ACTIVATIONS) {
    const row = await knex('ruleset_versions')
      .where({ ruleset_id: a.rulesetId, version: a.version }).first('id');
    if (!row) continue; // not registered (directory absent) — skip

    const existingActive = await knex('ruleset_versions')
      .where({ system: a.system, level: a.level, status: 'active' }).first('id');
    if (existingActive) continue; // already something active for this system/level

    await knex('ruleset_versions').where({ id: row.id })
      .update({ status: 'active', board_ref: a.boardRef, effective_session: EFFECTIVE_SESSION, activated_at: knex.fn.now() });
    activated += 1;
  }
  // eslint-disable-next-line no-console
  console.log(`[seed] PG systems activation: ${activated} ruleset(s) activated.`);
};
