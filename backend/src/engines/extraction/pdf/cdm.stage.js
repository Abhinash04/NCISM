const fs = require('fs');
const path = require('path');
const { buildCdm } = require('../cdm/cdm-builder');
const { render } = require('../cdm/cdm-renderer');
const createLogger = require('../../../utils/logger');

const logger = createLogger('CdmStage');

/**
 * Builds the Canonical Document Model from the element JSON, writes it as the
 * `cdm.json` artifact, and (unless the legacy renderer is selected) rewrites
 * the markdown artifact from the clean CDM.
 *
 * @param {string} jsonPath - element JSON produced by extraction
 * @param {string} mdPath   - markdown artifact to (optionally) overwrite
 * @param {string} outputDir
 * @param {{ renderer?: 'cdm' | 'legacy' }} [opts]
 * @returns {{ cdmPath: string|null }}
 */
function build(jsonPath, mdPath, outputDir, { renderer = 'cdm' } = {}) {
  if (!fs.existsSync(jsonPath)) {
    logger.warn(`Element JSON not found at ${jsonPath}; skipping CDM build`);
    return { cdmPath: null };
  }

  const elementJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const cdm = buildCdm(elementJson);

  const cdmPath = path.join(outputDir, 'cdm.json');
  fs.writeFileSync(cdmPath, JSON.stringify(cdm), 'utf8');

  if (renderer !== 'legacy') {
    fs.writeFileSync(mdPath, render(cdm), 'utf8');
    logger.info('Structured markdown rendered from the CDM');
  }

  return { cdmPath };
}

module.exports = { build };
