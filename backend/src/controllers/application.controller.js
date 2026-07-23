const applicationService = require('../services/application.service');
const auditService = require('../services/audit.service');

class ApplicationController {
  /** POST /applications — visitor upload (multipart: file + institutionId + session). */
  async create(req, res, next) {
    try {
      const b = req.body || {};
      const app = await applicationService.createUpload({
        file: req.file, user: req.user,
        institutionId: b.institutionId, session: b.session,
        intake: b.intake, level: b.level, permissionType: b.permissionType,
        visitationFrom: b.visitationFrom, visitationTo: b.visitationTo, visitationMode: b.visitationMode,
      });
      res.status(201).json({ success: true, application: app });
    } catch (error) {
      next(error);
    }
  }

  /** GET /applications — role-scoped queue. */
  async list(req, res, next) {
    try {
      const rows = await applicationService.list(req.user);
      res.json({ success: true, rows });
    } catch (error) {
      next(error);
    }
  }

  /** GET /applications/:id — case detail (incl. report) + allowedActions. */
  async get(req, res, next) {
    try {
      const application = await applicationService.getDetail(req.params.id, req.user);
      res.json({ success: true, application });
    } catch (error) {
      next(error);
    }
  }

  /** GET /applications/:id/source.pdf — stream the uploaded visitation report (viewer + download). */
  async sourcePdf(req, res, next) {
    try {
      const pdfPath = await applicationService.sourcePath(req.params.id, req.user);
      res.setHeader('Content-Type', 'application/pdf');
      res.sendFile(pdfPath);
    } catch (error) {
      next(error);
    }
  }

  async allowedActions(req, res, next) {
    try {
      const actions = await applicationService.allowedActionsFor(req.params.id, req.user);
      res.json({ success: true, actions });
    } catch (error) {
      next(error);
    }
  }

  async events(req, res, next) {
    try {
      const events = await applicationService.events(req.params.id);
      res.json({ success: true, events });
    } catch (error) {
      next(error);
    }
  }

  async process(req, res, next) {
    try {
      const application = await applicationService.process(req.params.id, req.user);
      res.json({ success: true, application });
    } catch (error) {
      next(error);
    }
  }

  async submit(req, res, next) {
    try {
      const application = await applicationService.submit(req.params.id, req.user);
      res.json({ success: true, application });
    } catch (error) {
      next(error);
    }
  }

  async review(req, res, next) {
    try {
      const application = await applicationService.review(req.params.id, req.user, req.body || {});
      res.json({ success: true, application });
    } catch (error) {
      next(error);
    }
  }

  async decide(req, res, next) {
    try {
      const application = await applicationService.decide(req.params.id, req.user, req.body || {});
      res.json({ success: true, application });
    } catch (error) {
      next(error);
    }
  }

  async revise(req, res, next) {
    try {
      const application = await applicationService.revise(req.params.id, req.user);
      res.json({ success: true, application });
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /applications/:id — hard-delete (uploader pre-processing, or admin override). */
  async remove(req, res, next) {
    try {
      const result = await applicationService.remove(req.params.id, req.user);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /** POST /applications/:id/clarification — board issues a clarification letter. */
  async requestClarification(req, res, next) {
    try {
      const application = await applicationService.requestClarification(req.params.id, req.user, req.body || {});
      res.json({ success: true, application });
    } catch (error) {
      next(error);
    }
  }

  /** POST /applications/:id/clarification/respond — college responds (multipart). */
  async respondClarification(req, res, next) {
    try {
      const application = await applicationService.respondClarification(req.params.id, req.user, {
        file: req.file, responseText: req.body?.responseText,
      });
      res.json({ success: true, application });
    } catch (error) {
      next(error);
    }
  }

  /** POST /applications/:id/clarification/review — junior consultant reviews clarification. */
  async reviewClarification(req, res, next) {
    try {
      const application = await applicationService.reviewClarification(req.params.id, req.user, req.body || {});
      res.json({ success: true, application });
    } catch (error) {
      next(error);
    }
  }

  /** POST /applications/:id/clarification/revise — junior consultant requests revision R1/R2. */
  async requestRevision(req, res, next) {
    try {
      const application = await applicationService.requestRevision(req.params.id, req.user, req.body || {});
      res.json({ success: true, application });
    } catch (error) {
      next(error);
    }
  }

  async clarifications(req, res, next) {
    try {
      const clarifications = await applicationService.clarifications(req.params.id);
      res.json({ success: true, clarifications });
    } catch (error) {
      next(error);
    }
  }

  async requestHearing(req, res, next) {
    try {
      const application = await applicationService.requestHearing(req.params.id, req.user, req.body || {});
      res.json({ success: true, application });
    } catch (error) {
      next(error);
    }
  }

  async appointCommittee(req, res, next) {
    try {
      const application = await applicationService.appointCommittee(req.params.id, req.user, req.body || {});
      res.json({ success: true, application });
    } catch (error) {
      next(error);
    }
  }

  async recordMinutes(req, res, next) {
    try {
      const application = await applicationService.recordMinutes(req.params.id, req.user, req.body || {});
      res.json({ success: true, application });
    } catch (error) {
      next(error);
    }
  }

  async dispatchOrder(req, res, next) {
    try {
      const application = await applicationService.dispatchOrder(req.params.id, req.user, req.body || {});
      res.json({ success: true, application });
    } catch (error) {
      next(error);
    }
  }

  async hearings(req, res, next) {
    try {
      const hearings = await applicationService.hearings(req.params.id);
      res.json({ success: true, hearings });
    } catch (error) {
      next(error);
    }
  }

  async committeeMembers(req, res, next) {
    try {
      const members = await applicationService.committeeMembers();
      res.json({ success: true, members });
    } catch (error) {
      next(error);
    }
  }

  async letters(req, res, next) {
    try {
      const letters = await applicationService.letters(req.params.id);
      res.json({ success: true, letters });
    } catch (error) {
      next(error);
    }
  }

  async previewLetter(req, res, next) {
    try {
      const content = await applicationService.previewLetter(req.params.id, req.user, req.body?.kind);
      res.json({ success: true, content });
    } catch (error) {
      next(error);
    }
  }

  async penalties(req, res, next) {
    try {
      const penalties = await applicationService.penalties(req.params.id);
      res.json({ success: true, penalties });
    } catch (error) {
      next(error);
    }
  }

  async addPenalty(req, res, next) {
    try {
      const penalty = await applicationService.addPenalty(req.params.id, req.user, req.body || {});
      res.status(201).json({ success: true, penalty });
    } catch (error) {
      next(error);
    }
  }

  /** Monetary penalty rates derived from the case's active punitive policy. */
  async penaltyPolicy(req, res, next) {
    try {
      const policy = await applicationService.penaltyPolicy(req.params.id, req.user);
      res.json({ success: true, policy });
    } catch (error) {
      next(error);
    }
  }

  /** Records an AI-generated draft in the audit log (Bug 2 traceability). */
  async aiLog(req, res, next) {
    try {
      await auditService.record({
        actor_id: req.user?.id || null,
        actor_email: req.user?.email || null,
        action: 'ai-generate',
        entity: 'applications',
        entity_id: req.params.id,
        path: req.originalUrl.split('?')[0],
        status: 200,
        meta: { field: req.body?.field || null, kind: 'generated', content: req.body?.content || '' },
        ip: req.ip,
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ApplicationController();
