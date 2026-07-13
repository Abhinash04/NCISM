const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

/**
 * Disk-backed job repository. The storage contract for jobs and their
 * artifacts — everything above this layer speaks jobId + artifact type and
 * never touches temp/ paths. A database/object-storage implementation later
 * only needs to provide these same functions.
 *
 * Contract:
 *   create()                                  -> { jobId, jobDir, outputDir }
 *   saveManifest(jobId, manifest)             -> manifest
 *   getManifest(jobId)                        -> manifest | null
 *   getArtifactPath(jobId, type)              -> absolute path | null
 *   saveArtifact(jobId, type, filename, content) -> relative artifact path
 *   list()                                    -> [{ jobId, mtimeMs }]
 *   remove(jobId)                             -> void
 */
class JobRepository {
  constructor() {
    this.tempDir = config.tempDir;
    fs.mkdirSync(this.tempDir, { recursive: true });
  }

  create() {
    const jobId = `job_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
    const jobDir = path.join(this.tempDir, jobId);
    const outputDir = path.join(jobDir, 'output');

    fs.mkdirSync(outputDir, { recursive: true });

    return { jobId, jobDir, outputDir };
  }

  saveManifest(jobId, manifest) {
    const manifestPath = path.join(this.tempDir, jobId, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    return manifest;
  }

  getManifest(jobId) {
    const manifestPath = path.join(this.tempDir, jobId, 'manifest.json');
    if (!fs.existsSync(manifestPath)) return null;
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }

  getArtifactPath(jobId, type) {
    const manifest = this.getManifest(jobId);
    if (!manifest || !manifest.artifacts[type]) return null;
    return path.join(this.tempDir, jobId, manifest.artifacts[type]);
  }

  /**
   * Writes a new artifact file into the job's output dir and registers it in
   * the manifest so it is served by GET /jobs/:jobId/artifacts/:type.
   */
  saveArtifact(jobId, type, filename, content) {
    const relativePath = path.posix.join('output', filename);
    const absolutePath = path.join(this.tempDir, jobId, 'output', filename);
    fs.writeFileSync(absolutePath, content, 'utf8');

    const manifest = this.getManifest(jobId);
    if (manifest) {
      manifest.artifacts[type] = relativePath;
      this.saveManifest(jobId, manifest);
    }
    return relativePath;
  }

  list() {
    if (!fs.existsSync(this.tempDir)) return [];
    return fs.readdirSync(this.tempDir)
      .filter((name) => {
        const stats = fs.statSync(path.join(this.tempDir, name));
        return stats.isDirectory();
      })
      .map((jobId) => ({
        jobId,
        mtimeMs: fs.statSync(path.join(this.tempDir, jobId)).mtimeMs,
      }));
  }

  remove(jobId) {
    const jobDir = path.join(this.tempDir, jobId);
    fs.rmSync(jobDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

module.exports = new JobRepository();
