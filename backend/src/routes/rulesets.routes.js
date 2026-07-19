const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');
const controller = require('../controllers/ruleset.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('ruleset:read'), (req, res, next) => controller.list(req, res, next));
router.get('/:id', requirePermission('ruleset:read'), (req, res, next) => controller.get(req, res, next));
router.post('/:id/activate', requirePermission('ruleset:activate'), (req, res, next) => controller.activate(req, res, next));

module.exports = router;
