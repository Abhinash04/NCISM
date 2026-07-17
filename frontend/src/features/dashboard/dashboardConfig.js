/**
 * Role → dashboard layout. Each role lands on the work waiting for it, computed
 * from the already role-scoped case queue (`useApplications` → `queueFor`). KPIs
 * and queue groups are defined as status buckets so the dashboard needs no new
 * data source. Roles without an entry fall back to a generic status grouping.
 */

// Status buckets reused across roles.
const DECIDED = ['approved', 'rejected', 'closed'];
const IN_FLIGHT = ['processing', 'senior_review', 'board_review', 'clarification_open',
  'clarification_responded', 'hearing_requested', 'hearing_scheduled'];

export const DASHBOARD_CONFIG = {
  visitor: {
    title: 'My uploads',
    subtitle: 'Track the visitation reports you have submitted for assessment.',
    cta: { label: 'New upload', to: 'applications/new' },
    kpis: [
      { label: 'Uploaded', statuses: ['uploaded', 'failed'] },
      { label: 'In review', statuses: IN_FLIGHT },
      { label: 'Decided', statuses: DECIDED },
    ],
    groups: [
      { label: 'Awaiting processing', statuses: ['uploaded', 'failed'], hint: 'Assigned staff will process these.' },
      { label: 'In review', statuses: IN_FLIGHT },
      { label: 'Decided', statuses: DECIDED },
    ],
  },

  junior_consultant: {
    title: 'My case queue',
    subtitle: 'Colleges allotted to you across their assessment lifecycle.',
    kpis: [
      { label: 'To process', statuses: ['uploaded', 'failed'] },
      { label: 'To submit', statuses: ['processed', 'under_validation', 'clarification_responded'] },
      { label: 'Awaiting others', statuses: ['senior_review', 'board_review', 'clarification_open', 'hearing_requested', 'hearing_scheduled'] },
      { label: 'Decided', statuses: DECIDED },
    ],
    groups: [
      { label: 'To process', statuses: ['uploaded', 'failed'], hint: 'Run the engine on the uploaded report.' },
      { label: 'To submit', statuses: ['processed', 'under_validation', 'clarification_responded'], hint: 'Review the assessment, then submit for senior review.' },
      { label: 'In review / hearing', statuses: ['senior_review', 'board_review', 'clarification_open', 'hearing_requested', 'hearing_scheduled'] },
      { label: 'Decided', statuses: DECIDED },
    ],
  },

  senior_consultant: {
    title: 'Review queue',
    subtitle: 'Cases submitted by the dealing staff you supervise.',
    kpis: [
      { label: 'Awaiting review', statuses: ['senior_review'] },
      { label: 'Returned', statuses: ['under_validation'] },
      { label: 'With board', statuses: ['board_review', 'hearing_requested', 'hearing_scheduled'] },
      { label: 'Decided', statuses: DECIDED },
    ],
    groups: [
      { label: 'Awaiting your review', statuses: ['senior_review'], hint: 'Forward to the board or return to the junior.' },
      { label: 'Returned to junior', statuses: ['under_validation'] },
      { label: 'Forwarded', statuses: ['board_review', 'hearing_requested', 'hearing_scheduled', ...DECIDED] },
    ],
  },

  board_member: {
    title: 'Board queue',
    subtitle: 'Cases awaiting a board decision and those already decided.',
    kpis: [
      { label: 'Awaiting decision', statuses: ['board_review'] },
      { label: 'In hearing', statuses: ['hearing_requested', 'hearing_scheduled'] },
      { label: 'Decided', statuses: DECIDED },
    ],
    groups: [
      { label: 'Awaiting your decision', statuses: ['board_review'], hint: 'Approve, reject, request clarification or a hearing.' },
      { label: 'In hearing', statuses: ['hearing_requested', 'hearing_scheduled'] },
      { label: 'Decided', statuses: DECIDED },
    ],
  },
};

/** Fallback for roles without a tailored config: group by broad lifecycle stage. */
export const GENERIC_DASHBOARD = {
  title: 'Cases',
  subtitle: 'Cases visible to your role.',
  kpis: [
    { label: 'Open', statuses: ['uploaded', 'failed', ...IN_FLIGHT] },
    { label: 'Decided', statuses: DECIDED },
  ],
  groups: [
    { label: 'Awaiting action', statuses: ['uploaded', 'failed', ...IN_FLIGHT] },
    { label: 'Decided', statuses: DECIDED },
  ],
};
