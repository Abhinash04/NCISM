/**
 * Seeds the 4 internal roles and the permission catalogue + role→permission
 * mapping (the coarse capability layer of §2 in the blueprint). Ownership and
 * workflow-state constraints are applied on top by the workflow-guard service.
 * Idempotent (onConflict merge/ignore), so safe to re-run.
 */

const ROLES = [
  { key: 'admin', name: 'Administrator', description: 'Users, roles, master data, config, audit. No business approval.' },
  { key: 'reviewer', name: 'Reviewer', description: 'Reviews validated assessments; approves/rejects/archives.' },
  { key: 'analyst', name: 'Analyst', description: 'Uploads, validates, resolves extraction issues, submits for review.' },
  { key: 'viewer', name: 'Viewer', description: 'Read-only across assessments, reports, audit.' },
];

// resource:action catalogue
const PERMS = [
  ['institution:create', 'institution', 'create'],
  ['institution:read', 'institution', 'read'],
  ['institution:update', 'institution', 'update'],
  ['institution:delete', 'institution', 'delete'],
  ['assessment:read', 'assessment', 'read'],
  ['assessment:create', 'assessment', 'create'],
  ['assessment:update', 'assessment', 'update'],
  ['assessment:submit', 'assessment', 'submit'],
  ['assessment:approve', 'assessment', 'approve'],
  ['assessment:reject', 'assessment', 'reject'],
  ['assessment:archive', 'assessment', 'archive'],
  ['assessment:reprocess', 'assessment', 'reprocess'],
  ['issue:read', 'issue', 'read'],
  ['issue:resolve', 'issue', 'resolve'],
  ['user:manage', 'user', 'manage'],
  ['role:read', 'role', 'read'],
  ['ruleset:read', 'ruleset', 'read'],
  ['ruleset:create', 'ruleset', 'create'],
  ['ruleset:activate', 'ruleset', 'activate'],
  ['report:read', 'report', 'read'],
  ['audit:read', 'audit', 'read'],
];

const ROLE_PERMS = {
  admin: [
    'institution:create', 'institution:read', 'institution:update', 'institution:delete',
    'assessment:read', 'issue:read',
    'user:manage', 'role:read',
    'ruleset:read', 'ruleset:create', 'ruleset:activate',
    'report:read', 'audit:read',
  ],
  reviewer: [
    'assessment:read', 'assessment:approve', 'assessment:reject', 'assessment:archive',
    'issue:read', 'institution:read', 'ruleset:read', 'report:read', 'audit:read',
  ],
  analyst: [
    'assessment:read', 'assessment:create', 'assessment:update', 'assessment:submit', 'assessment:reprocess',
    'issue:read', 'issue:resolve', 'institution:read', 'ruleset:read', 'report:read', 'audit:read',
  ],
  viewer: [
    'assessment:read', 'issue:read', 'institution:read', 'report:read', 'audit:read',
  ],
};

exports.seed = async function seed(knex) {
  await knex('roles')
    .insert(ROLES.map((r) => ({ ...r })))
    .onConflict('key').merge(['name', 'description']);

  await knex('permissions')
    .insert(PERMS.map(([key, resource, action]) => ({ key, resource, action })))
    .onConflict('key').merge(['resource', 'action']);

  const rows = [];
  for (const [role_key, perms] of Object.entries(ROLE_PERMS)) {
    for (const permission_key of perms) rows.push({ role_key, permission_key });
  }
  await knex('role_permissions').insert(rows).onConflict(['role_key', 'permission_key']).ignore();
};
