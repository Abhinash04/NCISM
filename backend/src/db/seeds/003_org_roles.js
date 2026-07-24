const ORG_ROLES = [
  { key: 'president', name: 'President (MARB-ISM)', description: 'Apex competent authority: appointments, final approvals, oversight.' },
  { key: 'board_member', name: 'Board Member (MARB-ISM)', description: 'Reviews/finalizes assessments; signs outbound letters; decides in Board.' },
  { key: 'senior_consultant', name: 'Senior Consultant', description: 'Supervises dealing staff; verifies assessment computations; quality control.' },
  { key: 'consultant', name: 'Consultant (Dealing Staff)', description: 'Processes allotted colleges: scrutiny, drafting, rules run.' },
];

// Reuse existing permission keys (defined in 001_rbac.js).
const CONSULTANT = [
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
  consultant: CONSULTANT,
  senior_consultant: SENIOR,
  board_member: BOARD,
  president: BOARD,
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
