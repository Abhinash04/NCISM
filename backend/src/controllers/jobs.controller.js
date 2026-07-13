const fs = require('fs');
const path = require('path');
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
      job: jobService.toJobDto(manifest)
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
      html: 'text/html',
      cdm: 'application/json',
      report: 'text/markdown',
      assessment: 'application/json'
    };

    res.setHeader('Content-Type', contentTypes[type] || 'text/plain');

    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(artifactPath)}"`);
    } else if (type === 'pdf') {
      // For PDF, we want inline rendering
      res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
    }

    return res.sendFile(artifactPath);
  }
}

module.exports = new JobsController();
