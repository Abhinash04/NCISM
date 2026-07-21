const institution = require('./institution.extractor');
const infrastructure = require('./infrastructure.extractor');
const library = require('./library.extractor');
const herbalGarden = require('./herbal-garden.extractor');
const staffing = require('./staffing.extractor');
const hospital = require('./hospital.extractor');
const aebas = require('./aebas.extractor');
const observations = require('./observations.extractor');

const extractors = [institution, infrastructure, library, herbalGarden, staffing, hospital, aebas, observations];

// Naming reconciliation: some non-Ayurveda / PG rules reference a parameter that
// an existing extractor already emits under a different name (same datum on the
// shared proforma). Copy the canonical value across when the alias was not
// independently found. Precision-first: only aliases a `found` value.
const ALIASES = {
  bedOccupancy: 'bedOccupancyPercent',
  herbalGardenSpecies: 'herbalSpecies',
  herbalGardenAreaSqm: 'constructedAreaHerbalSqm',
  digitalLibraryComputers: 'libraryComputers',
  libraryDigitalStations: 'libraryComputers',
};

function reconcile(parameters) {
  for (const [alias, canon] of Object.entries(ALIASES)) {
    if (parameters[alias] && parameters[alias].status === 'found') continue; // a dedicated extractor won
    const c = parameters[canon];
    parameters[alias] = c && c.status === 'found'
      ? { value: c.value, status: 'found', source: { ...(c.source || {}), aliasOf: canon } }
      : (parameters[alias] || { value: null, status: 'missing' });
  }
}

/**
 * Runs every extractor over the reconstructed markdown and the element JSON
 * (structured tables, lists, geometry) and merges their parameters into one
 * ParameterSet: { [name]: {value, status, source?} }.
 *
 * @param {string} markdown - reconstructed markdown
 * @param {Object|null} elements - OpenDataLoader element JSON root, if available
 * @param {Object|null} cdm - Canonical Document Model, if available
 */
function extractParameters(markdown, elements = null, cdm = null) {
  const lines = markdown.split('\n').map((l) => l.trim()).filter(Boolean);

  const parameters = {};
  for (const extractor of extractors) {
    Object.assign(parameters, extractor.extract(markdown, lines, elements, cdm));
  }
  reconcile(parameters);
  return parameters;
}

module.exports = { extractParameters };
