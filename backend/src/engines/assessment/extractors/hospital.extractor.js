const { found, missing, findNumber } = require('./utils');
const { walk, textElements, textOf, normText, yOverlaps, findNumberAfter } = require('./element-utils');

/**
 * Hospital functionality metrics read directly from the "Functionality of the
 * Hospital" element table (section 5.2). Each row is
 * [label | (required/formula) | Available | Short] with a variable number of
 * leading columns; the actual value is always the LAST purely-numeric cell of
 * the row. Reading the element table (not the rendered markdown) keeps these
 * robust regardless of how the renderer lays the table out.
 */
// Each field: element functioning-table row label first, then a markdown
// label as fallback (row wording varies between colleges; the markdown path
// was verified across all three golden colleges).
const FIELDS = [
  { param: 'opdCount', tableLabel: null, mdLabel: /total number of OPD\b/i },
  { param: 'opdTotalPatients', tableLabel: /attended OPD/i, mdLabel: /total number of patients attended OPD/i },
  { param: 'opdAverageDaily', tableLabel: /average attendance of patient/i, mdLabel: /average attendance of patients? in OPD per day/i },
  { param: 'ipdTotalPatients', tableLabel: /patients admitted/i, mdLabel: /(total )?(number|no\.?) of patients admitted/i },
  { param: 'bedOccupancyPercent', tableLabel: /average bed occupancy/i, mdLabel: /average bed occupancy/i },
  { param: 'deliveries', tableLabel: /deliveries conducted/i, mdLabel: /(number|no\.?) of deliveries/i },
  { param: 'operations', tableLabel: /^total number of operations/i, mdLabel: /(number|no\.?) of operations/i },
  { param: 'equipmentMeanPercent', tableLabel: null, mdLabel: /mean of general and essential equipment/i },
];

const PURE_NUMBER = /^-?\d[\d,]*(\.\d+)?$/;

const FUNCTIONING_ROW_RE = /attended OPD|OPD per day|patients admitted|bed occupancy|deliveries conducted|operations|number of OPD/i;

/**
 * Collects rows from every functioning-table fragment (the table is split
 * across pages for some colleges) into one row list.
 */
function functioningRows(elements) {
  const rows = [];
  for (const t of [...walk(elements)]) {
    if (t.type !== 'table') continue;
    const isFunctioning = (t.rows || []).some((r) => FUNCTIONING_ROW_RE.test((r.cells || []).map(textOf).join(' ')));
    if (isFunctioning) rows.push(...(t.rows || []));
  }
  return rows;
}

/** Last purely-numeric cell in the first row whose label cell matches. */
function rowValue(rows, labelRegex) {
  for (const row of rows) {
    const cells = (row.cells || []).map(textOf);
    if (!labelRegex.test(cells[0] || '')) continue;
    const nums = cells.slice(1).filter((c) => PURE_NUMBER.test(c.replace(/,/g, '')));
    if (nums.length) return parseFloat(nums[nums.length - 1].replace(/,/g, ''));
  }
  return null;
}

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

  // Element functioning-table first, markdown fallback (row wording varies).
  const rows = elements ? functioningRows(elements) : [];
  for (const field of FIELDS) {
    const tableValue = rows.length && field.tableLabel ? rowValue(rows, field.tableLabel) : null;
    if (tableValue !== null) {
      params[field.param] = found(tableValue, 'hospital-json', `functioning table row "${field.tableLabel}"`);
      continue;
    }
    const hit = findNumber(markdown, lines, field.mdLabel);
    params[field.param] = hit && hit.value !== null
      ? found(hit.value, 'hospital', hit.evidence)
      : missing();
  }

  // "Computerized Central Registration | | Available |" (functioning table)
  const crRow = rows.find((r) => /central registration/i.test((r.cells || []).map(textOf).join(' ')));
  params.centralRegistrationAvailable = crRow
    ? found(/available|yes|functional/i.test((crRow.cells || []).map(textOf).join(' ')), 'hospital-json', 'central registration row')
    : missing();

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
