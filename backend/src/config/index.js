const path = require('path');

// Load .env from the backend root regardless of the process CWD.
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

function intFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new Error(`[config] Environment variable ${name} must be a number, got "${raw}"`);
  }
  return value;
}

const backendRoot = path.join(__dirname, '..', '..');

const config = Object.freeze({
  port: intFromEnv('PORT', 3000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  hybridServerUrl: process.env.HYBRID_SERVER_URL || 'http://localhost:5002',
  openDataLoaderCliPath:
    process.env.OPENDATALOADER_CLI_PATH ||
    'D:\\opendataloader-pdf\\.venv\\Scripts\\opendataloader-pdf.exe',
  jobRetentionHours: intFromEnv('JOB_RETENTION_HOURS', 24),
  keepJobs: process.env.KEEP_JOBS === 'true',
  maxUploadMb: intFromEnv('MAX_UPLOAD_MB', 100),
  tempDir: path.join(backendRoot, 'temp'),
  uploadsDir: path.join(backendRoot, 'temp', 'uploads'),
  dataDir: path.join(backendRoot, 'data'),
});

module.exports = config;
