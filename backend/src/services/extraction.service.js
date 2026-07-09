const pipelines = require('../engines/extraction');
const ApiError = require('../utils/api-error');

class ExtractionService {
  /**
   * Runs the extraction pipeline registered for the given mimetype.
   * @param {string} inputPath - path to the uploaded document
   * @param {string} outputDir - directory receiving artifacts
   * @param {string} [mimetype='application/pdf']
   * @returns {Promise<{status: string, warnings: string[], failedPages: number[], artifacts: Object}>}
   */
  async extract(inputPath, outputDir, mimetype = 'application/pdf') {
    const pipeline = pipelines[mimetype];
    if (!pipeline) {
      throw ApiError.badRequest('UNSUPPORTED_FILE_TYPE', `No extraction pipeline for mimetype "${mimetype}"`);
    }
    return pipeline.run(inputPath, outputDir);
  }
}

module.exports = new ExtractionService();
