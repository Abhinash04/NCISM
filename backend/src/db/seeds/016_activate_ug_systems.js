/**
 * Phase 7 — activate the newly authored non-Ayurveda UG rulesets. Seed 015
 * auto-registers every on-disk ruleset as `draft`; this flips the UG Unani (and,
 * once authored, UG Sowa-Rigpa) rulesets to `active` for their (system, level)
 * with a Board reference — guarded so it never steals an already-active row.
 * Idempotent.
 */

const EFFECTIVE_SESSION = '2026-27';

const ACTIVATIONS = [
  {
    rulesetId: 'mesar-ug-unani-2023',
    version: 'v1',
    system: 'unani',
    level: 'UG',
    boardRef: 'MESAR (UG) Unani 2023 — Board-approved',
  },
  // Sowa-Rigpa is added here once its ruleset directory is authored:
  // { rulesetId: 'mesar-ug-sowa-rigpa-2023', version: 'v1', system: 'sowa_rigpa', level: 'UG',
  //   boardRef: 'MESAR (UG) Sowa-Rigpa 2023 — Board-approved' },
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
  console.log(`[seed] UG systems activation: ${activated} ruleset(s) activated.`);
};
