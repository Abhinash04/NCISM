const jobService = require('../services/job.service');
const fs = require('fs');

class JobController {
  getJob(req, res) {
    const { jobId } = req.params;
    const manifest = jobService.getManifest(jobId);

    if (!manifest) {
      return res.status(404).json({ success: false, error: 'Job not found or expired' });
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

  getArtifact(req, res) {
    const { jobId, type } = req.params;
    const artifactPath = jobService.getArtifactPath(jobId, type);

    if (!artifactPath || !fs.existsSync(artifactPath)) {
      return res.status(404).json({ success: false, error: 'Artifact not found' });
    }

    // Set correct content types
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

module.exports = new JobController();
