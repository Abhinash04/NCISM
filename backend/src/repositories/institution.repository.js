const { db } = require('../db');

const COLUMNS = [
  'id', 'institute_id', 'system', 'state', 'name',
  'file_number', 'email', 'contact', 'status', 'source',
  'created_at', 'updated_at',
];

/**
 * Filtered + paginated list. `q` matches name / institute_id / file_number.
 * Returns `{ rows, total, page, limit }`.
 */
async function list({ system, state, q, page = 1, limit = 25 } = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(1000, Math.max(1, parseInt(limit, 10) || 25));

  const base = db('institutions');
  if (system) base.where({ system });
  if (state) base.where({ state });
  if (q) {
    base.where((b) => {
      b.whereILike('name', `%${q}%`)
        .orWhereILike('institute_id', `%${q}%`)
        .orWhereILike('file_number', `%${q}%`);
    });
  }

  const countQuery = base.clone().count({ count: '*' }).first();
  const rowsQuery = base.clone()
    .select(COLUMNS)
    .orderBy('institute_id')
    .limit(l)
    .offset((p - 1) * l);

  const [{ count }, rows] = await Promise.all([countQuery, rowsQuery]);
  return { rows, total: Number(count), page: p, limit: l };
}

/** Distinct systems + states actually present (drives the UI filters honestly). */
async function facets() {
  const [systems, states] = await Promise.all([
    db('institutions').distinct('system').orderBy('system').pluck('system'),
    db('institutions').distinct('state').orderBy('state').pluck('state'),
  ]);
  return { systems, states };
}

function getById(id) {
  return db('institutions').where({ id }).first(COLUMNS);
}

function getByInstituteId(instituteId) {
  return db('institutions').where({ institute_id: instituteId }).first(COLUMNS);
}

/**
 * Upserts parsed rows keyed on institute_id. Returns `{ inserted, updated }`
 * (best-effort split via a pre-count of existing ids).
 */
async function bulkUpsert(rows) {
  if (!rows.length) return { inserted: 0, updated: 0 };

  const ids = rows.map((r) => r.instituteId);
  const existing = await db('institutions').whereIn('institute_id', ids).pluck('institute_id');
  const existingSet = new Set(existing);

  const records = rows.map((r) => ({
    institute_id: r.instituteId,
    system: r.system,
    state: r.state,
    name: r.name,
    file_number: r.fileNumber,
    email: r.email,
    contact: r.contact,
  }));

  await db('institutions')
    .insert(records)
    .onConflict('institute_id')
    .merge(['system', 'state', 'name', 'file_number', 'email', 'contact', 'updated_at']);

  const updated = existingSet.size;
  return { inserted: records.length - updated, updated };
}

async function create(data) {
  const [row] = await db('institutions').insert(data).returning(COLUMNS);
  return row;
}

async function update(id, data) {
  const [row] = await db('institutions')
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning(COLUMNS);
  return row;
}

module.exports = { list, facets, getById, getByInstituteId, bulkUpsert, create, update };
