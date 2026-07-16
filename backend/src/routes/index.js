const express = require('express');
const healthController = require('../controllers/health.controller');
const authRoutes = require('./auth.routes');
const extractRoutes = require('./extract.routes');
const jobsRoutes = require('./jobs.routes');
const assessmentsRoutes = require('./assessments.routes');
const institutionsRoutes = require('./institutions.routes');
const orgRoutes = require('./org.routes');
const applicationsRoutes = require('./applications.routes');

const router = express.Router();

router.get('/health', healthController.check);
router.use('/auth', authRoutes);
router.use('/', extractRoutes);
router.use('/jobs', jobsRoutes);
router.use('/assessments', assessmentsRoutes);
router.use('/assessment', assessmentsRoutes); // legacy alias
router.use('/institutions', institutionsRoutes);
router.use('/admin', orgRoutes);
router.use('/applications', applicationsRoutes);

module.exports = router;
