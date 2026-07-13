const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const engine = require('../src/engines/assessment');
const { loadParamsFixture } = require('./helpers/wrap-params');

const normalize = (s) => s.replace(/\r\n/g, '\n');

const CASES = [
  {
    id: 'AYU0659',
    // 7 deficient teaching faculty x 5% of 100 seats + 1 seat (RMO 2 deficient);
    // Shalakya Tantra has zero faculty -> denial regardless of the total.
    expect: { totalSeatReduction: 36, percentOfIntake: 36, outcome: 'denial' },
  },
  {
    id: 'AYU0265',
    // 7 deficient HF x 5% of 50 seats = 17.5; library failures carry no seats.
    expect: { totalSeatReduction: 17.5, percentOfIntake: 35, outcome: 'seat-reduction' },
  },
  {
    id: 'AYU0038',
    // QC-lab non-teaching vacancies map to "No seat reduction" in the policy.
    expect: { totalSeatReduction: 0, percentOfIntake: 0, outcome: 'compliant' },
  },
];

for (const { id, expect } of CASES) {
  test(`golden assessment for ${id}: punitive summary and full report`, () => {
    const parameters = loadParamsFixture(path.join(__dirname, 'fixtures', 'parameters', `${id}.params.json`));
    const { result, reportMarkdown } = engine.runFromParameters({ parameters, generatedDate: 'GOLDEN' });

    assert.strictEqual(result.punitiveSummary.totalSeatReduction, expect.totalSeatReduction, `${id} totalSeatReduction`);
    assert.strictEqual(result.punitiveSummary.percentOfIntake, expect.percentOfIntake, `${id} percentOfIntake`);
    assert.strictEqual(result.punitiveSummary.outcome, expect.outcome, `${id} outcome`);

    const expected = normalize(fs.readFileSync(path.join(__dirname, 'fixtures', 'expected', `${id}.report.md`), 'utf8'));
    assert.strictEqual(normalize(reportMarkdown), expected, `${id} report diverged from golden snapshot`);
  });
}

test('evaluator rejects an intake the ruleset does not support', () => {
  const parameters = loadParamsFixture(path.join(__dirname, 'fixtures', 'parameters', 'AYU0659.params.json'));
  parameters.intake = { value: 150, status: 'found' };
  assert.throws(
    () => engine.runFromParameters({ parameters }),
    /Unsupported intake 150/,
    'unsupported intake must fail loudly, never silently apply another slab'
  );
});

test('missing parameters produce insufficient-data findings, never fabricated values', () => {
  const parameters = loadParamsFixture(path.join(__dirname, 'fixtures', 'parameters', 'AYU0659.params.json'));
  delete parameters.libraryBooks;
  delete parameters.teachingStaff;

  const { result, reportMarkdown } = engine.runFromParameters({ parameters, generatedDate: 'GOLDEN' });

  const books = result.findings.find((f) => f.ruleId === 'library.books');
  assert.strictEqual(books.status, 'insufficient-data');
  assert.strictEqual(books.actual, null);

  const teaching = result.findings.find((f) => f.ruleId === 'staff.teaching');
  assert.strictEqual(teaching.status, 'insufficient-data');

  assert.match(reportMarkdown, /manual verification required/);
});
