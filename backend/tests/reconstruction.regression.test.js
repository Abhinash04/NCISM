const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const reconstructionStage = require('../src/engines/extraction/pdf/reconstruction.stage');

const fixturesDir = path.join(__dirname, 'fixtures', 'markdown');
const SAMPLES = ['AYU0659', 'AYU0265', 'AYU0038'];

// Line endings can be rewritten by git on checkout; normalize before diffing.
const normalize = (s) => s.replace(/\r\n/g, '\n');

for (const id of SAMPLES) {
  test(`reconstruction output for ${id} matches pre-refactor baseline`, () => {
    const jsonPath = path.join(fixturesDir, `${id}.elements.json`);
    const baselinePath = path.join(fixturesDir, `${id}.baseline.md`);
    const outPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ncism-recon-')), 'out.md');

    const ok = reconstructionStage.reconstruct(jsonPath, outPath);
    assert.strictEqual(ok, true, 'reconstruct() should succeed');

    const produced = normalize(fs.readFileSync(outPath, 'utf8'));
    const baseline = normalize(fs.readFileSync(baselinePath, 'utf8'));
    assert.strictEqual(produced, baseline, `reconstructed markdown for ${id} diverged from baseline`);
  });
}
