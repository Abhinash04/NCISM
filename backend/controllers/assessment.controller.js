const path = require('path');
const fs = require('fs');
const assessmentService = require('../services/assessment.service');

class AssessmentController {
    /**
     * Generate Assessment Report based on extracted data
     * POST /api/v1/assessment/generate
     * Body: { jobId }
     */
    async generateReport(req, res) {
        try {
            const { jobId } = req.body;
            
            if (!jobId) {
                return res.status(400).json({ error: 'jobId is required' });
            }

            const jobsDir = path.join(__dirname, '..', 'temp');
            const jobDir = path.join(jobsDir, jobId);
            const mdPath = path.join(jobDir, 'output', 'input.md');
            
            if (!fs.existsSync(mdPath)) {
                return res.status(404).json({ error: `Extracted markdown not found for this job at ${mdPath}` });
            }

            const { reportPath, reportMd } = await assessmentService.generateReport(jobId, mdPath);
            
            res.json({
                success: true,
                message: 'Assessment report generated successfully',
                reportUrl: `/api/v1/jobs/${jobId}/download?file=assessment_report.md`,
                reportContent: reportMd
            });
        } catch (error) {
            console.error('[AssessmentController] Error generating report:', error);
            res.status(500).json({ error: 'Failed to generate assessment report', details: error.message });
        }
    }
}

module.exports = new AssessmentController();
