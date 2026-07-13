const test = require('node:test');
const assert = require('node:assert');

const { loadRuleset, listRulesets } = require('../src/engines/assessment/rules/loader');

test('every shipped ruleset loads and passes structural validation', () => {
  const rulesets = listRulesets();
  assert.ok(rulesets.length >= 1, 'expected at least one ruleset in data/rulesets');

  for (const { id, version } of rulesets) {
    const ruleset = loadRuleset(id, version); // throws on structural problems
    assert.ok(ruleset.rules.length > 0, `${id}@${version} has no rules`);
    assert.ok(ruleset.punitivePolicy.entries, `${id}@${version} has no punitive policy entries`);
  }
});
