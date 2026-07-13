const fs = require('fs');
const path = require('path');
const opendataloaderStage = require('./opendataloader.stage');
const createLogger = require('../../../utils/logger');

const logger = createLogger('BaseEngineRetry');

/**
 * Splices the failed pages' elements from a base-engine run into the primary
 * element JSON. Pure — exported for testing. Reconstruction sorts elements by
 * page, so appended kids merge cleanly regardless of order.
 */
function mergeFailedPageKids(primaryJson, baseJson, failedPages) {
  const wanted = new Set(failedPages);
  const rescued = (baseJson.kids || []).filter((k) => wanted.has(k['page number']));
  const recoveredPages = [...new Set(rescued.map((k) => k['page number']))].sort((a, b) => a - b);

  if (recoveredPages.length > 0) {
    primaryJson.kids = [...(primaryJson.kids || []), ...rescued];
  }
  return recoveredPages;
}

/**
 * When the hybrid (Docling) pass drops pages (e.g. std::bad_alloc on
 * memory-heavy pages), re-run the CLI with the base Java engine only and
 * merge the missing pages' elements into the primary element JSON.
 *
 * @returns {Promise<{recoveredPages: number[], warning: string}>}
 */
async function recoverFailedPages({ inputPath, outputDir, jsonPath, failedPages }) {
  const retryDir = path.join(outputDir, 'base-retry');
  fs.mkdirSync(retryDir, { recursive: true });

  logger.info(`Hybrid pass dropped pages ${failedPages.join(', ')} — retrying with base engine...`);
  const retry = await opendataloaderStage.run(inputPath, retryDir, { hybrid: false });

  if (!retry.jsonPath || !fs.existsSync(retry.jsonPath)) {
    return { recoveredPages: [], warning: 'Base-engine retry produced no element JSON; pages remain missing.' };
  }

  const primary = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const base = JSON.parse(fs.readFileSync(retry.jsonPath, 'utf8'));

  const recoveredPages = mergeFailedPageKids(primary, base, failedPages);
  if (recoveredPages.length === 0) {
    return { recoveredPages: [], warning: 'Base-engine retry could not extract the failed pages either.' };
  }

  fs.writeFileSync(jsonPath, JSON.stringify(primary));
  logger.info(`Recovered pages ${recoveredPages.join(', ')} via base engine.`);

  return {
    recoveredPages,
    warning: `Pages ${recoveredPages.join(', ')} extracted via base engine (hybrid backend failed on them).`,
  };
}

module.exports = { recoverFailedPages, mergeFailedPageKids };
