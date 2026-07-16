const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');
const institutionController = require('../controllers/institution.controller');

const router = express.Router();

// Import accepts small text files (.md/.csv) held in memory.
const uploadText = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

router.get('/', requirePermission('institution:read'), (req, res, next) => institutionController.list(req, res, next));
router.get('/meta', requirePermission('institution:read'), (req, res, next) => institutionController.meta(req, res, next));
router.get('/:id', requirePermission('institution:read'), (req, res, next) => institutionController.get(req, res, next));
router.post('/', requirePermission('institution:create'), (req, res, next) => institutionController.create(req, res, next));
router.patch('/:id', requirePermission('institution:update'), (req, res, next) => institutionController.update(req, res, next));
router.post(
  '/import',
  requirePermission('institution:create'),
  uploadText.single('file'),
  (req, res, next) => institutionController.import(req, res, next),
);

module.exports = router;
