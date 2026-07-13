/**
 * Punitive engine: maps findings to the Board-approved punitive policy,
 * annotates staff rows with their per-row punitive text (rendered in the
 * report tables), and aggregates all seat reductions.
 *
 * Aggregation follows the policy document: all deficiencies are added; if the
 * calculated seat reduction exceeds the denial threshold (50% of intake), or
 * any deficiency carries a "denial" consequence (AEBAS, empty teaching
 * department), the outcome is denial of permission.
 *
 * Interpretation note (handoff gap HG-02, unresolved with the client): the
 * policy says "for each deficient teaching faculty ... 5% of total intake
 * capacity". This engine reads that literally: seats = deficientFaculty x 5%
 * of intake. The per-row punitive text in the report stays "5 % seat
 * reduction" per department row, matching the reference reports.
 */
function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}

function applyTeaching(finding, entry, emptyDeptEntry, intake, contributions) {
  let deficientTotal = 0;
  for (const row of finding.rows) {
    if (row.zeroFaculty) {
      row.punitiveText = 'Seat reduction not applicable';
      contributions.push({
        policyKey: 'teaching-department-empty',
        type: 'denial',
        seats: 0,
        detail: `Department "${row.dept}" has no teaching faculty`,
      });
    } else if (row.deficientCount > 0) {
      row.punitiveText = '5 % seat reduction';
      deficientTotal += row.deficientCount;
    } else {
      row.punitiveText = '';
    }
  }

  if (deficientTotal > 0) {
    const seats = (deficientTotal * entry.percentPerDeficient / 100) * intake;
    contributions.push({
      policyKey: 'teaching-faculty',
      type: entry.type,
      seats,
      detail: `${deficientTotal} deficient teaching faculty x ${entry.percentPerDeficient}% of ${intake} seats`,
    });
  }
}

function applyRoster(finding, entry, contributions) {
  for (const row of finding.rows) {
    if (row.shortfall <= 0) {
      row.punitiveText = 'No seat reduction';
      continue;
    }

    const match = (entry.table || []).find((t) =>
      String(row.post).toLowerCase().includes(t.postMatch.toLowerCase())
    );

    const seats = match ? Math.floor(row.shortfall / match.perDeficient) * match.seats : (entry.default?.seats ?? 0);

    row.punitiveText = seats > 0 ? `${pad2(seats)} seat reduction` : 'No seat reduction';

    if (seats > 0) {
      contributions.push({
        policyKey: finding.punitive.policyKey,
        type: entry.type,
        seats,
        detail: `${row.post}: ${row.shortfall} deficient`,
      });
    }
  }
}

function applyThreshold(finding, entry, intake, contributions) {
  if (finding.status !== 'fail') return;

  let seats = 0;
  let detail = '';

  switch (entry.type) {
    case 'seat-reduction-fixed':
      seats = entry.seats;
      detail = finding.title;
      break;
    case 'seat-reduction-per-deficiency-percent': {
      const deficiencyPercent = finding.expected > 0
        ? Math.max(0, ((finding.expected - finding.actual) / finding.expected) * 100)
        : 0;
      seats = Math.floor(deficiencyPercent / entry.perDeficiencyPercent) * entry.seats;
      detail = `${finding.title}: ${deficiencyPercent.toFixed(2)}% deficiency`;
      break;
    }
    case 'seat-reduction-percent-of-intake':
      seats = (entry.percent / 100) * intake;
      detail = finding.title;
      break;
    case 'denial':
      contributions.push({ policyKey: finding.punitive.policyKey, type: 'denial', seats: 0, detail: finding.title });
      return;
    default:
      return;
  }

  if (seats > 0) {
    contributions.push({ policyKey: finding.punitive.policyKey, type: entry.type, seats, detail });
  }
}

/**
 * @param {Object} args
 * @param {Array}  args.findings - evaluator output (rows are annotated in place with punitiveText)
 * @param {number} args.intake
 * @param {Object} args.policy   - punitive policy JSON
 * @returns {{contributions: Array, totalSeatReduction: number, percentOfIntake: number, outcome: string}}
 */
function apply({ findings, intake, policy }) {
  const contributions = [];

  for (const finding of findings) {
    const policyKey = finding.punitive?.policyKey;

    if (finding.rows && policyKey === 'teaching-faculty') {
      applyTeaching(finding, policy.entries['teaching-faculty'], policy.entries['teaching-department-empty'], intake, contributions);
    } else if (finding.rows && policyKey) {
      applyRoster(finding, policy.entries[policyKey], contributions);
    } else if (policyKey && policy.entries[policyKey]) {
      applyThreshold(finding, policy.entries[policyKey], intake, contributions);
    }
  }

  const totalSeatReduction = Math.round(contributions.reduce((sum, c) => sum + c.seats, 0) * 100) / 100;
  const percentOfIntake = intake > 0 ? Math.round((totalSeatReduction / intake) * 10000) / 100 : 0;

  const hasDenial = contributions.some((c) => c.type === 'denial');
  const overThreshold = percentOfIntake > policy.aggregation.denialThresholdPercentOfIntake;

  const outcome = hasDenial || overThreshold
    ? 'denial'
    : totalSeatReduction > 0
      ? 'seat-reduction'
      : 'compliant';

  return { contributions, totalSeatReduction, percentOfIntake, outcome };
}

module.exports = { apply };
