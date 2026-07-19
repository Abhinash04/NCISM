const PgBoss = require('pg-boss');
const config = require('../config');
const createLogger = require('../utils/logger');

const logger = createLogger('Queue');
const QUEUE = 'case-process';

let boss = null;

/**
 * Starts the pg-boss background worker for case processing. No-op when
 * ASYNC_PROCESSING=false (processing then runs inline in-request). pg-boss
 * manages its own `pgboss` schema on the same DATABASE_URL.
 */
async function start() {
  if (!config.asyncProcessing) {
    logger.info('Async processing disabled (ASYNC_PROCESSING=false) — engine runs inline.');
    return;
  }
  boss = new PgBoss(config.databaseUrl);
  boss.on('error', (err) => logger.error('pg-boss error:', err.message));
  await boss.start();
  await boss.createQueue(QUEUE);

  // Lazy require breaks the application.service ↔ queue.service cycle.
  const applicationService = require('./application.service');
  await boss.work(QUEUE, async ([job]) => {
    const { applicationId, actorId } = job.data;
    logger.info(`Processing case ${applicationId} (job ${job.id})`);
    await applicationService.runProcessing(applicationId, actorId);
  });
  logger.info(`Worker listening on "${QUEUE}".`);
}

async function enqueueProcessing(applicationId, actorId) {
  if (!boss) throw new Error('Processing queue is not started');
  await boss.send(QUEUE, { applicationId, actorId });
}

async function stop() {
  if (boss) { await boss.stop(); boss = null; }
}

module.exports = { start, enqueueProcessing, stop, QUEUE };
