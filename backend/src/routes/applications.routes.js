const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');
const uploadPdf = require('../middlewares/upload.middleware');
const controller = require('../controllers/application.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('application:read'), (req, res, next) => controller.list(req, res, next));
router.get('/committee-members', requirePermission('hearing:appoint'), (req, res, next) => controller.committeeMembers(req, res, next));
router.post('/', requirePermission('application:create'), uploadPdf.single('file'), (req, res, next) => controller.create(req, res, next));

router.get('/:id', requirePermission('application:read'), (req, res, next) => controller.get(req, res, next));
router.get('/:id/allowed-actions', requirePermission('application:read'), (req, res, next) => controller.allowedActions(req, res, next));
router.get('/:id/events', requirePermission('application:read'), (req, res, next) => controller.events(req, res, next));

router.post('/:id/process', requirePermission('application:process'), (req, res, next) => controller.process(req, res, next));
router.post('/:id/submit', requirePermission('application:submit'), (req, res, next) => controller.submit(req, res, next));
router.post('/:id/review', requirePermission('application:review'), (req, res, next) => controller.review(req, res, next));
router.post('/:id/decide', requirePermission('application:decide'), (req, res, next) => controller.decide(req, res, next));
router.post('/:id/revise', requirePermission('application:process'), (req, res, next) => controller.revise(req, res, next));

// Clarification cycle
router.get('/:id/clarifications', requirePermission('application:read'), (req, res, next) => controller.clarifications(req, res, next));
router.post('/:id/clarification', requirePermission('clarification:issue'), (req, res, next) => controller.requestClarification(req, res, next));
router.post('/:id/clarification/respond', requirePermission('clarification:respond'), uploadPdf.single('file'), (req, res, next) => controller.respondClarification(req, res, next));

// Hearings + final-order dispatch (Phase 3c)
router.get('/:id/hearings', requirePermission('application:read'), (req, res, next) => controller.hearings(req, res, next));
router.post('/:id/request-hearing', requirePermission('application:decide'), (req, res, next) => controller.requestHearing(req, res, next));
router.post('/:id/appoint-committee', requirePermission('hearing:appoint'), (req, res, next) => controller.appointCommittee(req, res, next));
router.post('/:id/hearing/minutes', requirePermission('hearing:conduct'), (req, res, next) => controller.recordMinutes(req, res, next));
router.post('/:id/dispatch', requirePermission('order:dispatch'), (req, res, next) => controller.dispatchOrder(req, res, next));

// Letters / orders (Phase 3d)
router.get('/:id/letters', requirePermission('application:read'), (req, res, next) => controller.letters(req, res, next));
router.post('/:id/letters/preview', requirePermission('application:read'), (req, res, next) => controller.previewLetter(req, res, next));

// Compliance / penalties (Phase 5a)
router.get('/:id/penalties', requirePermission('compliance:read'), (req, res, next) => controller.penalties(req, res, next));
router.post('/:id/penalties', requirePermission('compliance:manage'), (req, res, next) => controller.addPenalty(req, res, next));

module.exports = router;
