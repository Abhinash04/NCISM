const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const config = require('../../../config');
const createLogger = require('../../../utils/logger');

const logger = createLogger('OpenDataLoader');

/**
 * Stage 1 of the PDF pipeline: runs the OpenDataLoader CLI
 * (Python wrapper -> Java core, with Docling hybrid backend) and parses its
 * stdout for partial-success information.
 *
 * @param {string} inputPdfPath
 * @param {string} outputDir
 * @returns {Promise<{status: string, warnings: string[], failedPages: number[], jsonPath: string, mdPath: string}>}
 */
function run(inputPdfPath, outputDir) {
  return new Promise((resolve, reject) => {
    const cliPath = config.openDataLoaderCliPath;

    const args = [
      '-f', 'markdown,json,html',
      '--hybrid', 'docling-fast',
      '--hybrid-fallback',
      '--markdown-with-html',
      '-o', outputDir,
      inputPdfPath
    ];

    logger.info(`Executing: ${cliPath} ${args.join(' ')}`);

    const child = spawn(cliPath, args, { shell: false });

    let stdoutLog = '';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      stdoutLog += text;
      logger.info(`stdout: ${text.trim()}`);
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      stdoutLog += text;
      logger.error(`stderr: ${text.trim()}`);
    });

    child.on('error', (error) => {
      logger.error(`Failed to start subprocess: ${error.message}`);
      reject(error);
    });

    child.on('close', (code) => {
      logger.info(`Process exited with code ${code}`);

      let status = 'success';
      let failedPages = [];
      let warnings = [];

      if (stdoutLog.includes('partial_success')) {
        status = 'partial_success';

        // Extract reasons from "Backend returned partial_success: [...]"
        const match = stdoutLog.match(/partial_success:\s*(\[[^\]]+\])/);
        if (match) {
          try {
            const reasons = JSON.parse(match[1]);
            const uniqueReasons = [...new Set(reasons)];
            warnings.push(`Extraction incomplete. Reasons: ${uniqueReasons.join(', ')}`);
          } catch (e) {
            warnings.push('Extraction incomplete due to backend errors.');
          }
        } else {
          warnings.push('Docling backend returned partial success.');
        }
      }

      const jsonFileName = path.basename(inputPdfPath, '.pdf') + '.json';
      const jsonFallbackPath = path.join(outputDir, jsonFileName);
      const jsonPath = fs.existsSync(path.join(outputDir, 'input.json'))
        ? path.join(outputDir, 'input.json')
        : jsonFallbackPath;

      const mdFileName = path.basename(inputPdfPath, '.pdf') + '.md';
      const mdFallbackPath = path.join(outputDir, mdFileName);
      const mdPath = fs.existsSync(path.join(outputDir, 'input.md'))
        ? path.join(outputDir, 'input.md')
        : mdFallbackPath;

      if (code === 0 || status === 'partial_success') {
        // Detect missing pages from JSON if partial_success
        if (status === 'partial_success' && fs.existsSync(jsonPath)) {
          try {
            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            const totalPagesMatch = stdoutLog.match(/Number of pages:\s*(\d+)/);
            const totalPages = totalPagesMatch ? parseInt(totalPagesMatch[1]) : 0;

            if (totalPages > 0 && data.pages) {
              const presentPages = new Set(Object.keys(data.pages).map(Number));
              for (let i = 1; i <= totalPages; i++) {
                if (!presentPages.has(i)) {
                  failedPages.push(i);
                }
              }
            }
          } catch (e) {
            logger.error('Failed to parse JSON to find missing pages:', e);
          }
        }

        resolve({ status, warnings, failedPages, jsonPath, mdPath });
      } else {
        reject(new Error(`OpenDataLoader CLI exited with code ${code}`));
      }
    });
  });
}

module.exports = { run };
