/**
 * Phase 6a — register the file-based rulesets in the DB registry and activate
 * the verified Ayurveda-UG ruleset. Scans data/rulesets/ (via the engine
 * loader), upserts each as `draft`, then activates mesar-ug-ayurveda-2024 for
 * (ayurveda, UG) with a Board reference. Idempotent.
 */

const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { listRulesets } = require('../../engines/assessment/rules/loader');

const ACTIVE_ID = 'mesar-ug-ayurveda-2024';
const ACTIVE_VERSION = 'v1';
const BOARD_REF = 'MESAR (UG) Ayurveda 2024 — Board-approved';
const EFFECTIVE_SESSION = '2026-27';

function deriveLevel(id) {
  if (/-pg-/i.test(id)) return 'PG';
  return 'UG';
}

exports.seed = async function seed(knex) {
  const rows = [];
  for (const { id, version } of listRulesets()) {
    const dir = path.join(config.dataDir, 'rulesets', id, version);
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'ruleset.json'), 'utf8'));
    rows.push({
      ruleset_id: id,
      version,
      system: String(manifest.system || '').toLowerCase() || 'ayurveda',
      level: deriveLevel(id),
      title: manifest.title || id,
      supported_intakes: JSON.stringify(manifest.supportedIntakes || []),
      dir_path: `rulesets/${id}/${version}`,
      status: 'draft',
    });
  }

  if (rows.length) {
    await knex('ruleset_versions').insert(rows)
      .onConflict(['ruleset_id', 'version'])
      .merge(['system', 'level', 'title', 'supported_intakes', 'dir_path']);
  }

  // Activate the verified Ayurveda-UG ruleset (only if nothing is active for that system/level).
  const existingActive = await knex('ruleset_versions')
    .where({ system: 'ayurveda', level: 'UG', status: 'active' }).first('id');
  if (!existingActive) {
    await knex('ruleset_versions')
      .where({ ruleset_id: ACTIVE_ID, version: ACTIVE_VERSION })
      .update({ status: 'active', board_ref: BOARD_REF, effective_session: EFFECTIVE_SESSION, activated_at: knex.fn.now() });
  }

  const [{ count }] = await knex('ruleset_versions').count({ count: '*' });
  console.log(`[seed] Rulesets: ${count} registered; ${ACTIVE_ID}@${ACTIVE_VERSION} active for ayurveda/UG.`);
};
