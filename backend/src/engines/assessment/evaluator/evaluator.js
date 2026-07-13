const { getHandler } = require('./checks');

function renderText(template, values) {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = values[key];
    if (v === undefined || v === null) return `{${key}}`;
    return typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2) : String(v);
  });
}

/**
 * Evaluates every rule against the extracted parameters.
 *
 * @param {Object} args
 * @param {Array}  args.rules       - rule definitions from the ruleset
 * @param {Object} args.parameters  - ParameterSet: { [name]: {value, status, source?} }
 * @param {number} args.intake      - sanctioned intake capacity
 * @returns {Array} findings
 */
function evaluate({ rules, parameters, intake }) {
  const findings = [];

  for (const rule of rules) {
    const param = parameters[rule.parameter];
    const handler = getHandler(rule.check.type);
    const outcome = handler.evaluate(rule, param, { intake });

    const textKey = outcome.status === 'pass' ? 'pass' : outcome.status === 'fail' ? 'fail' : 'missing';

    findings.push({
      ruleId: rule.id,
      category: rule.category,
      title: rule.title,
      regulationRef: rule.regulationRef,
      severity: rule.severity,
      section: rule.report.section,
      order: rule.report.order,
      status: outcome.status,
      actual: outcome.actual ?? null,
      expected: outcome.expected ?? null,
      shortfall: outcome.shortfall ?? null,
      rows: outcome.rows ?? null,
      total: outcome.total ?? null,
      absent: outcome.absent ?? null,
      punitive: { policyKey: rule.punitive?.policyKey ?? null, special: rule.punitive?.special ?? [] },
      renderedText: renderText(rule.report[textKey], {
        actual: outcome.actual,
        expected: outcome.expected,
        shortfall: outcome.shortfall,
      }),
    });
  }

  return findings;
}

module.exports = { evaluate };
