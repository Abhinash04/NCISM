const { db } = require('../db');

const FIELDS = [
  'ruleset_versions.id', 'ruleset_versions.ruleset_id', 'ruleset_versions.version',
  'ruleset_versions.system', 'ruleset_versions.level', 'ruleset_versions.title',
  'ruleset_versions.status', 'ruleset_versions.effective_session', 'ruleset_versions.board_ref',
  'ruleset_versions.supported_intakes', 'ruleset_versions.dir_path',
  'ruleset_versions.activated_by', 'ruleset_versions.activated_at',
  'ruleset_versions.created_at', 'ruleset_versions.updated_at',
];

function baseQuery() {
  return db('ruleset_versions')
    .leftJoin('users as ab', 'ruleset_versions.activated_by', 'ab.id')
    .select(FIELDS)
    .select('ab.name as activated_by_name');
}

function list() {
  return baseQuery().orderBy(['ruleset_versions.system', 'ruleset_versions.level', 'ruleset_versions.version']);
}

function getById(id) {
  return baseQuery().where('ruleset_versions.id', id).first();
}

/** The active ruleset for a (system, level), or undefined. */
function getActive(system, level) {
  return baseQuery()
    .where({ 'ruleset_versions.system': system, 'ruleset_versions.level': level, 'ruleset_versions.status': 'active' })
    .first();
}

async function update(id, patch) {
  await db('ruleset_versions').where({ id }).update({ ...patch, updated_at: db.fn.now() });
  return getById(id);
}

/** Retire the current active for a (system, level) so a new one can activate. */
function retireActive(system, level) {
  return db('ruleset_versions')
    .where({ system, level, status: 'active' })
    .update({ status: 'retired', updated_at: db.fn.now() });
}

module.exports = { list, getById, getActive, update, retireActive };
