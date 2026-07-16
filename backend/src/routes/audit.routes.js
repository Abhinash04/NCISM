const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');
const controller = require('../controllers/audit.controller');

const router = express.Router();

router.use(authenticate);
router.get('/', requirePermission('audit:read'), (req, res, next) => controller.list(req, res, next));

module.exports = router;
