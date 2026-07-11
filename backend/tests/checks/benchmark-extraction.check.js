/**
 * Extraction-mode benchmark for THIS document class (NCISM regulatory PDFs).
 *
 *   node tests/checks/benchmark-extraction.check.js [path\to\document.pdf]
 *
 * Runs the sample PDF through the base Java engine (fast mode) and — when the
 * Docling hybrid server responds — through hybrid mode too. For each run it
 * reports timing, page coverage and element counts, then the quality gate
 * that actually matters here: extractParameters() output diffed against the
 * document-true fixture (tests/fixtures/extracted/). Generic benchmark scores
 * say nothing about a specific document class; this does.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const config = require('../../src/config');
const opendataloaderStage = require('../../src/engines/extraction/pdf/opendataloader.stage');
const reconstructionStage = require('../../src/engines/extraction/pdf/reconstruction.stage');
const { extractParameters } = require('../../src/engines/assessment/extractors');

const repoRoot = path.join(__dirname, '..', '..', '..');
const defaultPdf = path.join(repoRoot, 'All data', 'Part-3 colleges', 'AYU0659 100 intake capacity.pdf');
const pdfPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultPdf;

if (!fs.existsSync(pdfPath)) {
  console.error(`PDF not found: ${pdfPath}`);
  process.exit(1);
}

const fixtureId = (path.basename(pdfPath).match(/AYU\d{4}/) || [null])[0];
const fixturePath = fixtureId
  ? path.join(__dirname, '..', 'fixtures', 'extracted', `${fixtureId}.extracted.json`)
  : null;
const fixture = fixturePath && fs.existsSync(fixturePath) ? require(fixturePath) : null;

function hybridServerUp() {
  return new Promise((resolve) => {
    const req = http.get(`${config.hybridServerUrl}/health`, { timeout: 3000 }, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function summarizeElements(root) {
  const counts = {};
  for (const kid of root.kids || []) {
    counts[kid.type] = (counts[kid.type] || 0) + 1;
  }
  const pages = new Set((root.kids || []).map((k) => k['page number']));
  return { counts, pagesCovered: pages.size, declaredPages: root['number of pages'] };
}

function diffAgainstFixture(params) {
  if (!fixture) return null;
  let matched = 0;
  const mismatched = [];
  const missing = [];
  for (const [name, expected] of Object.entries(fixture.values)) {
    const actual = params[name];
    if (!actual || actual.status !== 'found') {
      missing.push(name);
    } else if (JSON.stringify(actual.value) === JSON.stringify(expected)) {
      matched++;
    } else {
      mismatched.push(name);
    }
  }
  return { total: Object.keys(fixture.values).length, matched, mismatched, missing };
}

async function runMode(label, hybrid) {
  const outDir = path.join(__dirname, '..', '..', 'temp', `bench_${label}_${Date.now()}`);
  fs.mkdirSync(outDir, { recursive: true });

  const started = Date.now();
  const result = await opendataloaderStage.run(pdfPath, outDir, { hybrid });
  reconstructionStage.reconstruct(result.jsonPath, result.mdPath);
  const elapsed = ((Date.now() - started) / 1000).toFixed(2);

  const elements = JSON.parse(fs.readFileSync(result.jsonPath, 'utf8'));
  const markdown = fs.readFileSync(result.mdPath, 'utf8');
  const summary = summarizeElements(elements);
  const quality = diffAgainstFixture(extractParameters(markdown, elements));

  console.log(`\n=== ${label} mode ===`);
  console.log(`time: ${elapsed}s · status: ${result.status} · failedPages: ${result.failedPages.join(', ') || 'none'}`);
  console.log(`pages: ${summary.pagesCovered}/${summary.declaredPages} · elements:`, summary.counts);
  if (quality) {
    console.log(`extraction vs ${fixtureId} document-true fixture: ${quality.matched}/${quality.total} matched` +
      (quality.mismatched.length ? ` · mismatched: ${quality.mismatched.join(', ')}` : '') +
      (quality.missing.length ? ` · missing: ${quality.missing.join(', ')}` : ''));
  } else {
    console.log('no document-true fixture for this PDF — quality diff skipped');
  }
}

(async () => {
  console.log(`Benchmarking ${path.basename(pdfPath)}`);

  await runMode('fast', false);

  if (await hybridServerUp()) {
    await runMode('hybrid', true);
  } else {
    console.log(`\n=== hybrid mode ===\nskipped — Docling server not reachable at ${config.hybridServerUrl}`);
  }
})().catch((err) => {
  console.error('BENCHMARK FAILED:', err);
  process.exit(1);
});
