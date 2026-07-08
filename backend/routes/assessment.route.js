const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessment.controller');

// Route to generate assessment report
router.post('/generate', assessmentController.generateReport);

module.exports = router;
