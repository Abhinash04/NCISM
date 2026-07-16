const auditService = require('../services/audit.service');

class AuditController {
  /** GET /audit?entity=&actorId=&from=&to=&page=&limit= */
  async list(req, res, next) {
    try {
      const { entity, actorId, from, to, page, limit } = req.query;
      const result = await auditService.list({ entity, actorId, from, to, page, limit });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuditController();
