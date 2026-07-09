const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { extractParameters } = require('../src/engines/assessment/extractors');

const fixturesDir = path.join(__dirname, 'fixtures');

/**
 * Extraction accuracy is measured against the golden parameters. Fields the
 * extractors cannot find yet are marked `todo` so accuracy improves
 * incrementally without red builds — flipping a todo to a hard assert is the
 * definition of done for each extractor improvement.
 */
test('extractors on AYU0659 reconstructed markdown', async (t) => {
  const markdown = fs.readFileSync(path.join(fixturesDir, 'markdown', 'AYU0659.baseline.md'), 'utf8');
  const golden = require(path.join(fixturesDir, 'parameters', 'AYU0659.params.json')).values;
  const params = extractParameters(markdown);

  await t.test('institution id', () => {
    assert.strictEqual(params.institutionId.status, 'found');
    assert.strictEqual(params.institutionId.value, golden.institutionId);
  });

  await t.test('institution name', () => {
    assert.strictEqual(params.institutionName.status, 'found');
    assert.ok(
      params.institutionName.value.startsWith(golden.institutionName),
      `extracted "${params.institutionName.value}" should start with "${golden.institutionName}"`
    );
  });

  await t.test('intake capacity', () => {
    assert.strictEqual(params.intake.status, 'found');
    assert.strictEqual(params.intake.value, golden.intake);
  });

  await t.test('visitation dates and academic year', () => {
    assert.strictEqual(params.visitationStartDate.value, golden.visitationStartDate);
    assert.strictEqual(params.visitationEndDate.value, golden.visitationEndDate);
    assert.strictEqual(params.academicYear.value, golden.academicYear);
  });

  await t.test('hospital functionality figures (verified against all three golden colleges)', () => {
    assert.strictEqual(params.opdCount.value, golden.opdCount);
    assert.strictEqual(params.opdTotalPatients.value, golden.opdTotalPatients);
    assert.strictEqual(params.opdAverageDaily.value, golden.opdAverageDaily);
    assert.strictEqual(params.ipdTotalPatients.value, golden.ipdTotalPatients);
    assert.strictEqual(params.bedOccupancyPercent.value, golden.bedOccupancyPercent);
    assert.strictEqual(params.deliveries.value, golden.deliveries);
    assert.strictEqual(params.operations.value, golden.operations);
    assert.strictEqual(params.equipmentMeanPercent.value, golden.equipmentMeanPercent);
  });

  await t.test('constructed area of college', () => {
    assert.strictEqual(params.constructedAreaCollegeSqm.value, golden.constructedAreaCollegeSqm);
  });

  await t.test('staffing parameters are honestly missing (no fabrication)', () => {
    assert.strictEqual(params.teachingStaff.status, 'missing');
    assert.strictEqual(params.nonTeachingStaff.status, 'missing');
    assert.strictEqual(params.hospitalStaff.status, 'missing');
  });

  await t.test('misparse-prone fields stay missing rather than grabbing requirement values', () => {
    // These labels sit next to MESAR requirement columns in the proforma;
    // naive extraction returned 5 lecture halls (golden: 4) and 3500 sq.mt
    // hospital area (golden: 3752). They must stay missing until
    // row-context-aware extraction lands.
    assert.strictEqual(params.lectureHallsCount.status, 'missing');
    assert.strictEqual(params.constructedAreaHospitalSqm.status, 'missing');
    assert.strictEqual(params.herbalSpecies.status, 'missing');
  });

  // Not yet reliably extractable from the reconstructed markdown:
  t.todo('visitors list matches golden values');
  t.todo('infrastructure areas beyond college constructed area');
  t.todo('library figures match golden values');
  t.todo('teaching/non-teaching/hospital staff tables extracted from element JSON');
});
