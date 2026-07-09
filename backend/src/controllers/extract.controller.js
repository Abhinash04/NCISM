const fs = require('fs');
const path = require('path');
const jobService = require('../../services/job.service');
const openDataLoaderService = require('../../services/opendataloader.service');
const fileService = require('../../services/file.service');
const ApiError = require('../utils/api-error');
const createLogger = require('../utils/logger');

const logger = createLogger('ExtractController');

class ExtractController {
  async extract(req, res, next) {
    if (!req.file) {
      return next(ApiError.badRequest('NO_FILE', 'No file uploaded'));
    }

    const startTime = Date.now();
    const originalFilename = req.file.originalname;

    // Create isolated job workspace
    const { jobId, jobDir, outputDir } = jobService.createJob();

    // Move uploaded file to job directory as input.pdf
    const inputPdfPath = path.join(jobDir, 'input.pdf');
    fs.renameSync(req.file.path, inputPdfPath);

    try {
      logger.info(`Started job ${jobId} for ${originalFilename}`);

      const extractionResult = await openDataLoaderService.execute(inputPdfPath, outputDir);
      const status = extractionResult?.status || 'success';
      const warnings = extractionResult?.warnings || [];
      const failedPages = extractionResult?.failedPages || [];

      // Collect generated artifacts to know what was generated
      const artifacts = fileService.collectArtifacts(outputDir);

      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

      const manifest = jobService.createManifest(
        jobId,
        originalFilename,
        req.file.size,
        processingTime,
        artifacts,
        status,
        warnings,
        failedPages
      );

      return res.json({
        success: true,
        jobId: jobId,
        status: status,
        metadata: manifest,
        artifacts: {
          pdf: `/api/v1/jobs/${jobId}/artifacts/pdf`,
          markdown: manifest.artifacts.markdown ? `/api/v1/jobs/${jobId}/artifacts/markdown` : null,
          json: manifest.artifacts.json ? `/api/v1/jobs/${jobId}/artifacts/json` : null,
          html: manifest.artifacts.html ? `/api/v1/jobs/${jobId}/artifacts/html` : null
        }
      });
    } catch (error) {
      logger.error(`Error processing job ${jobId}:`, error);
      return next(ApiError.internal('EXTRACTION_FAILED', 'Failed to process document with OpenDataLoader', error.message));
    }
    // Cleanup is handled by the retention policy
  }
}

module.exports = new ExtractController();
