// Deterministic, context-aware draft generators for the "AI Generate" buttons.
// They analyse the data already on screen (the assessment's punitive summary,
// the user's dropdown selections, meeting agenda) and assemble editable drafts.
// Letters/orders are drafted server-side via previewLetter (application.api).

const OUTCOME_LABELS = {
  grant: 'grant full permission',
  grant_with_conditions: 'grant permission with conditions',
  reduce_intake: 'grant permission with a reduced intake',
  deny: 'deny permission',
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function parseReport(app) {
  try {
    return typeof app?.report_json === 'string' ? JSON.parse(app.report_json) : app?.report_json;
  } catch {
    return null;
  }
}

function contributionsOf(app) {
  return parseReport(app)?.punitiveSummary?.contributions || [];
}

function shortcomingLines(app) {
  return contributionsOf(app).map((c) => {
    const seats = c.type !== 'denial' && c.seats ? ` (${c.seats} seats)` : '';
    return `- ${c.detail || 'Shortcoming noted'}${seats}`;
  });
}

export async function genHearingMinutes(app) {
  await delay(600);
  const lines = shortcomingLines(app);
  const body = lines.length
    ? `The committee reviewed the following assessed shortcomings:\n${lines.join('\n')}`
    : 'The committee reviewed the assessment report and the institution’s submission.';
  return [
    `Hearing convened for ${app.institution_name} (Inst. ID ${app.institute_id}).`,
    '',
    body,
    '',
    'Committee observation: ',
  ].join('\n');
}

export async function genDecisionNote(app, { outcome, seats } = {}) {
  await delay(600);
  const summary = parseReport(app)?.punitiveSummary;
  const label = OUTCOME_LABELS[outcome] || 'decide on the application';
  const parts = [`Based on the assessment report, the Board resolves to ${label}.`];
  if (outcome === 'reduce_intake' && seats !== '' && seats != null) {
    parts.push(`Approved intake: ${seats} seats.`);
  }
  const contribs = contributionsOf(app);
  if (summary?.totalSeatReduction) {
    parts.push(`Assessed deficiencies account for a total seat reduction of ${Math.round(summary.totalSeatReduction)} across ${contribs.length} finding(s).`);
  } else if (contribs.length) {
    parts.push(`Findings considered: ${contribs.length}.`);
  }
  return parts.join(' ');
}

export async function genPenaltyDescription(app, pType) {
  await delay(600);
  const details = contributionsOf(app).map((c) => c.detail).filter(Boolean);
  if (pType === 'teacher_code_revocation') {
    return details.length
      ? `Teacher-code revocation for faculty flagged during assessment: ${details.join('; ')}.`
      : 'Teacher-code revocation for faculty flagged as non-compliant during assessment.';
  }
  return details.length
    ? `Monetary penalty levied for assessed deficiencies: ${details.join('; ')}.`
    : 'Monetary penalty levied for non-compliance identified during the assessment.';
}

export async function genClarificationResponse(rounds = []) {
  await delay(600);
  const latest = rounds[rounds.length - 1];
  const ref = latest?.round ? ` (Round ${latest.round})` : '';
  return [
    `With reference to the clarification letter${ref}, the institution submits the following response:`,
    '',
    'Point-wise response to the shortcomings noted:',
    '1. ',
  ].join('\n');
}

export async function genMeetingMinutes(meeting) {
  await delay(600);
  const date = meeting.scheduled_at ? new Date(meeting.scheduled_at).toLocaleString() : 'Date not set';
  const items = (meeting.items || []).map((i, idx) =>
    `${idx + 1}. ${i.institute_id} · ${i.institution_name} — ${i.decision || 'decision pending'}`);
  return [
    `Minutes of Meeting ${meeting.number}`,
    `Date: ${date}`,
    '',
    'Agenda & decisions:',
    items.length ? items.join('\n') : 'No agenda items.',
    '',
    'Resolved: ',
  ].join('\n');
}
