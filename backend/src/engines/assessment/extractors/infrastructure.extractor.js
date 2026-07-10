const { found, missing } = require('./utils');
const { textElements, normText, findValueRowForLabel, parseNum } = require('./element-utils');

/**
 * Infrastructure figures from the element JSON (section 2.1/2.2/2.3 of the
 * Part-I proforma). The flattened blocks pair a label paragraph with a value
 * row "<required> <actual> ..." in the same y-band — the actual is always
 * the token AFTER the MSR-required token. AYU0659 interleaves the college and
 * hospital label/value pairs, which is why association is geometric, never
 * adjacent.
 *
 * Everything returns missing() when the anchor is absent — precision first.
 */
function areaFromLabel(els, labelRegex, extractor) {
  const hit = findValueRowForLabel(els, labelRegex);
  if (!hit) return missing();
  const actual = parseNum(hit.tokens[1]);
  return actual !== null
    ? found(actual, extractor, `"${normText(hit.label).slice(0, 50)}" -> "${hit.tokens.slice(0, 3).join(' ')}"`)
    : missing();
}

/** "... Total Area of Lecturer Halls <required> <actual> <short>" */
function lectureHallsArea(els) {
  for (const e of els) {
    const match = normText(e).match(/Total Area of Lect\w* Halls\s+([\d.,]+)\s+([\d.,]+)/i);
    if (match) {
      const actual = parseNum(match[2]);
      if (actual !== null) return found(actual, 'infrastructure-json', normText(e).slice(0, 80));
    }
  }
  return missing();
}

/** "No. of Lecture Halls <required> <actual> <short>" */
function lectureHallsCount(els) {
  for (const e of els) {
    const match = normText(e).match(/No\.? of Lecture Halls\s+(\d+)\s+(\d+)/i);
    if (match) {
      const actual = parseNum(match[2]);
      if (actual !== null) return found(actual, 'infrastructure-json', normText(e).slice(0, 80));
    }
  }
  return missing();
}

function extract(markdown, lines, elements) {
  if (!elements) {
    return {
      constructedAreaCollegeSqm: missing(),
      constructedAreaHospitalSqm: missing(),
      constructedAreaHerbalSqm: missing(),
      lectureHallsAreaSqm: missing(),
      lectureHallsCount: missing(),
    };
  }

  const els = textElements(elements);

  return {
    constructedAreaCollegeSqm: areaFromLabel(els, /Constructed Area of\s*College\s*\(sq\.?\s*mt\)/i, 'infrastructure-json'),
    constructedAreaHospitalSqm: areaFromLabel(els, /Constructed Area of\s*hospital\s*\(sq\.?\s*mt\)/i, 'infrastructure-json'),
    constructedAreaHerbalSqm: areaFromLabel(els, /Area of the Herbal Garden\s*\(/i, 'infrastructure-json'),
    lectureHallsAreaSqm: lectureHallsArea(els),
    lectureHallsCount: lectureHallsCount(els),
  };
}

module.exports = { extract };
