/**
 * Adds the MARB-ISM org role tiers on top of the Phase-1 roles (admin/reviewer/
 * analyst/viewer, which are kept so existing code/tests keep working). Fine-
 * grained lifecycle permissions (review/hearing/letters/board) arrive in Phase 3;
 * here each org role reuses the existing permission catalogue. Idempotent.
 */

const ORG_ROLES = [
  { key: 'president', name: 'President (MARB-ISM)', description: 'Apex competent authority: appointments, final approvals, oversight.' },
  { key: 'board_member', name: 'Board Member (MARB-ISM)', description: 'Reviews/finalizes assessments; signs outbound letters; decides in Board.' },
  { key: 'senior_consultant', name: 'Senior Consultant', description: 'Supervises dealing staff; verifies assessment computations; quality control.' },
  { key: 'junior_consultant', name: 'Consultant (Dealing Staff)', description: 'Processes allotted colleges: scrutiny, drafting, rules run.' },
];

// Reuse existing permission keys (defined in 001_rbac.js).
const JUNIOR = [
  'assessment:read', 'assessment:create', 'assessment:update', 'assessment:submit', 'assessment:reprocess',
  'issue:read', 'issue:resolve', 'institution:read', 'ruleset:read', 'report:read', 'audit:read',
];
const SENIOR = [
  'assessment:read', 'assessment:update', 'issue:read', 'institution:read', 'ruleset:read', 'report:read', 'audit:read',
];
const BOARD = [
  'assessment:read', 'assessment:approve', 'assessment:reject', 'assessment:archive',
  'issue:read', 'institution:read', 'ruleset:read', 'report:read', 'audit:read',
];

const ROLE_PERMS = {
  junior_consultant: JUNIOR,
  senior_consultant: SENIOR,
  board_member: BOARD,
  president: BOARD, // hearing-appoint/approve perms added in Phase 3
};

exports.seed = async function seed(knex) {
  await knex('roles')
    .insert(ORG_ROLES.map((r) => ({ ...r })))
    .onConflict('key').merge(['name', 'description']);

  const rows = [];
  for (const [role_key, perms] of Object.entries(ROLE_PERMS)) {
    for (const permission_key of perms) rows.push({ role_key, permission_key });
  }
  await knex('role_permissions').insert(rows).onConflict(['role_key', 'permission_key']).ignore();
};
