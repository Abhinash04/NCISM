const { found, missing } = require('./utils');
const { textElements, normText, findValueRowForLabel, parseNum } = require('./element-utils');

/**
 * Herbal garden species (section 2.6): label "Total Numbers of species
 * available" pairs with a value row "<required> <actual> - <actual> -" in the
 * same y-band — the actual is the token after the required one.
 */
function extract(markdown, lines, elements) {
  if (!elements) {
    return { herbalSpecies: missing() };
  }

  const els = textElements(elements);
  const hit = findValueRowForLabel(els, /Total Num(bers)? of species available/i);
  if (!hit) return { herbalSpecies: missing() };

  const actual = parseNum(hit.tokens[1]);
  return {
    herbalSpecies: actual !== null
      ? found(actual, 'herbal-garden-json', `"${normText(hit.label).slice(0, 40)}" -> "${hit.tokens.slice(0, 3).join(' ')}"`)
      : missing(),
  };
}

module.exports = { extract };
