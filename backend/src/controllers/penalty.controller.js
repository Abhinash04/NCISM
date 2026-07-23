const penaltyService = require('../services/penalty.service');

class PenaltyController {
  /** GET /penalties?status= — cross-case compliance queue. */
  async queue(req, res, next) {
    try {
      const penalties = await penaltyService.queue({ status: req.query.status });
      res.json({ success: true, penalties });
    } catch (error) {
      next(error);
    }
  }

  /** PATCH /penalties/:id — update a penalty's status. */
  async updateStatus(req, res, next) {
    try {
      const penalty = await penaltyService.updateStatus(req.params.id, req.body?.status, req.user);
      res.json({ success: true, penalty });
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /penalties/:id — remove a penalty. */
  async remove(req, res, next) {
    try {
      await penaltyService.remove(req.params.id, req.user);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PenaltyController();
