const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');
const controller = require('../controllers/meeting.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('application:read'), (req, res, next) => controller.list(req, res, next));
router.get('/:id', requirePermission('application:read'), (req, res, next) => controller.get(req, res, next));
router.post('/', requirePermission('meeting:manage'), (req, res, next) => controller.create(req, res, next));
router.patch('/:id', requirePermission('meeting:manage'), (req, res, next) => controller.update(req, res, next));
router.post('/:id/items', requirePermission('meeting:manage'), (req, res, next) => controller.addItem(req, res, next));
router.patch('/:id/items/:itemId', requirePermission('meeting:manage'), (req, res, next) => controller.updateItem(req, res, next));
router.post('/:id/confirm', requirePermission('meeting:manage'), (req, res, next) => controller.confirm(req, res, next));

module.exports = router;
