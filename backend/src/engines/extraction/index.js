const pdfPipeline = require('./pdf/pipeline');

/**
 * Extraction pipeline registry, keyed by input mimetype.
 * Future document types (DOCX, XLSX, images) register their pipelines here.
 */
const pipelines = {
  'application/pdf': pdfPipeline,
};

module.exports = pipelines;
