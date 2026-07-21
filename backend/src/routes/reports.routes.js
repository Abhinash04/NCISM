const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');
const controller = require('../controllers/report.controller');

const router = express.Router();

router.use(authenticate);

router.get('/overview', requirePermission('report:read'), (req, res, next) => controller.overview(req, res, next));
router.get('/export', requirePermission('report:read'), (req, res, next) => controller.export(req, res, next));

module.exports = router;
