function evaluate(rule, param) {
  if (!param || param.status !== 'found' || param.value === null || param.value === undefined) {
    return { status: 'insufficient-data', expected: rule.check.expected };
  }

  const pass = Boolean(param.value) === rule.check.expected;
  return { status: pass ? 'pass' : 'fail', actual: Boolean(param.value), expected: rule.check.expected };
}

module.exports = { evaluate };
