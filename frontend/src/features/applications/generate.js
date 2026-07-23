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

export async function genForwardNote(app) {
  await delay(400);
  const summary = parseReport(app)?.punitiveSummary;
  const contribs = contributionsOf(app);
  const lines = [`Forwarding case for ${app.institution_name} (Inst. ID ${app.institute_id}) to the Board for review and decision.`];

  if (summary?.outcome === 'denial') {
    lines.push('Assessment outcome indicates Denial of Permission due to major deficiencies.');
  } else if (summary?.totalSeatReduction > 0) {
    lines.push(`Assessment outcome indicates a recommended seat reduction of ${Math.round(summary.totalSeatReduction)} seats.`);
  } else {
    lines.push('Assessment indicates full compliance with MESAR regulations.');
  }

  if (contribs.length > 0) {
    lines.push(`Key findings noted: ${contribs.length} item(s).`);
  }
  return lines.join(' ');
}

export async function genReturnNote(app) {
  await delay(400);
  return `Case returned to the Consultant for re-examination of assessment findings and verification of supporting records for ${app.institution_name} (${app.institute_id}).`;
}

export async function genRejectNote(app) {
  await delay(400);
  const lines = shortcomingLines(app);
  const body = lines.length
    ? `The application is proposed for rejection due to the following non-rectifiable/unresolved deficiencies:\n${lines.join('\n')}`
    : 'The application is proposed for rejection based on the assessment findings.';

  return [
    `Rejection proposal for ${app.institution_name} (Inst. ID ${app.institute_id}).`,
    '',
    body,
    '',
    'Reason for rejection: ',
  ].join('\n');
}

export async function genHearingRequest(app) {
  await delay(400);
  const lines = shortcomingLines(app);
  return [
    `Requesting a hearing before the Hearing Committee for ${app.institution_name} (Inst. ID ${app.institute_id}).`,
    '',
    `Unresolved shortcomings requiring hearing:\n${lines.length ? lines.join('\n') : '- Deficiencies identified in assessment report'}`,
    '',
    'Rationale: The institution must be provided natural justice/opportunity of hearing before any final order of seat reduction or denial is issued under MESAR regulations.',
  ].join('\n');
}

export async function genClarificationReview(rounds = []) {
  await delay(400);
  const latest = rounds[rounds.length - 1];
  const ref = latest?.round ? `Round ${latest.round}` : 'latest round';
  const text = latest?.response_text || 'Supporting documents submitted by college';

  return [
    `Reviewed clarification submitted by college for ${ref}.`,
    '',
    `Submitted response summary: ${text.slice(0, 200)}${text.length > 200 ? '...' : ''}`,
    latest?.response_file ? `Attached Document: ${latest.response_file}` : 'No supporting file attached.',
    '',
    'Observation: ',
  ].join('\n');
}

export async function genHearingMinutes(app) {
  await delay(400);
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
  await delay(400);
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

export async function genPenaltyDescription(app, pType, ghostCount = 1, rate = 2500000) {
  await delay(400);
  const details = contributionsOf(app).map((c) => c.detail).filter(Boolean);
  if (pType === 'teacher_code_revocation') {
    return details.length
      ? `Teacher-code revocation for faculty flagged during assessment: ${details.join('; ')}.`
      : 'Teacher-code revocation for faculty flagged as non-compliant during assessment.';
  }
  const count = parseInt(ghostCount, 10) || 1;
  const perFaculty = Number(rate) || 2500000;
  const totalFine = (count * perFaculty).toLocaleString('en-IN');
  return `Monetary penalty of ₹${totalFine} levied for ${count} Ghost Faculty identified during assessment (${details.length ? details.join('; ') : 'non-compliant on-paper faculty'}).`;
}

export async function genClarificationResponse(rounds = []) {
  await delay(400);
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
  await delay(400);
  const date = meeting.scheduled_at ? new Date(meeting.scheduled_at).toLocaleString() : 'Date not set';
  const items = (meeting.items || []).map((i, idx) => {
    let desc = `${idx + 1}. ${i.institute_id} · ${i.institution_name} — ${i.decision || 'decision pending'}`;
    if (i.item_decision) desc += ` [Decision: ${i.item_decision}]`;
    if (i.discussion_notes) desc += `\n   Discussion: ${i.discussion_notes}`;
    return desc;
  });

  const parts = [
    `Minutes of Board Meeting ${meeting.number}`,
    `Date & Time: ${date}`,
    meeting.participants ? `Participants: ${meeting.participants}` : 'Participants: Secretariat & Board Members',
    '',
    'Overall Agenda:',
    meeting.agenda_text || 'Standard MARB Board Meeting Agenda.',
    '',
    'Applications Discussed & Decisions:',
    items.length ? items.join('\n') : 'No agenda items.',
  ];

  if (meeting.observations) {
    parts.push('', 'Board Observations:', meeting.observations);
  }
  if (meeting.action_items) {
    parts.push('', 'Action Items:', meeting.action_items);
  }
  if (meeting.recommendations) {
    parts.push('', 'Recommendations:', meeting.recommendations);
  }

  parts.push('', 'Resolved: That the decisions above are approved and minutes hereby confirmed.');
  return parts.join('\n');
}
