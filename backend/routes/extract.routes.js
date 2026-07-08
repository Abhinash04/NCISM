const express = require('express');
const multer = require('multer');
const extractController = require('../controllers/extract.controller');

const router = express.Router();
const upload = multer({ dest: 'temp/uploads/' }); // initial temp location before job creation

router.post('/extract', upload.single('files'), extractController.extract);

module.exports = router;
