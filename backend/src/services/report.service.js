/**
 * Phase 5b — reports / analytics. Read-only aggregations over existing tables
 * (applications, application_events, penalties, institutions). No schema change;
 * every figure is a Knex group-by. Punitive figures are meaningful mainly for
 * Ayurveda cases (the only ruleset that processes today).
 */

const { db } = require('../db');

const DECIDED = ['approved', 'rejected', 'closed'];
const OPEN_EXCLUDE = ['approved', 'rejected', 'closed', 'failed'];

function toCounts(rows, keyCol, valCol = 'count') {
  return rows.map((r) => ({ key: r[keyCol] == null ? 'unspecified' : r[keyCol], count: Number(r[valCol]) }));
}

/** Headline KPIs + status/outcome/compliance distributions. */
async function summary() {
  const [{ total }] = await db('applications').count({ total: '*' });
  const byStatus = await db('applications').select('status').count({ count: '*' }).groupBy('status');
  const byOutcome = await db('applications').whereNotNull('outcome').select('outcome').count({ count: '*' }).groupBy('outcome');
  const byCompliance = await db('applications').whereNotNull('compliance_status')
    .select('compliance_status').count({ count: '*' }).groupBy('compliance_status');

  const [{ decided }] = await db('applications').whereIn('status', DECIDED).count({ decided: '*' });
  const [{ avg_days }] = await db('applications')
    .whereIn('status', DECIDED)
    .select(db.raw('AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) AS avg_days'));

  const [{ complied }] = await db('applications').where('compliance_status', 'complied').count({ complied: '*' });
  const [{ monitoring }] = await db('applications').where('compliance_status', 'monitoring').count({ monitoring: '*' });

  const [{ seat_reduction_total }] = await db('penalties')
    .where('type', 'seat_reduction').sum({ seat_reduction_total: 'seats' });
  const [{ monetary_total }] = await db('penalties')
    .where('type', 'monetary').sum({ monetary_total: 'amount' });

  return {
    totalCases: Number(total),
    decidedCases: Number(decided),
    avgDaysToDecision: avg_days == null ? null : Math.round(Number(avg_days) * 10) / 10,
    seatReductionTotal: Number(seat_reduction_total) || 0,
    monetaryTotal: Number(monetary_total) || 0,
    complianceComplied: Number(complied),
    complianceMonitoring: Number(monitoring),
    byStatus: toCounts(byStatus, 'status'),
    byOutcome: toCounts(byOutcome, 'outcome'),
    byCompliance: toCounts(byCompliance, 'compliance_status'),
  };
}

/** Approvals per month (from the transition timeline) + open vs decided counts. */
async function throughput() {
  const perMonth = await db('application_events')
    .where('to_state', 'approved')
    .select(db.raw("to_char(date_trunc('month', created_at), 'YYYY-MM') AS month"))
    .count({ count: '*' })
    .groupByRaw("date_trunc('month', created_at)")
    .orderByRaw("date_trunc('month', created_at)");

  const [{ open }] = await db('applications').whereNotIn('status', OPEN_EXCLUDE).count({ open: '*' });
  const [{ decided }] = await db('applications').whereIn('status', DECIDED).count({ decided: '*' });

  return {
    approvalsPerMonth: perMonth.map((r) => ({ key: r.month, count: Number(r.count) })),
    openCases: Number(open),
    decidedCases: Number(decided),
  };
}

/** Case counts grouped by system of medicine, split by decided/open. */
async function bySystem() {
  const rows = await db('applications')
    .select('system')
    .count({ total: '*' })
    .select(db.raw(`COUNT(*) FILTER (WHERE status = ANY(?)) AS decided`, [DECIDED]))
    .select(db.raw(`COUNT(*) FILTER (WHERE outcome = 'deny') AS denied`))
    .groupBy('system')
    .orderBy('total', 'desc');
  return rows.map((r) => ({
    system: r.system, total: Number(r.total), decided: Number(r.decided), denied: Number(r.denied),
  }));
}

/** Penalty ledger grouped by type × status with summed seats/amount. */
async function penaltiesBreakdown() {
  const rows = await db('penalties')
    .select('type', 'status')
    .count({ count: '*' })
    .sum({ seats: 'seats' })
    .sum({ amount: 'amount' })
    .groupBy('type', 'status')
    .orderBy(['type', 'status']);
  return rows.map((r) => ({
    type: r.type, status: r.status, count: Number(r.count),
    seats: Number(r.seats) || 0, amount: Number(r.amount) || 0,
  }));
}

/** Institutions ranked by penalty count + total seat reduction. */
async function topInstitutions(limit = 10) {
  const rows = await db('penalties')
    .join('applications', 'penalties.application_id', 'applications.id')
    .join('institutions', 'applications.institution_id', 'institutions.id')
    .select('institutions.name as institution_name', 'institutions.institute_id')
    .count({ penalty_count: 'penalties.id' })
    .sum({ seat_reduction: 'penalties.seats' })
    .sum({ monetary: 'penalties.amount' })
    .groupBy('institutions.id', 'institutions.name', 'institutions.institute_id')
    .orderByRaw('COUNT(penalties.id) DESC, SUM(penalties.seats) DESC NULLS LAST')
    .limit(limit);
  return rows.map((r) => ({
    institutionName: r.institution_name, instituteId: r.institute_id,
    penaltyCount: Number(r.penalty_count),
    seatReduction: Number(r.seat_reduction) || 0,
    monetary: Number(r.monetary) || 0,
  }));
}

async function overview() {
  const [s, t, sys, pen, top] = await Promise.all([
    summary(), throughput(), bySystem(), penaltiesBreakdown(), topInstitutions(),
  ]);
  return { summary: s, throughput: t, bySystem: sys, penalties: pen, topInstitutions: top };
}

// ---- CSV export ------------------------------------------------------------

function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers, rows) {
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  return lines.join('\r\n');
}

async function exportCsv(dataset) {
  if (dataset === 'penalties') {
    const rows = await db('penalties')
      .join('applications', 'penalties.application_id', 'applications.id')
      .join('institutions', 'applications.institution_id', 'institutions.id')
      .orderBy('penalties.created_at', 'desc')
      .select(
        'institutions.institute_id', 'institutions.name as institution_name',
        'applications.system', 'penalties.type', 'penalties.status', 'penalties.source',
        'penalties.seats', 'penalties.amount', 'penalties.description', 'penalties.created_at',
      );
    return toCsv(
      ['institute_id', 'institution', 'system', 'type', 'status', 'source', 'seats', 'amount', 'description', 'created_at'],
      rows.map((r) => [r.institute_id, r.institution_name, r.system, r.type, r.status, r.source, r.seats, r.amount, r.description, r.created_at]),
    );
  }

  // dataset === 'cases' (default)
  const rows = await db('applications')
    .join('institutions', 'applications.institution_id', 'institutions.id')
    .orderBy('applications.created_at', 'desc')
    .select(
      'institutions.institute_id', 'institutions.name as institution_name',
      'applications.system', 'applications.state', 'applications.session', 'applications.status',
      'applications.outcome', 'applications.approved_seats', 'applications.compliance_status',
      'applications.created_at', 'applications.updated_at',
    );
  return toCsv(
    ['institute_id', 'institution', 'system', 'state', 'session', 'status', 'outcome', 'approved_seats', 'compliance_status', 'created_at', 'updated_at'],
    rows.map((r) => [r.institute_id, r.institution_name, r.system, r.state, r.session, r.status, r.outcome, r.approved_seats, r.compliance_status, r.created_at, r.updated_at]),
  );
}

module.exports = { summary, throughput, bySystem, penaltiesBreakdown, topInstitutions, overview, exportCsv };
