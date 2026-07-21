const rulesetService = require('../services/ruleset.service');

class RulesetController {
  /** GET /rulesets — registry of ruleset versions + which is active. */
  async list(req, res, next) {
    try {
      const rulesets = await rulesetService.list();
      res.json({ success: true, rulesets });
    } catch (error) {
      next(error);
    }
  }

  /** GET /rulesets/:id — one ruleset version. */
  async get(req, res, next) {
    try {
      const ruleset = await rulesetService.get(req.params.id);
      res.json({ success: true, ruleset });
    } catch (error) {
      next(error);
    }
  }

  /** POST /rulesets/:id/activate — activate for its (system, level) with a Board ref (SoD). */
  async activate(req, res, next) {
    try {
      const ruleset = await rulesetService.activate(req.params.id, { boardRef: req.body?.boardRef, actor: req.user });
      res.json({ success: true, ruleset });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RulesetController();
