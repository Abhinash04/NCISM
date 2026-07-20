const templates = {
  'mesar-ug-ayurveda-2024': require('./templates/marb-ug-ayurveda-2024'),
  'mesar-ug-unani-2023': require('./templates/mesar-ug-unani-2023'),
  'mesar-ug-sowa-rigpa-2023': require('./templates/mesar-ug-sowa-rigpa-2023'),
};

/**
 * Renders an AssessmentResult to the MARB report markdown. The templater
 * never computes compliance — it only lays out what the evaluator and the
 * punitive engine already decided.
 */
function render(result, options = {}) {
  const template = templates[result.rulesetId];
  if (!template) {
    throw new Error(`No report template registered for ruleset "${result.rulesetId}"`);
  }
  return template.build(result, options);
}

module.exports = { render };
