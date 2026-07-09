const fs = require('fs');
const jobService = require('../services/job.service');
const ApiError = require('../utils/api-error');

class JobsController {
  getJob(req, res, next) {
    const { jobId } = req.params;
    const manifest = jobService.getManifest(jobId);

    if (!manifest) {
      return next(ApiError.notFound('JOB_NOT_FOUND', 'Job not found or expired'));
    }

    return res.json({
      success: true,
      jobId: jobId,
      metadata: manifest,
      artifacts: {
        pdf: `/api/v1/jobs/${jobId}/artifacts/pdf`,
        markdown: manifest.artifacts.markdown ? `/api/v1/jobs/${jobId}/artifacts/markdown` : null,
        json: manifest.artifacts.json ? `/api/v1/jobs/${jobId}/artifacts/json` : null,
        html: manifest.artifacts.html ? `/api/v1/jobs/${jobId}/artifacts/html` : null
      }
    });
  }

  getArtifact(req, res, next) {
    const { jobId, type } = req.params;
    const artifactPath = jobService.getArtifactPath(jobId, type);

    if (!artifactPath || !fs.existsSync(artifactPath)) {
      return next(ApiError.notFound('ARTIFACT_NOT_FOUND', 'Artifact not found'));
    }

    const contentTypes = {
      pdf: 'application/pdf',
      markdown: 'text/markdown',
      json: 'application/json',
      html: 'text/html'
    };

    res.setHeader('Content-Type', contentTypes[type] || 'text/plain');

    // For PDF, we want inline rendering
    if (type === 'pdf') {
      res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
    }

    return res.sendFile(artifactPath);
  }
}

module.exports = new JobsController();
