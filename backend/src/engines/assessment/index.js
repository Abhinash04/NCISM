const { extractParameters } = require('./extractors');
const { loadRuleset } = require('./rules/loader');
const { evaluate } = require('./evaluator/evaluator');
const punitiveEngine = require('./punitive/punitive.engine');
const templater = require('./reporter/templater');

const DEFAULT_RULESET = 'mesar-ug-ayurveda-2024';
const DEFAULT_VERSION = 'v1';

function pv(parameters, name) {
  const p = parameters[name];
  return p && p.status === 'found' ? p.value : null;
}

/**
 * Runs the deterministic assessment for an already-extracted ParameterSet.
 * This is the core entry point — golden tests drive it directly with fixture
 * parameters; the live path goes through runAssessment() below.
 */
function runFromParameters({ parameters, rulesetId = DEFAULT_RULESET, rulesetVersion = DEFAULT_VERSION, jobId = null, generatedDate }) {
  const ruleset = loadRuleset(rulesetId, rulesetVersion);

  const intake = pv(parameters, 'intake');
  if (intake === null) {
    throw new Error('Cannot assess: sanctioned intake capacity was not found in the document');
  }
  if (!ruleset.manifest.supportedIntakes.includes(intake)) {
    throw new Error(`Unsupported intake ${intake} for ruleset ${rulesetId}@${rulesetVersion} (supported: ${ruleset.manifest.supportedIntakes.join(', ')})`);
  }

  const findings = evaluate({ rules: ruleset.rules, parameters, intake });
  const punitiveSummary = punitiveEngine.apply({ findings, intake, policy: ruleset.punitivePolicy });

  const institution = {
    name: pv(parameters, 'institutionName') || 'Unknown institution',
    id: pv(parameters, 'institutionId') || '—',
    location: pv(parameters, 'location'),
    intake,
    course: ruleset.manifest.course,
    system: ruleset.manifest.system,
    academicYear: pv(parameters, 'academicYear') || '—',
    fileNo: pv(parameters, 'fileNo'),
    purpose: pv(parameters, 'purposeOfVisitation') || 'Annual visitation for issuance of Annual permission',
    visitDates: {
      start: pv(parameters, 'visitationStartDate'),
      end: pv(parameters, 'visitationEndDate'),
    },
    visitors: pv(parameters, 'visitors') || [],
  };

  const staffRows = (ruleId) => findings.find((f) => f.ruleId === ruleId)?.rows || [];

  const result = {
    rulesetId,
    rulesetVersion,
    jobId,
    generatedAt: new Date().toISOString(),
    institution,
    parameters,
    findings,
    staffTables: {
      teaching: staffRows('staff.teaching'),
      nonTeaching: staffRows('staff.non-teaching'),
      hospital: staffRows('staff.hospital'),
    },
    punitiveSummary,
  };

  const reportMarkdown = templater.render(result, { generatedDate });

  return { result, reportMarkdown };
}

/**
 * Live path: extract parameters from the reconstructed markdown and the
 * element JSON (structured tables), then assess.
 */
function runAssessment({ markdown, elements = null, rulesetId, rulesetVersion, jobId, generatedDate }) {
  const parameters = extractParameters(markdown, elements);
  return runFromParameters({ parameters, rulesetId, rulesetVersion, jobId, generatedDate });
}

module.exports = { runAssessment, runFromParameters, DEFAULT_RULESET, DEFAULT_VERSION };
