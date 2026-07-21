const config = require('./src/config');
const app = require('./src/app');
const { assertConnection } = require('./src/db');
const retentionService = require('./src/services/retention.service');
const queueService = require('./src/services/queue.service');
const createLogger = require('./src/utils/logger');

const logger = createLogger('Server');

async function start() {
  try {
    await assertConnection();
    logger.info('Database connection OK');
  } catch (err) {
    logger.error('Database connection FAILED — is Postgres up? (docker compose up -d db)');
    logger.error(err.message);
    process.exit(1);
  }

  retentionService.start();

  try {
    await queueService.start();
  } catch (err) {
    logger.error('Processing queue failed to start:', err.message);
    process.exit(1);
  }

  app.listen(config.port, () => {
    logger.info(`Backend listening at http://localhost:${config.port}`);
    logger.info(`Using Hybrid Server at ${config.hybridServerUrl} for CLI processing.`);
  });
}

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    logger.info(`${sig} received — shutting down.`);
    await queueService.stop().catch(() => {});
    process.exit(0);
  });
}

start();
