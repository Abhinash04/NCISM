const config = require('../../../config');
const opendataloaderStage = require('./opendataloader.stage');
const retryStage = require('./retry.stage');
const reconstructionStage = require('./reconstruction.stage');
const collectStage = require('./collect.stage');
const createLogger = require('../../../utils/logger');

const logger = createLogger('PdfPipeline');

/**
 * PDF extraction pipeline:
 *   1. OpenDataLoader CLI (hybrid) -> markdown/json/html artifacts
 *   2. Base-engine retry           -> merges pages the hybrid backend dropped
 *   3. Semantic reconstruction     -> rebuilds the markdown from element JSON
 *   4. Collect                     -> loads artifacts from disk
 *
 * @param {string} inputPath - path to the input PDF
 * @param {string} outputDir - directory receiving artifacts
 * @returns {Promise<{status: string, warnings: string[], failedPages: number[], artifacts: Object}>}
 */
async function run(inputPath, outputDir) {
  // Default 'fast': native Java engine only — calibrated output shape for
  // born-digital NCISM reports (all fixtures/extractors verified against it).
  // 'hybrid' opt-in routes complex pages through Docling, protected by the
  // base-engine retry below.
  const useHybrid = config.extractionMode === 'hybrid';

  let stageResult;
  try {
    stageResult = await opendataloaderStage.run(inputPath, outputDir, { hybrid: useHybrid });
  } catch (hybridError) {
    if (!useHybrid) throw hybridError;
    // CLI-level crash of the hybrid pass — one full base-engine pass.
    logger.error('Hybrid extraction pass failed, falling back to base engine:', hybridError.message);
    stageResult = await opendataloaderStage.run(inputPath, outputDir, { hybrid: false });
    stageResult.warnings.push('Hybrid backend unavailable; document extracted with the base engine.');
  }

  let { status, warnings, failedPages, jsonPath, mdPath } = stageResult;

  if (useHybrid && status === 'partial_success' && failedPages.length > 0) {
    try {
      const { recoveredPages, warning } = await retryStage.recoverFailedPages({
        inputPath, outputDir, jsonPath, failedPages,
      });
      warnings.push(warning);
      failedPages = failedPages.filter((p) => !recoveredPages.includes(p));
      if (failedPages.length === 0) {
        status = 'success';
        warnings.push('Note: the HTML artifact still reflects the partial hybrid pass.');
      }
    } catch (e) {
      logger.error('Base-engine retry failed:', e);
      warnings.push('Base-engine retry failed; extraction remains partial.');
    }
  }

  try {
    logger.info('Triggering Semantic Reconstruction Layer...');
    reconstructionStage.reconstruct(jsonPath, mdPath); // runs on the MERGED json
  } catch (e) {
    logger.error('Semantic reconstruction failed:', e);
  }

  const artifacts = collectStage.collect(outputDir);

  return { status, warnings, failedPages, artifacts };
}

module.exports = { run };
