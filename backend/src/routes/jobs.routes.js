const express = require('express');
const jobsController = require('../controllers/jobs.controller');

const router = express.Router();

router.get('/:jobId', jobsController.getJob);
router.get('/:jobId/artifacts/:type', jobsController.getArtifact);

module.exports = router;
