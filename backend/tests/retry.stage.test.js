const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { mergeFailedPageKids } = require('../src/engines/extraction/pdf/retry.stage');
const reconstructionStage = require('../src/engines/extraction/pdf/reconstruction.stage');

const fixturesDir = path.join(__dirname, 'fixtures', 'markdown');
const normalize = (s) => s.replace(/\r\n/g, '\n');

const FAILED_PAGES = [17, 18, 19, 20];

function loadFixture() {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, 'AYU0659.elements.json'), 'utf8'));
}

test('mergeFailedPageKids restores exactly the dropped pages', () => {
  const full = loadFixture();
  const primary = { ...full, kids: full.kids.filter((k) => !FAILED_PAGES.includes(k['page number'])) };
  const droppedCount = full.kids.length - primary.kids.length;
  assert.ok(droppedCount > 0, 'fixture must contain elements on pages 17-20');

  const recovered = mergeFailedPageKids(primary, full, FAILED_PAGES);

  assert.deepStrictEqual(recovered, FAILED_PAGES);
  assert.strictEqual(primary.kids.length, full.kids.length, 'all dropped elements restored, none duplicated');

  const countByPage = (kids, p) => kids.filter((k) => k['page number'] === p).length;
  for (const p of FAILED_PAGES) {
    assert.strictEqual(countByPage(primary.kids, p), countByPage(full.kids, p), `page ${p} element count`);
  }
});

test('reconstruction of a merged document equals the full-document baseline', () => {
  const full = loadFixture();
  const primary = { ...full, kids: full.kids.filter((k) => !FAILED_PAGES.includes(k['page number'])) };
  mergeFailedPageKids(primary, full, FAILED_PAGES);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ncism-retry-'));
  const jsonPath = path.join(tmp, 'merged.json');
  const mdPath = path.join(tmp, 'merged.md');
  fs.writeFileSync(jsonPath, JSON.stringify(primary));

  assert.strictEqual(reconstructionStage.reconstruct(jsonPath, mdPath), true);

  const produced = normalize(fs.readFileSync(mdPath, 'utf8'));
  const baseline = normalize(fs.readFileSync(path.join(fixturesDir, 'AYU0659.baseline.md'), 'utf8'));
  assert.strictEqual(produced, baseline, 'merge must be order-insensitive for reconstruction');
});

test('mergeFailedPageKids reports nothing when the base run also lacks the pages', () => {
  const full = loadFixture();
  const primary = { ...full, kids: full.kids.filter((k) => !FAILED_PAGES.includes(k['page number'])) };
  const base = { kids: primary.kids }; // base run missing the same pages
  const recovered = mergeFailedPageKids(primary, base, FAILED_PAGES);
  assert.deepStrictEqual(recovered, []);
});
