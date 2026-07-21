const { found, missing, findNumber } = require('./utils');
const { textElements, normText, findValueRowForLabel, parseNum } = require('./element-utils');

// Inline proforma rows shaped "<label> <required> <actual> ...": the actual is
// the SECOND number after the label (the first is the MSR requirement). Used for
// single-line rows the geometric label→value-row pairing does not cover (e.g.
// "Total Land Area(in acres) 5 5.285 Yes Yes"). System-agnostic — the Part-I
// proforma labels are shared across Ayurveda/Unani/Siddha/Sowa-Rigpa.
function secondNumberAfter(els, labelRegex, extractor) {
  for (const e of els) {
    const match = normText(e).match(labelRegex);
    if (match) {
      const actual = parseNum(match[2]);
      if (actual !== null) return found(actual, extractor, normText(e).slice(0, 80));
    }
  }
  return missing();
}

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

// Fields the Ayurveda rules never checked but the non-Ayurveda / PG rulesets do.
// Each returns missing() when its proforma anchor is absent (precision-first);
// PG-only areas stay missing on a UG report and populate on a PG report of the
// same proforma.
const EXTRA_KEYS = [
  'landAcres', 'constructedAreaTotalSqm', 'clinicalSkillRooms', 'clinicalDepartments',
  'seminarHallAvailable', 'centralLibraryAreaSqm', 'digitalLibraryAreaSqm',
  'studentSupportCellAreaSqm', 'pgDepartmentAreaSqm',
];

function extract(markdown, lines, elements) {
  if (!elements) {
    const out = {
      constructedAreaCollegeSqm: missing(),
      constructedAreaHospitalSqm: missing(),
      constructedAreaHerbalSqm: missing(),
      lectureHallsAreaSqm: missing(),
      lectureHallsCount: missing(),
    };
    for (const k of EXTRA_KEYS) out[k] = missing();
    return out;
  }

  const els = textElements(elements);

  const params = {
    constructedAreaCollegeSqm: areaFromLabel(els, /Constructed Area of\s*College\s*\(sq\.?\s*mt\)/i, 'infrastructure-json'),
    constructedAreaHospitalSqm: areaFromLabel(els, /Constructed Area of\s*hospital\s*\(sq\.?\s*mt\)/i, 'infrastructure-json'),
    constructedAreaHerbalSqm: areaFromLabel(els, /Area of the Herbal Garden\s*\(/i, 'infrastructure-json'),
    lectureHallsAreaSqm: lectureHallsArea(els),
    lectureHallsCount: lectureHallsCount(els),
  };

  // Land (inline "Total Land Area(in acres) <required> <actual> ...").
  params.landAcres = secondNumberAfter(els, /Total Land Area\s*\(in acres\)\s+([\d.,]+)\s+([\d.,]+)/i, 'infrastructure-land');

  // Total constructed area (college + hospital) when both are known; else a proforma label.
  const col = params.constructedAreaCollegeSqm;
  const hos = params.constructedAreaHospitalSqm;
  if (col.status === 'found' && hos.status === 'found') {
    params.constructedAreaTotalSqm = found(Math.round((col.value + hos.value) * 100) / 100, 'infrastructure-derived', 'college + hospital');
  } else {
    params.constructedAreaTotalSqm = findNum(markdown, lines, /Total Constructed Area\b/i);
  }

  // Seminar hall / auditorium — presence of the proforma row (boolean).
  params.seminarHallAvailable = els.some((e) => /Auditorium.{0,4}Seminar Hall|Seminar Hall\b/i.test(normText(e)))
    ? found(true, 'infrastructure-json', 'seminar/auditorium row present')
    : missing();

  // Label-ready fields (UG non-Ayurveda + PG). Missing on the Ayurveda sample;
  // populate on a report of the same proforma that lists them.
  params.clinicalSkillRooms = findNum(markdown, lines, /Clinical Skill.{0,20}(Lab|rooms?|Simulation)/i);
  params.clinicalDepartments = findNum(markdown, lines, /(number|no\.?) of clinical departments?/i);
  params.centralLibraryAreaSqm = findNum(markdown, lines, /Central Library.{0,15}Area\b|Area of.{0,10}Central Library/i);
  params.digitalLibraryAreaSqm = findNum(markdown, lines, /Digital Library.{0,15}Area\b|Area of.{0,10}Digital Library/i);
  params.studentSupportCellAreaSqm = findNum(markdown, lines, /Student Support.{0,20}(Cell|Guidance)/i);
  params.pgDepartmentAreaSqm = findNum(markdown, lines, /(Postgraduate|PG) (teaching )?department.{0,10}area/i);

  return params;
}

// Wrap findNumber into the found/missing envelope.
function findNum(markdown, lines, labelRegex) {
  const hit = findNumber(markdown, lines, labelRegex);
  return hit && hit.value !== null ? found(hit.value, 'infrastructure', hit.evidence) : missing();
}

module.exports = { extract };
