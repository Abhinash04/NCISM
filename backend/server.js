const config = require('./src/config');
const app = require('./src/app');
const retentionService = require('./src/services/retention.service');
const createLogger = require('./src/utils/logger');

const logger = createLogger('Server');

retentionService.start();

app.listen(config.port, () => {
  logger.info(`Backend listening at http://localhost:${config.port}`);
  logger.info(`Using Hybrid Server at ${config.hybridServerUrl} for CLI processing.`);
});
