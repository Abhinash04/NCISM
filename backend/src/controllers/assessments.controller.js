const path = require('path');
const fs = require('fs');
const assessmentService = require('../../services/assessment.service');
const ApiError = require('../utils/api-error');
const createLogger = require('../utils/logger');

const logger = createLogger('AssessmentsController');

class AssessmentsController {
  /**
   * Generate Assessment Report based on extracted data
   * POST /api/v1/assessment/generate
   * Body: { jobId }
   */
  async generateReport(req, res, next) {
    try {
      const { jobId } = req.body;

      if (!jobId) {
        return next(ApiError.badRequest('VALIDATION_ERROR', 'jobId is required'));
      }

      const jobsDir = path.join(__dirname, '..', '..', 'temp');
      const mdPath = path.join(jobsDir, jobId, 'output', 'input.md');

      if (!fs.existsSync(mdPath)) {
        return next(ApiError.notFound('ARTIFACT_NOT_FOUND', 'Extracted markdown not found for this job'));
      }

      const { reportMd } = await assessmentService.generateReport(jobId, mdPath);

      res.json({
        success: true,
        message: 'Assessment report generated successfully',
        reportContent: reportMd
      });
    } catch (error) {
      logger.error('Error generating report:', error);
      next(ApiError.internal('ASSESSMENT_FAILED', 'Failed to generate assessment report', error.message));
    }
  }
}

module.exports = new AssessmentsController();
