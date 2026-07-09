const jobRepository = require('../repositories/job.repository');

class JobService {
  createJob() {
    return jobRepository.create();
  }

  createManifest(jobId, originalFilename, filesize, processingTime, artifacts, status = 'completed', warnings = [], failedPages = []) {
    let pages = 0;
    if (artifacts.json && artifacts.json.pages) {
      pages = artifacts.json.pages.length;
    }

    const manifest = {
      jobId,
      filename: originalFilename,
      createdAt: new Date().toISOString(),
      status,
      warnings,
      failedPages,
      processingTime: parseFloat(processingTime),
      pageCount: pages,
      filesize,
      backendVersion: '1.0.0',
      cliVersion: '1.0.0',
      hybridVersion: '1.0.0',
      artifacts: {
        pdf: 'input.pdf',
        markdown: artifacts.markdown ? 'output/input.md' : null,
        json: artifacts.json ? 'output/input.json' : null,
        html: artifacts.html ? 'output/input.html' : null
      }
    };

    return jobRepository.saveManifest(jobId, manifest);
  }

  getManifest(jobId) {
    return jobRepository.getManifest(jobId);
  }

  getArtifactPath(jobId, type) {
    return jobRepository.getArtifactPath(jobId, type);
  }
}

module.exports = new JobService();
