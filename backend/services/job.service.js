const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class JobService {
  constructor() {
    this.tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    this.startRetentionCron();
  }

  createJob() {
    const jobId = `job_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
    const jobDir = path.join(this.tempDir, jobId);
    const outputDir = path.join(jobDir, 'output');

    fs.mkdirSync(jobDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });

    return {
      jobId,
      jobDir,
      outputDir
    };
  }

  createManifest(jobId, originalFilename, filesize, processingTime, artifacts, status = 'completed', warnings = [], failedPages = []) {
    const jobDir = path.join(this.tempDir, jobId);
    const manifestPath = path.join(jobDir, 'manifest.json');
    
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

  startRetentionCron() {
    // Run every hour to clean up jobs older than JOB_RETENTION (default 24h)
    const retentionMs = process.env.KEEP_JOBS === 'true' 
      ? Infinity 
      : (parseInt(process.env.JOB_RETENTION_HOURS) || 24) * 60 * 60 * 1000;

    if (retentionMs === Infinity) {
      console.log('[JobService] KEEP_JOBS is true. Retention policy disabled.');
      return;
    }

    setInterval(() => {
      try {
        const jobs = fs.readdirSync(this.tempDir);
        const now = Date.now();
        let deleted = 0;

        for (const jobId of jobs) {
          const jobDir = path.join(this.tempDir, jobId);
          const stats = fs.statSync(jobDir);
          
          if (now - stats.mtimeMs > retentionMs) {
            fs.rmSync(jobDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
            deleted++;
          }
        }
        if (deleted > 0) {
          console.log(`[JobService] Retention Policy: Cleaned up ${deleted} expired jobs.`);
        }
      } catch (err) {
        console.error('[JobService] Error during retention cleanup:', err);
      }
    }, 60 * 60 * 1000); // 1 hour
  }
}

module.exports = new JobService();
