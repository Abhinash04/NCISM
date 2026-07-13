/**
 * Numeric threshold check.
 *
 * Expected value resolves from check.expected.value or
 * check.expected.byIntake[intake]. An optional tolerance
 * ({ type: 'percentOfExpected', value: N }) relaxes the pass boundary the way
 * the legacy assessment did (e.g. lecture-hall area passes at 80% of the
 * requirement) while the reported shortfall stays relative to the full
 * requirement.
 */
function resolveExpected(rule, intake) {
  const exp = rule.check.expected;
  if (exp.value !== undefined) return exp.value;
  const byIntake = exp.byIntake[String(intake)];
  if (byIntake === undefined) {
    throw new Error(`Rule ${rule.id}: no expected value for intake ${intake} (supported: ${Object.keys(exp.byIntake).join(', ')})`);
  }
  return byIntake;
}

function evaluate(rule, param, context) {
  const expected = resolveExpected(rule, context.intake);

  if (!param || param.status !== 'found' || param.value === null || param.value === undefined) {
    return { status: 'insufficient-data', expected };
  }

  const actual = Number(param.value);
  if (Number.isNaN(actual)) {
    return { status: 'insufficient-data', expected };
  }

  let boundary = expected;
  const tolerance = rule.check.tolerance;
  if (tolerance && tolerance.type === 'percentOfExpected') {
    if (rule.check.operator === '>=') boundary = expected * (1 - tolerance.value / 100);
    if (rule.check.operator === '<=') boundary = expected * (1 + tolerance.value / 100);
  }

  let pass;
  switch (rule.check.operator) {
    case '>=': pass = actual >= boundary; break;
    case '<=': pass = actual <= boundary; break;
    case '==': pass = actual === boundary; break;
    default: throw new Error(`Rule ${rule.id}: unknown operator ${rule.check.operator}`);
  }

  const shortfall = rule.check.operator === '>=' ? Math.max(0, expected - actual) : 0;

  return { status: pass ? 'pass' : 'fail', actual, expected, shortfall };
}

module.exports = { evaluate };
