const fs = require('fs');
const multer = require('multer');
const config = require('../config');
const ApiError = require('../utils/api-error');

fs.mkdirSync(config.uploadsDir, { recursive: true });

const upload = multer({
  dest: config.uploadsDir,
  limits: { fileSize: config.maxUploadMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      return cb(null, true);
    }
    cb(ApiError.badRequest(
      'UNSUPPORTED_FILE_TYPE',
      `Unsupported file type "${file.mimetype}". Only PDF documents are supported.`
    ));
  },
});

module.exports = upload;
