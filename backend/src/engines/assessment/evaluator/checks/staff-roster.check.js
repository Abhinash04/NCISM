/**
 * Simple per-post staff roster check (non-teaching / hospital staff).
 *
 * Parameter value shape:
 *   { rows: [{ dept?, post, required, existing }], total, absent }
 * Rows list only the posts the assessors recorded; the shortfall for each is
 * required - existing.
 */
function evaluate(rule, param) {
  if (!param || param.status !== 'found' || !param.value || !Array.isArray(param.value.rows)) {
    return { status: 'insufficient-data' };
  }

  const rows = param.value.rows.map((row) => ({
    dept: row.dept ?? null,
    post: row.post,
    required: row.required,
    existing: row.existing,
    shortfall: Math.max(0, (row.required ?? 0) - (row.existing ?? 0)),
  }));

  const anyDeficiency = rows.some((r) => r.shortfall > 0);

  return {
    status: anyDeficiency ? 'fail' : 'pass',
    rows,
    total: param.value.total ?? null,
    absent: param.value.absent ?? null,
  };
}

module.exports = { evaluate };
