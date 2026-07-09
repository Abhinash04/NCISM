const express = require('express');
const assessmentsController = require('../controllers/assessments.controller');

const router = express.Router();

// Canonical: POST /api/v1/assessments
router.post('/', assessmentsController.generateReport);
// Legacy alias: POST /api/v1/assessment/generate (dropped once frontend migrates)
router.post('/generate', assessmentsController.generateReport);

module.exports = router;
