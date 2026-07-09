const { missing } = require('./utils');

/**
 * The "number of species" labels in the proforma sit next to MESAR
 * requirement columns and extracted wrong values (e.g. 10 for a garden with
 * 290 species). Stays missing until row-context-aware extraction lands.
 */
function extract() {
  return {
    herbalSpecies: missing(),
  };
}

module.exports = { extract };
