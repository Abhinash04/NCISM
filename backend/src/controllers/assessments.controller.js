const assessmentService = require('../services/assessment.service');
const jobService = require('../services/job.service');
const ApiError = require('../utils/api-error');
const createLogger = require('../utils/logger');

const logger = createLogger('AssessmentsController');

class AssessmentsController {
  /**
   * POST /api/v1/assessments          (canonical)
   * POST /api/v1/assessment/generate  (legacy alias)
   * Body: { jobId, rulesetId?, rulesetVersion? }
   */
  async generateReport(req, res, next) {
    try {
      const { jobId, rulesetId, rulesetVersion } = req.body;

      if (!jobId) {
        return next(ApiError.badRequest('VALIDATION_ERROR', 'jobId is required'));
      }

      const { result, reportMarkdown } = await assessmentService.generate({ jobId, rulesetId, rulesetVersion });

      // Refreshed job DTO now carries report/assessment artifact URLs.
      const manifest = jobService.getManifest(jobId);
      const job = manifest ? jobService.toJobDto(manifest) : null;

      res.json({
        success: true,
        assessment: {
          jobId,
          rulesetId: result.rulesetId,
          rulesetVersion: result.rulesetVersion,
          result,
          reportMarkdown,
        },
        job,
        // Legacy field kept until the frontend migrates (dropped in WS5).
        reportContent: reportMarkdown,
      });
    } catch (error) {
      if (error instanceof ApiError) return next(error);
      logger.error('Error generating report:', error);
      next(ApiError.internal('ASSESSMENT_FAILED', error.message));
    }
  }
}

module.exports = new AssessmentsController();
