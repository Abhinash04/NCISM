const { found, missing, findNumber } = require('./utils');
const { textElements, normText, yOverlaps, findNumberAfter } = require('./element-utils');

/**
 * Hospital functionality metrics stay on the markdown path — the structured
 * "Required | Available | Short comings" tables flatten cleanly and the
 * markdown extraction is verified against all three golden colleges.
 */
const FIELDS = [
  { param: 'opdCount', label: /total number of OPD\b/i },
  { param: 'opdTotalPatients', label: /total number of patients attended OPD/i },
  { param: 'opdAverageDaily', label: /average attendance of patients? in OPD per day/i },
  { param: 'ipdTotalPatients', label: /(total )?(number|no\.?) of patients admitted/i },
  { param: 'bedOccupancyPercent', label: /average bed occupancy/i },
  { param: 'deliveries', label: /(number|no\.?) of deliveries/i },
  { param: 'operations', label: /(number|no\.?) of operations/i },
  { param: 'equipmentMeanPercent', label: /mean of general and essential equipment/i },
];

/**
 * Hospital staff (section 6.1 of the proforma) is NOT detected as a table —
 * it flattens to paragraphs. Two row shapes:
 *   inline:  "4 Emergency Medical Officers 2 2 -"           (label + numbers)
 *   split:   label paragraph + "9 7 2" value row in the same y-band
 * Column order per the section header: Required | Available (Part II) | Short.
 */
const SECTION_HEADER_RE = /^(Sr\.?\s*No\.?|Hospital Staff\/?Name|Required as per|Available Hospital|Short ?Comings?)/i;

function parseHospitalStaff(els) {
  const sectionStart = els.findIndex((e) => /Hospital Staff Verification/i.test(normText(e)));
  if (sectionStart === -1) return null;

  let sectionEnd = els.length;
  const relEnd = els.slice(sectionStart + 1).findIndex((e) =>
    /Hospital staff listed by the college|Hospital Functioning|^6\.2\b/i.test(normText(e))
  );
  if (relEnd !== -1) sectionEnd = sectionStart + 1 + relEnd;

  const section = els.slice(sectionStart + 1, sectionEnd);

  const rows = [];
  const leftoverTriples = [];
  const leftoverLabels = [];

  for (const e of section) {
    const text = normText(e);

    const inline = text.match(/^(\d+)\s+(.+?)\s+(\d+)\s+(\d+)\s+(\d+|-)$/);
    if (inline && /[A-Za-z]/.test(inline[2])) {
      rows.push({ post: inline[2], required: parseInt(inline[3], 10), existing: parseInt(inline[4], 10) });
      continue;
    }

    if (/^\d+\s+\d+\s+[\d-]+$/.test(text)) {
      leftoverTriples.push(e);
      continue;
    }

    if (/[A-Za-z]{4,}/.test(text) && !SECTION_HEADER_RE.test(text)) {
      leftoverLabels.push(e);
    }
  }

  // Pair split label/value rows geometrically.
  for (const triple of leftoverTriples) {
    const label = leftoverLabels.find(
      (l) => l['page number'] === triple['page number'] && yOverlaps(l, triple)
    );
    if (!label) continue;
    const [required, existing] = normText(triple).split(/\s+/).map((n) => parseInt(n, 10));
    rows.push({ post: normText(label).replace(/^\d+\s+/, ''), required, existing });
  }

  return rows.length > 0 ? rows : null;
}

function extract(markdown, lines, elements) {
  const params = {};
  for (const field of FIELDS) {
    const hit = findNumber(markdown, lines, field.label);
    params[field.param] = hit && hit.value !== null
      ? found(hit.value, 'hospital', hit.evidence)
      : missing();
  }
  params.centralRegistrationAvailable = missing();
  params.hospitalStaff = missing();

  if (elements) {
    const els = textElements(elements);
    const rows = parseHospitalStaff(els);
    if (rows) {
      const listed = findNumberAfter(els, /Hospital staff listed by the college\s+(\d+)/i);
      const present = findNumberAfter(els, /Hospital Staff present on the visitation day\s+(\d+)/i);
      const total = listed ? listed.value : null;
      const absent = listed && present ? listed.value - present.value : null;
      params.hospitalStaff = found(
        { rows, total, absent },
        'hospital-json',
        `section 6.1, ${rows.length} posts`
      );
    }
  }

  return params;
}

module.exports = { extract };
