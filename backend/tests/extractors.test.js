const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { extractParameters } = require('../src/engines/assessment/extractors');

const fixturesDir = path.join(__dirname, 'fixtures');
const COLLEGES = ['AYU0659', 'AYU0265', 'AYU0038'];

function runExtraction(id) {
  const markdown = fs.readFileSync(path.join(fixturesDir, 'markdown', `${id}.baseline.md`), 'utf8');
  const elements = require(path.join(fixturesDir, 'markdown', `${id}.elements.json`));
  return extractParameters(markdown, elements);
}

/**
 * Extraction correctness = matches the SOURCE DOCUMENT, captured in
 * fixtures/extracted/*.extracted.json (document-true). Those deliberately
 * diverge from fixtures/parameters/*.params.json in a handful of fields the
 * MARB visitors amended in the reference assessment — see the fixtures'
 * _note. Never "fix" one family to match the other.
 */
for (const id of COLLEGES) {
  test(`extraction matches the document-true fixture for ${id}`, () => {
    const expected = require(path.join(fixturesDir, 'extracted', `${id}.extracted.json`));
    const params = runExtraction(id);

    for (const [name, value] of Object.entries(expected.values)) {
      assert.strictEqual(params[name]?.status, 'found', `${name} should be found`);
      assert.deepStrictEqual(params[name].value, value, `${name} value`);
    }
    for (const name of expected.missing) {
      assert.strictEqual(params[name]?.status, 'missing', `${name} must stay missing (no fabrication)`);
    }
  });
}

test('hand-verified document values for AYU0659 (guards the fixture itself)', () => {
  const params = runExtraction('AYU0659');
  const v = (name) => params[name].value;

  // Section 2.1: interleaved label,label,value,value block — y-band association
  assert.strictEqual(v('constructedAreaCollegeSqm'), 4585.59);
  assert.strictEqual(v('constructedAreaHospitalSqm'), 3752);
  assert.strictEqual(v('constructedAreaHerbalSqm'), 4110);

  // List-item and paragraph rows: actual is the value AFTER the requirement
  assert.strictEqual(v('lectureHallsAreaSqm'), 602.52);
  assert.strictEqual(v('lectureHallsCount'), 4); // requirement is 5 — must not grab it
  assert.strictEqual(v('libraryBooks'), 10410);  // document-true; MARB reference says 11964
  assert.strictEqual(v('librarySittingCapacity'), 120);
  assert.strictEqual(v('herbalSpecies'), 251);

  // Teaching table: existing counts from columns 8/9/10
  const teaching = v('teachingStaff');
  const dept = (re) => teaching.rows.find((r) => re.test(r.dept));
  assert.deepStrictEqual(
    [dept(/Agad/).existingProfessor, dept(/Agad/).existingReader, dept(/Agad/).existingLecturer],
    ['0', '1', '1']
  );
  assert.strictEqual(dept(/Shalakya/).existingLecturer, '0'); // zero-faculty department
  assert.strictEqual(dept(/Agad/).requirementText, '1P And 1R +1L');
  assert.strictEqual(teaching.total, 42); // "listed by the college" (table Total row counts eligible only = 40)
  assert.strictEqual(teaching.absent, 6);

  // Non-teaching + hospital staff
  const mpw = v('nonTeachingStaff').rows.find((r) => /Herbal Garden/i.test(r.dept || '') && /Multipurpose/i.test(r.post));
  assert.deepStrictEqual({ required: mpw.required, existing: mpw.existing }, { required: 2, existing: 1 });
  assert.strictEqual(v('nonTeachingStaff').total, 45); // from the summary paragraph
  const rmo = v('hospitalStaff').rows.find((r) => /RMO or RSO or MO or CR/i.test(r.post));
  assert.deepStrictEqual({ required: rmo.required, existing: rmo.existing }, { required: 9, existing: 7 });
  assert.strictEqual(v('hospitalStaff').total, 107);
  assert.strictEqual(v('hospitalStaff').absent, 22);

  // AEBAS: document says teaching Yes, non-teaching No, hospital No
  assert.strictEqual(v('aebasTeaching'), true);
  assert.strictEqual(v('aebasNonTeaching'), false);
  assert.strictEqual(v('aebasHospital'), false);
  assert.strictEqual(v('aebasImplemented'), false);

  // Non-Ayurveda / PG parameters extracted from the shared Part-I proforma
  // (added so live Unani/Siddha/Sowa-Rigpa/PG uploads assess). Validated here
  // against the Ayurveda proforma — the format is shared across systems.
  assert.strictEqual(v('landAcres'), 5.285);              // "Total Land Area(in acres) 5 5.285"
  assert.strictEqual(v('seminarHallAvailable'), true);    // auditorium/seminar hall row present
  assert.strictEqual(v('ipdBeds'), 100);                  // "Total number of Beds … UG intake"
  assert.strictEqual(v('constructedAreaTotalSqm'), 8337.59); // college 4585.59 + hospital 3752
  // Naming-reconciled aliases (same datum under the non-Ayurveda rule's name)
  assert.strictEqual(v('herbalGardenAreaSqm'), 4110);     // ← constructedAreaHerbalSqm
  assert.strictEqual(v('herbalGardenSpecies'), 251);      // ← herbalSpecies
  assert.strictEqual(v('bedOccupancy'), v('bedOccupancyPercent')); // ← bedOccupancyPercent
  assert.strictEqual(v('digitalLibraryComputers'), 12);   // ← libraryComputers
});

test('AYU0265 OR-form requirements and authoritative totals', () => {
  const params = runExtraction('AYU0265');
  const teaching = params.teachingStaff.value;
  const agad = teaching.rows.find((r) => /Agad/.test(r.dept));
  assert.strictEqual(agad.requirementText, '1 HF + 1 LF'); // "1P OR 1R" collapses to 1 HF
  // Table Total row is a required-column subtotal (67 | 29) — the summary
  // paragraph (70) must win.
  assert.strictEqual(params.nonTeachingStaff.value.total, 70);
});

test('extraction without elements JSON degrades to missing, never fabricates', () => {
  const markdown = fs.readFileSync(path.join(fixturesDir, 'markdown', 'AYU0659.baseline.md'), 'utf8');
  const params = extractParameters(markdown, null);
  assert.strictEqual(params.teachingStaff.status, 'missing');
  assert.strictEqual(params.constructedAreaHospitalSqm.status, 'missing');
  assert.strictEqual(params.aebasImplemented.status, 'missing');
  // markdown-only fields still work
  assert.strictEqual(params.institutionId.value, 'AYU0659');
  assert.strictEqual(params.opdTotalPatients.value, 62434);
});
