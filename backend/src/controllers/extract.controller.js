const fs = require('fs');
const path = require('path');
const jobService = require('../services/job.service');
const extractionService = require('../services/extraction.service');
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

      const extractionResult = await extractionService.extract(inputPdfPath, outputDir, req.file.mimetype);
      const status = extractionResult?.status || 'success';
      const warnings = extractionResult?.warnings || [];
      const failedPages = extractionResult?.failedPages || [];
      const artifacts = extractionResult?.artifacts || {};

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
        job: jobService.toJobDto(manifest)
      });
    } catch (error) {
      logger.error(`Error processing job ${jobId}:`, error);
      return next(ApiError.internal('EXTRACTION_FAILED', 'Failed to process document with OpenDataLoader', error.message));
    }
    // Cleanup is handled by the retention policy
  }
}

module.exports = new ExtractController();
