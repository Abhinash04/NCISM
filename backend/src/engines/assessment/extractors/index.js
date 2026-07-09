const institution = require('./institution.extractor');
const infrastructure = require('./infrastructure.extractor');
const library = require('./library.extractor');
const herbalGarden = require('./herbal-garden.extractor');
const staffing = require('./staffing.extractor');
const hospital = require('./hospital.extractor');

const extractors = [institution, infrastructure, library, herbalGarden, staffing, hospital];

/**
 * Runs every extractor over the reconstructed markdown and merges their
 * parameters into one ParameterSet: { [name]: {value, status, source?} }.
 */
function extractParameters(markdown) {
  const lines = markdown.split('\n').map((l) => l.trim()).filter(Boolean);

  const parameters = {};
  for (const extractor of extractors) {
    Object.assign(parameters, extractor.extract(markdown, lines));
  }
  return parameters;
}

module.exports = { extractParameters };
