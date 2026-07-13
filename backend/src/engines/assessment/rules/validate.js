const KNOWN_CHECK_TYPES = ['threshold', 'boolean', 'staff-table', 'staff-roster', 'custom'];

function fail(context, message) {
  throw new Error(`[ruleset:${context}] ${message}`);
}

function validateRule(rule, rulesetId) {
  const ctx = `${rulesetId}/${rule.id || '<no id>'}`;
  if (!rule.id) fail(rulesetId, 'rule missing "id"');
  if (!rule.category) fail(ctx, 'rule missing "category"');
  if (!rule.parameter) fail(ctx, 'rule missing "parameter"');
  if (!rule.check || typeof rule.check !== 'object') fail(ctx, 'rule missing "check"');
  if (!KNOWN_CHECK_TYPES.includes(rule.check.type)) {
    fail(ctx, `unknown check.type "${rule.check.type}" (known: ${KNOWN_CHECK_TYPES.join(', ')})`);
  }
  if (!rule.report || typeof rule.report.order !== 'number') fail(ctx, 'rule missing "report.order"');

  if (rule.check.type === 'threshold') {
    if (!['>=', '<=', '=='].includes(rule.check.operator)) fail(ctx, `invalid threshold operator "${rule.check.operator}"`);
    const exp = rule.check.expected;
    if (!exp || (exp.value === undefined && !exp.byIntake)) fail(ctx, 'threshold check needs expected.value or expected.byIntake');
    if (!rule.report.pass || !rule.report.fail || !rule.report.missing) fail(ctx, 'threshold rule needs report.pass/fail/missing texts');
  }

  if (rule.check.type === 'boolean') {
    if (typeof rule.check.expected !== 'boolean') fail(ctx, 'boolean check needs boolean "expected"');
    if (!rule.report.pass || !rule.report.fail || !rule.report.missing) fail(ctx, 'boolean rule needs report.pass/fail/missing texts');
  }

  if (rule.check.type === 'staff-table') {
    const groups = rule.check.gradeGroups;
    if (!groups || !Array.isArray(groups.HF) || !Array.isArray(groups.LF)) {
      fail(ctx, 'staff-table check needs gradeGroups.HF and gradeGroups.LF arrays');
    }
  }
}

function validatePolicy(policy, rulesetId) {
  if (!policy.entries || typeof policy.entries !== 'object') fail(rulesetId, 'punitive policy missing "entries"');
  if (!policy.aggregation || typeof policy.aggregation.denialThresholdPercentOfIntake !== 'number') {
    fail(rulesetId, 'punitive policy missing aggregation.denialThresholdPercentOfIntake');
  }
}

/**
 * Structural validation of a loaded ruleset. Throws on the first problem so a
 * malformed ruleset fails at boot rather than mid-assessment.
 */
function validateRuleset({ manifest, rules, punitivePolicy }) {
  if (!manifest.id || !manifest.version) fail('<manifest>', 'ruleset.json needs "id" and "version"');
  if (!Array.isArray(manifest.supportedIntakes) || manifest.supportedIntakes.length === 0) {
    fail(manifest.id, 'ruleset.json needs a non-empty "supportedIntakes" array');
  }

  const seen = new Set();
  for (const rule of rules) {
    validateRule(rule, manifest.id);
    if (seen.has(rule.id)) fail(manifest.id, `duplicate rule id "${rule.id}"`);
    seen.add(rule.id);

    // Every punitive policyKey referenced by a rule must exist in the policy.
    const keys = [rule.punitive?.policyKey, ...(rule.punitive?.special || []).map((s) => s.policyKey)];
    for (const key of keys) {
      if (key && !punitivePolicy.entries[key]) {
        fail(`${manifest.id}/${rule.id}`, `punitive policyKey "${key}" not found in punitive policy`);
      }
    }
  }

  validatePolicy(punitivePolicy, manifest.id);
}

module.exports = { validateRuleset };
