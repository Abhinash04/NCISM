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

const extractionMode = process.env.EXTRACTION_MODE || 'fast';
if (!['fast', 'hybrid'].includes(extractionMode)) {
  throw new Error(`[config] EXTRACTION_MODE must be "fast" or "hybrid", got "${extractionMode}"`);
}

const config = Object.freeze({
  port: intFromEnv('PORT', 3000),
  // 'fast' = native Java engine only (default — calibrated for born-digital
  // NCISM reports); 'hybrid' = Docling backend for complex/scanned pages,
  // requires the hybrid server at hybridServerUrl.
  extractionMode,
  // 'cdm' (default) renders the structured markdown from the Canonical
  // Document Model; 'legacy' keeps the old reconstruction output.
  cdmRenderer: process.env.CDM_RENDERER === 'legacy' ? 'legacy' : 'cdm',
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

  // --- Portal foundation (Phase 0/1) ---
  databaseUrl: process.env.DATABASE_URL || '',
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
    bcryptRounds: intFromEnv('BCRYPT_ROUNDS', 12),
  },
});

module.exports = config;
