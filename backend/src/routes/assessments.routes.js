const express = require('express');
const assessmentsController = require('../controllers/assessments.controller');

const router = express.Router();

router.post('/generate', assessmentsController.generateReport);

module.exports = router;
