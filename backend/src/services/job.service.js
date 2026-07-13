const jobRepository = require('../repositories/job.repository');

class JobService {
  createJob() {
    return jobRepository.create();
  }

  createManifest(jobId, originalFilename, filesize, processingTime, artifacts, status = 'completed', warnings = [], failedPages = []) {
    let pages = 0;
    if (artifacts.json && typeof artifacts.json['number of pages'] === 'number') {
      pages = artifacts.json['number of pages'];
    } else if (artifacts.json && Array.isArray(artifacts.json.pages)) {
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
        html: artifacts.html ? 'output/input.html' : null,
        cdm: artifacts.cdm ? 'output/cdm.json' : null
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

  saveArtifact(jobId, type, filename, content) {
    return jobRepository.saveArtifact(jobId, type, filename, content);
  }

  /**
   * The ONE place artifact URLs and the canonical job shape are built.
   * Disk paths from the manifest never leave the server.
   */
  toJobDto(manifest) {
    const { jobId } = manifest;
    const statusMap = { success: 'completed', partial_success: 'partial' };
    const artifactUrl = (type) =>
      manifest.artifacts[type] ? `/api/v1/jobs/${jobId}/artifacts/${type}` : null;

    return {
      jobId,
      status: statusMap[manifest.status] || manifest.status,
      filename: manifest.filename,
      filesize: manifest.filesize,
      pageCount: manifest.pageCount,
      processingTimeMs: Math.round((manifest.processingTime || 0) * 1000),
      warnings: manifest.warnings || [],
      failedPages: manifest.failedPages || [],
      createdAt: manifest.createdAt,
      artifacts: {
        pdf: artifactUrl('pdf'),
        markdown: artifactUrl('markdown'),
        json: artifactUrl('json'),
        html: artifactUrl('html'),
        cdm: artifactUrl('cdm'),
        report: artifactUrl('report'),
        assessment: artifactUrl('assessment'),
      },
    };
  }
}

module.exports = new JobService();
