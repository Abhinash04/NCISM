const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');
const controller = require('../controllers/penalty.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('compliance:read'), (req, res, next) => controller.queue(req, res, next));
router.patch('/:id', requirePermission('compliance:manage'), (req, res, next) => controller.updateStatus(req, res, next));
router.delete('/:id', requirePermission('compliance:manage'), (req, res, next) => controller.remove(req, res, next));

module.exports = router;
