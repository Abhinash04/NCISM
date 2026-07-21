const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { requirePermission, requireRole } = require('../middlewares/rbac.middleware');
const orgController = require('../controllers/org.controller');

const router = express.Router();

// Admin-only console: user/role/permission catalogue (read).
router.use(authenticate, requireRole('admin'));

router.get('/users', requirePermission('user:manage'), (req, res, next) => orgController.listUsers(req, res, next));
router.get('/users/:id', requirePermission('user:manage'), (req, res, next) => orgController.getUser(req, res, next));
router.get('/roles', requirePermission('role:read'), (req, res, next) => orgController.listRoles(req, res, next));
router.get('/permissions', requirePermission('role:read'), (req, res, next) => orgController.listPermissions(req, res, next));

module.exports = router;
