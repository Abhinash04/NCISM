/**
 * Runnable assessment check.
 *
 *   node tests/checks/assessment.check.js                    -> AYU0659 golden parameters
 *   node tests/checks/assessment.check.js AYU0265            -> that golden fixture
 *   node tests/checks/assessment.check.js path\to\input.md   -> live extraction path
 *
 * Prints the generated report and the punitive summary.
 */
const fs = require('fs');
const path = require('path');
const engine = require('../../src/engines/assessment');
const { loadParamsFixture } = require('../helpers/wrap-params');

const arg = process.argv[2] || 'AYU0659';

let output;
if (/^AYU\d{4}$/i.test(arg)) {
  const fixturePath = path.join(__dirname, '..', 'fixtures', 'parameters', `${arg.toUpperCase()}.params.json`);
  if (!fs.existsSync(fixturePath)) {
    console.error(`No parameters fixture for ${arg}`);
    process.exit(1);
  }
  output = engine.runFromParameters({ parameters: loadParamsFixture(fixturePath) });
} else {
  const mdPath = path.resolve(arg);
  if (!fs.existsSync(mdPath)) {
    console.error(`Markdown not found: ${mdPath}`);
    process.exit(1);
  }
  output = engine.runAssessment({ markdown: fs.readFileSync(mdPath, 'utf8') });
}

console.log(output.reportMarkdown);
console.log('\n================ punitive summary ================');
console.log(JSON.stringify(output.result.punitiveSummary, null, 2));
