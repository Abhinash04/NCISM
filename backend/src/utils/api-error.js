class ApiError extends Error {
  /**
   * @param {number} status - HTTP status code
   * @param {string} code - machine-readable error code (e.g. JOB_NOT_FOUND)
   * @param {string} message - human-readable message
   * @param {*} [details] - optional extra context
   */
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(code, message, details) {
    return new ApiError(400, code, message, details);
  }

  static notFound(code, message, details) {
    return new ApiError(404, code, message, details);
  }

  static internal(code, message, details) {
    return new ApiError(500, code, message, details);
  }
}

module.exports = ApiError;
