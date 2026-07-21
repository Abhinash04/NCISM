const institutionRepo = require('../repositories/institution.repository');
const { parseMasterData, ID_RE } = require('../utils/master-data.parser');
const ApiError = require('../utils/api-error');

function list(params) {
  return institutionRepo.list(params);
}

function facets() {
  return institutionRepo.facets();
}

async function get(id) {
  const row = await institutionRepo.getById(id);
  if (!row) throw ApiError.notFound('INSTITUTION_NOT_FOUND', `Institution ${id} not found`);
  return row;
}

async function create(data) {
  if (!data.institute_id || !ID_RE.test(String(data.institute_id).toUpperCase())) {
    throw ApiError.badRequest('VALIDATION_ERROR', 'valid institute_id required (AYU/UNI/SID/SWR####)');
  }
  const existing = await institutionRepo.getByInstituteId(String(data.institute_id).toUpperCase());
  if (existing) throw ApiError.conflict('INSTITUTION_EXISTS', `${data.institute_id} already exists`);
  return institutionRepo.create({ ...data, institute_id: String(data.institute_id).toUpperCase() });
}

async function update(id, data) {
  await get(id); // 404 if missing
  const { institute_id, id: _ignore, ...patch } = data;
  return institutionRepo.update(id, patch);
}

/**
 * Parses a markdown master table and upserts it. Malformed rows are returned
 * as `exceptions` rather than failing the whole import.
 */
async function importFromMarkdown(text) {
  const { rows, exceptions } = parseMasterData(text);
  const { inserted, updated } = await institutionRepo.bulkUpsert(rows);
  return { inserted, updated, parsed: rows.length, exceptions };
}

module.exports = { list, facets, get, create, update, importFromMarkdown };
