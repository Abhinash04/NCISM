const reportService = require('../services/report.service');

const DATASETS = new Set(['cases', 'penalties']);

class ReportController {
  /** GET /reports/overview — bundled KPIs + distributions + trends. */
  async overview(req, res, next) {
    try {
      const data = await reportService.overview();
      res.json({ success: true, ...data });
    } catch (error) {
      next(error);
    }
  }

  /** GET /reports/export?dataset=cases|penalties — CSV attachment. */
  async export(req, res, next) {
    try {
      const dataset = DATASETS.has(req.query.dataset) ? req.query.dataset : 'cases';
      const csv = await reportService.exportCsv(dataset);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${dataset}-report.csv"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();
