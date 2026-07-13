const institution = require('./institution.extractor');
const infrastructure = require('./infrastructure.extractor');
const library = require('./library.extractor');
const herbalGarden = require('./herbal-garden.extractor');
const staffing = require('./staffing.extractor');
const hospital = require('./hospital.extractor');
const aebas = require('./aebas.extractor');
const observations = require('./observations.extractor');

const extractors = [institution, infrastructure, library, herbalGarden, staffing, hospital, aebas, observations];

/**
 * Runs every extractor over the reconstructed markdown and the element JSON
 * (structured tables, lists, geometry) and merges their parameters into one
 * ParameterSet: { [name]: {value, status, source?} }.
 *
 * @param {string} markdown - reconstructed markdown
 * @param {Object|null} elements - OpenDataLoader element JSON root, if available
 */
function extractParameters(markdown, elements = null) {
  const lines = markdown.split('\n').map((l) => l.trim()).filter(Boolean);

  const parameters = {};
  for (const extractor of extractors) {
    Object.assign(parameters, extractor.extract(markdown, lines, elements));
  }
  return parameters;
}

module.exports = { extractParameters };
