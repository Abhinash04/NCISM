/**
 * Runnable extraction check: runs the full PDF pipeline on a sample document.
 *
 *   node tests/checks/extract.check.js [path\to\document.pdf]
 *
 * Defaults to the AYU0659 sample in "All data/Part-3 colleges".
 */
const fs = require('fs');
const path = require('path');
const extractionService = require('../../src/services/extraction.service');

const repoRoot = path.join(__dirname, '..', '..', '..');
const defaultPdf = path.join(repoRoot, 'All data', 'Part-3 colleges', 'AYU0659 100 intake capacity.pdf');
const pdfPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultPdf;

if (!fs.existsSync(pdfPath)) {
  console.error(`PDF not found: ${pdfPath}`);
  process.exit(1);
}

const outputDir = path.join(__dirname, '..', '..', 'temp', `check_extract_${Date.now()}`);
fs.mkdirSync(outputDir, { recursive: true });

(async () => {
  console.log(`Extracting ${pdfPath}`);
  console.log(`Output dir: ${outputDir}`);
  const result = await extractionService.extract(pdfPath, outputDir);
  console.log(`Status: ${result.status}`);
  console.log(`Warnings: ${result.warnings.length ? result.warnings.join('; ') : 'none'}`);
  console.log(`Failed pages: ${result.failedPages.length ? result.failedPages.join(', ') : 'none'}`);
  console.log(`Artifacts: markdown=${!!result.artifacts.markdown} json=${!!result.artifacts.json} html=${!!result.artifacts.html}`);
  if (!result.artifacts.markdown) {
    console.error('FAIL: no markdown artifact produced');
    process.exit(1);
  }
  console.log('OK');
})().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
