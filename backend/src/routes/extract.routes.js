const express = require('express');
const upload = require('../middlewares/upload.middleware');
const extractController = require('../controllers/extract.controller');

const router = express.Router();

router.post('/extract', upload.single('file'), extractController.extract);

module.exports = router;
