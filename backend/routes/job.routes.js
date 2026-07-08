const express = require('express');
const jobController = require('../controllers/job.controller');

const router = express.Router();

router.get('/:jobId', jobController.getJob);
router.get('/:jobId/artifacts/:type', jobController.getArtifact);

module.exports = router;
