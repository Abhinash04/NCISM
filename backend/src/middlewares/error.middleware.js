const multer = require('multer');
const ApiError = require('../utils/api-error');
const createLogger = require('../utils/logger');

const logger = createLogger('ErrorMiddleware');

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}` },
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const code = err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR';
    return res.status(400).json({
      success: false,
      error: { code, message: err.message },
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.details !== undefined && { details: err.details }) },
    });
  }

  logger.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL', message: 'Internal server error' },
  });
}

module.exports = { notFoundHandler, errorHandler };
