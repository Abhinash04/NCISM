const fs = require('fs');
const path = require('path');
const jobService = require('../services/job.service');
const openDataLoaderService = require('../services/opendataloader.service');
const fileService = require('../services/file.service');

class ExtractController {
  async extract(req, res) {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const startTime = Date.now();
    const originalFilename = req.file.originalname;
    
    // Create isolated job workspace
    const { jobId, jobDir, outputDir } = jobService.createJob();
    
    // Move uploaded file to job directory as input.pdf
    const inputPdfPath = path.join(jobDir, 'input.pdf');
    fs.renameSync(req.file.path, inputPdfPath);

    try {
      console.log(`[ExtractController] Started job ${jobId} for ${originalFilename}`);
      
      // Execute the CLI
      const extractionResult = await openDataLoaderService.execute(inputPdfPath, outputDir);
      const status = extractionResult?.status || 'success';
      const warnings = extractionResult?.warnings || [];
      const failedPages = extractionResult?.failedPages || [];

      // Collect generated artifacts to know what was generated
      const artifacts = fileService.collectArtifacts(outputDir);
      
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

      // Create manifest.json
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

      // Return the lightweight REST response
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
      console.error(`[ExtractController] Error processing job ${jobId}:`, error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to process document with OpenDataLoader',
        details: error.message 
      });
    }
    // Cleanup is now handled by JobService Retention Policy
  }
}

module.exports = new ExtractController();
