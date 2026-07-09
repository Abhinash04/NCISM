const { found, missing, findNumber } = require('./utils');

/**
 * Only constructed-area-of-college is extracted today: it was verified
 * correct against all three golden colleges. The other infrastructure
 * figures (hospital/herbal area, lecture-hall area and count) match MESAR
 * *requirement* rows in the proforma rather than the assessed actuals and
 * were extracting wrong values — they stay missing (-> "manual verification
 * required") until row-context-aware extraction from the element JSON lands.
 */
function extract(markdown, lines) {
  const hit = findNumber(markdown, lines, /constructed area of (the )?college/i);

  return {
    constructedAreaCollegeSqm: hit && hit.value !== null
      ? found(hit.value, 'infrastructure', hit.evidence)
      : missing(),
    constructedAreaHospitalSqm: missing(),
    constructedAreaHerbalSqm: missing(),
    lectureHallsAreaSqm: missing(),
    lectureHallsCount: missing(),
  };
}

module.exports = { extract };
