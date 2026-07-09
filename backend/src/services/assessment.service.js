const fs = require('fs');
const assessmentEngine = require('../engines/assessment');
const jobService = require('./job.service');
const ApiError = require('../utils/api-error');

class AssessmentService {
  /**
   * Runs the deterministic assessment engine for a job and persists the
   * report + machine-readable result as job artifacts.
   */
  async generate({ jobId, rulesetId, rulesetVersion }) {
    const mdPath = jobService.getArtifactPath(jobId, 'markdown');
    if (!mdPath || !fs.existsSync(mdPath)) {
      throw ApiError.notFound('ARTIFACT_NOT_FOUND', 'Extracted markdown not found for this job');
    }

    const markdown = fs.readFileSync(mdPath, 'utf8');

    let output;
    try {
      output = assessmentEngine.runAssessment({ markdown, rulesetId, rulesetVersion, jobId });
    } catch (error) {
      throw ApiError.internal('ASSESSMENT_FAILED', error.message);
    }

    jobService.saveArtifact(jobId, 'report', 'assessment_report.md', output.reportMarkdown);
    jobService.saveArtifact(jobId, 'assessment', 'assessment.json', JSON.stringify(output.result, null, 2));

    return output;
  }
}

module.exports = new AssessmentService();
