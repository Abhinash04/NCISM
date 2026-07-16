const meetingService = require('../services/meeting.service');

class MeetingController {
  async list(req, res, next) {
    try {
      const meetings = await meetingService.list();
      res.json({ success: true, meetings });
    } catch (error) {
      next(error);
    }
  }

  async get(req, res, next) {
    try {
      const meeting = await meetingService.get(req.params.id);
      res.json({ success: true, meeting });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const meeting = await meetingService.create({ number: req.body?.number, scheduledAt: req.body?.scheduledAt, user: req.user });
      res.status(201).json({ success: true, meeting });
    } catch (error) {
      next(error);
    }
  }

  async addItem(req, res, next) {
    try {
      const meeting = await meetingService.addItem(req.params.id, req.body?.applicationId);
      res.json({ success: true, meeting });
    } catch (error) {
      next(error);
    }
  }

  async confirm(req, res, next) {
    try {
      const meeting = await meetingService.confirm(req.params.id, req.body?.minutesText);
      res.json({ success: true, meeting });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MeetingController();
