const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');
const uploadPdf = require('../middlewares/upload.middleware');
const controller = require('../controllers/application.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('application:read'), (req, res, next) => controller.list(req, res, next));
router.post('/', requirePermission('application:create'), uploadPdf.single('file'), (req, res, next) => controller.create(req, res, next));

router.get('/:id', requirePermission('application:read'), (req, res, next) => controller.get(req, res, next));
router.get('/:id/allowed-actions', requirePermission('application:read'), (req, res, next) => controller.allowedActions(req, res, next));
router.get('/:id/events', requirePermission('application:read'), (req, res, next) => controller.events(req, res, next));

router.post('/:id/process', requirePermission('application:process'), (req, res, next) => controller.process(req, res, next));
router.post('/:id/submit', requirePermission('application:submit'), (req, res, next) => controller.submit(req, res, next));
router.post('/:id/review', requirePermission('application:review'), (req, res, next) => controller.review(req, res, next));
router.post('/:id/decide', requirePermission('application:decide'), (req, res, next) => controller.decide(req, res, next));
router.post('/:id/revise', requirePermission('application:process'), (req, res, next) => controller.revise(req, res, next));

module.exports = router;
