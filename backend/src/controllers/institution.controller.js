const institutionService = require('../services/institution.service');
const ApiError = require('../utils/api-error');
const createLogger = require('../utils/logger');

const logger = createLogger('InstitutionController');

class InstitutionController {
  /** GET /institutions?system=&state=&q=&page=&limit= */
  async list(req, res, next) {
    try {
      const { system, state, q, page, limit } = req.query;
      const result = await institutionService.list({ system, state, q, page, limit });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /** GET /institutions/meta — distinct systems + states for filters. */
  async meta(req, res, next) {
    try {
      const facets = await institutionService.facets();
      res.json({ success: true, ...facets });
    } catch (error) {
      next(error);
    }
  }

  /** GET /institutions/:id */
  async get(req, res, next) {
    try {
      const institution = await institutionService.get(req.params.id);
      res.json({ success: true, institution });
    } catch (error) {
      next(error);
    }
  }

  /** POST /institutions */
  async create(req, res, next) {
    try {
      const institution = await institutionService.create(req.body || {});
      res.status(201).json({ success: true, institution });
    } catch (error) {
      next(error);
    }
  }

  /** PATCH /institutions/:id */
  async update(req, res, next) {
    try {
      const institution = await institutionService.update(req.params.id, req.body || {});
      res.json({ success: true, institution });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /institutions/import
   * Accepts an uploaded .md/.csv file (field `file`) or a JSON body `{ text }`.
   */
  async import(req, res, next) {
    try {
      const text = req.file ? req.file.buffer.toString('utf8') : req.body?.text;
      if (!text || !text.trim()) {
        return next(ApiError.badRequest('VALIDATION_ERROR', 'Provide a markdown/csv file or { text }'));
      }
      const summary = await institutionService.importFromMarkdown(text);
      logger.info(`Import: parsed=${summary.parsed} inserted=${summary.inserted} updated=${summary.updated} exceptions=${summary.exceptions.length}`);
      res.json({ success: true, ...summary });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InstitutionController();
