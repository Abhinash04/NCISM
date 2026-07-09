const opendataloaderStage = require('./opendataloader.stage');
const reconstructionStage = require('./reconstruction.stage');
const collectStage = require('./collect.stage');
const createLogger = require('../../../utils/logger');

const logger = createLogger('PdfPipeline');

/**
 * PDF extraction pipeline:
 *   1. OpenDataLoader CLI  -> markdown/json/html artifacts
 *   2. Semantic reconstruction -> rebuilds the markdown from element JSON
 *   3. Collect             -> loads artifacts from disk
 *
 * @param {string} inputPath - path to the input PDF
 * @param {string} outputDir - directory receiving artifacts
 * @returns {Promise<{status: string, warnings: string[], failedPages: number[], artifacts: Object}>}
 */
async function run(inputPath, outputDir) {
  const { status, warnings, failedPages, jsonPath, mdPath } = await opendataloaderStage.run(inputPath, outputDir);

  try {
    logger.info('Triggering Semantic Reconstruction Layer...');
    reconstructionStage.reconstruct(jsonPath, mdPath);
  } catch (e) {
    logger.error('Semantic reconstruction failed:', e);
  }

  const artifacts = collectStage.collect(outputDir);

  return { status, warnings, failedPages, artifacts };
}

module.exports = { run };
