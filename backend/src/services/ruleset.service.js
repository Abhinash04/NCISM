const { db } = require('../db');
const rulesetRepo = require('../repositories/ruleset.repository');
const { loadRuleset } = require('../engines/assessment/rules/loader');
const ApiError = require('../utils/api-error');

function list() {
  return rulesetRepo.list();
}

async function get(id) {
  const row = await rulesetRepo.getById(id);
  if (!row) throw ApiError.notFound('RULESET_NOT_FOUND', `Ruleset version ${id} not found`);
  return row;
}

/**
 * Activates a ruleset version for its (system, level). SoD: requires a Board
 * reference. Validates the ruleset loads structurally, retires the previous
 * active for the same (system, level), then activates this one. Atomic.
 */
async function activate(id, { boardRef, actor }) {
  if (!boardRef || !boardRef.trim()) {
    throw ApiError.unprocessable('BOARD_REF_REQUIRED', 'A Board/policy reference is required to activate a ruleset');
  }
  const rs = await rulesetRepo.getById(id);
  if (!rs) throw ApiError.notFound('RULESET_NOT_FOUND', `Ruleset version ${id} not found`);

  // Fail loudly if the file-based ruleset is structurally broken.
  try {
    loadRuleset(rs.ruleset_id, rs.version);
  } catch (error) {
    throw ApiError.unprocessable('RULESET_INVALID', `Ruleset ${rs.ruleset_id}@${rs.version} failed to load: ${error.message}`);
  }

  return db.transaction(async (trx) => {
    await trx('ruleset_versions').where({ system: rs.system, level: rs.level, status: 'active' })
      .update({ status: 'retired', updated_at: trx.fn.now() });
    await trx('ruleset_versions').where({ id })
      .update({ status: 'active', board_ref: boardRef.trim(), activated_by: actor.id, activated_at: trx.fn.now(), updated_at: trx.fn.now() });
    return rulesetRepo.getById(id);
  });
}

/**
 * Resolves the active ruleset for a case's (system, level) → { rulesetId, version }.
 * Throws NO_ACTIVE_RULESET (loud) if none is active — the documented limit for
 * systems whose rules have not been authored/activated yet.
 */
async function resolveForCase(system, level = 'UG') {
  const active = await rulesetRepo.getActive(String(system || '').toLowerCase(), level || 'UG');
  if (!active) {
    throw ApiError.unprocessable('NO_ACTIVE_RULESET', `No active ruleset for ${system}/${level}. Activate one in Admin → Rulesets.`);
  }
  return { rulesetId: active.ruleset_id, version: active.version };
}

module.exports = { list, get, activate, resolveForCase };
