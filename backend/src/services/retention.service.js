const config = require('../config');
const jobRepository = require('../repositories/job.repository');
const createLogger = require('../utils/logger');

const logger = createLogger('RetentionService');

/**
 * Periodically deletes job directories older than the retention window.
 * Started explicitly from server bootstrap (no side effects at require time).
 */
function start() {
  if (config.keepJobs) {
    logger.info('KEEP_JOBS is true. Retention policy disabled.');
    return;
  }

  const retentionMs = config.jobRetentionHours * 60 * 60 * 1000;

  setInterval(() => {
    try {
      const now = Date.now();
      let deleted = 0;

      for (const { jobId, mtimeMs } of jobRepository.list()) {
        if (now - mtimeMs > retentionMs) {
          jobRepository.remove(jobId);
          deleted++;
        }
      }
      if (deleted > 0) {
        logger.info(`Retention Policy: Cleaned up ${deleted} expired jobs.`);
      }
    } catch (err) {
      logger.error('Error during retention cleanup:', err);
    }
  }, 60 * 60 * 1000); // 1 hour
}

module.exports = { start };
