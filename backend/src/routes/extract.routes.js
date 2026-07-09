const express = require('express');
const upload = require('../middlewares/upload.middleware');
const extractController = require('../controllers/extract.controller');

const router = express.Router();

router.post('/extract', upload.single('files'), extractController.extract);

module.exports = router;
