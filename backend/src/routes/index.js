const express = require('express');
const healthController = require('../controllers/health.controller');
const extractRoutes = require('./extract.routes');
const jobsRoutes = require('./jobs.routes');
const assessmentsRoutes = require('./assessments.routes');

const router = express.Router();

router.get('/health', healthController.check);
router.use('/', extractRoutes);
router.use('/jobs', jobsRoutes);
router.use('/assessment', assessmentsRoutes);

module.exports = router;
