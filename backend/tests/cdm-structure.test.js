const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { buildCdm } = require('../src/engines/extraction/cdm/cdm-builder');
const { render } = require('../src/engines/extraction/cdm/cdm-renderer');

// Structural regression guards for the document reconstruction. These lock in
// the fixes for the six reported defects on the AYU0659 proforma: sub-headings
// must precede their tables, wrapped/merged headers stay one table with merged
// cells, and orphaned "Total" rows join their table.

const md = render(buildCdm(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'markdown', 'AYU0659.elements.json'), 'utf8'))
));

/** Returns the substring of the render between two section anchors. */
function slice(startAnchor, endAnchor) {
  return sliceIn(md, startAnchor, endAnchor);
}

function sliceIn(text, startAnchor, endAnchor) {
  const s = text.indexOf(startAnchor);
  assert.ok(s >= 0, `anchor not found: ${startAnchor}`);
  const e = endAnchor ? text.indexOf(endAnchor, s + startAnchor.length) : text.length;
  return text.slice(s, e < 0 ? text.length : e);
}

// A second college (West Bengal) whose proforma merges the table header INTO
// the section heading (§3.3/§3.4) — a shape the AYU0659 fixture never has.
const mdWB = render(buildCdm(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'markdown', 'AYUWB.elements.json'), 'utf8'))
));

// A live AYU0659 extraction whose §3.3–3.6 are list items with the data list
// NESTED inside the title item — the shape that duplicated (bbox-less headings)
// and dropped the §3.4 data.
const mdLive = render(buildCdm(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'markdown', 'AYU0659-live.elements.json'), 'utf8'))
));

test('sub-heading renders before its table (no block displacement)', () => {
  const h21 = md.indexOf('2.1 Constructed Area College Details');
  const table21 = md.indexOf('Total Land Area', h21);
  assert.ok(h21 >= 0 && table21 > h21, '§2.1 heading precedes its area table');
  // The §2 parent heading must not have stolen the table above the §2.1 heading.
  const h2 = md.indexOf('2. College Infrastructure');
  assert.ok(h2 < h21 && md.indexOf('Total Land Area') > h21, '§2 heading owns no displaced table');
});

test('§2.6 Herbal Garden is a single table (not split)', () => {
  const region = slice('2.6 Herbal Garden', '2.7');
  const tables = (region.match(/<table>/g) || []).length;
  assert.strictEqual(tables, 1, 'herbal garden reconstructs to exactly one table');
  assert.ok(region.includes('Total Numbers of species available'), 'the species label stays one cell');
});

test('§3.1 teaching table merges its multi-row header (Sr.No. once)', () => {
  const region = slice('3.1 Teaching Staff Verification', '3.2');
  assert.ok(/rowspan="3">Sr\.No\./.test(region), 'Sr.No. spans the 3 header rows');
  const srNoCells = (region.match(/>Sr\.No\.</g) || []).length;
  assert.strictEqual(srNoCells, 1, 'Sr.No. is not duplicated across header rows');
  assert.ok(/colspan="3">No\. of eligible teachers required as per MSR for UG/.test(region), 'grouped header colspans');
});

test('§2.3 orphaned "Total" row joins the table', () => {
  const region = slice('2.3 Area of the Teaching', '2.4');
  assert.ok(/<td>Total<\/td>\s*<td>2000<\/td>\s*<td>2535\.00<\/td>/.test(region),
    'Total 2000 2535.00 is a table row, not a loose paragraph');
});

test('§2.4.1 heading-typed header reconstructs as a table', () => {
  const region = slice('2.4.1 Computer and Printer', '2.5');
  assert.ok(region.includes('<table>'), '§2.4.1 becomes a table');
  assert.ok(/<td>Dean Office \/ Principal Office<\/td>\s*<td>Both available<\/td>/.test(region),
    'list rows split into department + availability columns');
});

test('§3.2 occurrence blob splits into rows', () => {
  const region = slice('3.2 Observation by the', '3.3');
  assert.ok(/<td>Total No\. Of teaching staff listed by the college<\/td>\s*<td>42<\/td>/.test(region),
    'run-on "phrase N" observation blob splits into label|count rows');
});

test('§6.1 hospital staff is one cross-page table with group rows', () => {
  const region = slice('6.1 Hospital Staff Verification', '6.2');
  assert.strictEqual((region.match(/<table>/g) || []).length, 1, 'a single stitched table across pages');
  assert.ok(region.includes('Hospital Superintendent') && region.includes('Security Guard'),
    'first (p12) and late (p15) rows are in the same table');
  assert.ok(/colspan="5">Modern Medical Staff/.test(region), 'interior sub-heading is a full-width group row');
});

test('§6.2 occurrence blob splits into ≥6 rows', () => {
  const region = slice('6.2 Hospital Staff- Obs', '7. Instruments');
  const rows = (region.match(/<td>\d+<\/td>/g) || []).length;
  assert.ok(rows >= 6, `expected ≥6 occurrence rows, got ${rows}`);
});

test('§3.6 splits Institute State from Name of State Board', () => {
  const region = slice('3.6 Discrepancy of Teaching', 'Hospital staff');
  assert.ok(/<td>SHRADHA BHARDWAJ<\/td>\s*<td>AYSS01576<\/td>\s*<td>Madhya Pradesh<\/td>\s*<td>Chhattisgarh/.test(region),
    'name | id | state | board are four separate cells (per-cell split, not merged)');
});

test('§3.3/§3.4 header merged into the heading is split into a table (WB doc)', () => {
  for (const [head, next] of [['3.3 Visitor', '3.4 Visitors'], ['3.4 Visitors', '3.5 Reasons']]) {
    const region = sliceIn(mdWB, head, next);
    const headingLine = region.slice(0, region.indexOf('\n'));
    assert.ok(!/Sr\.?\s*No/i.test(headingLine), `${head} heading dropped the embedded column header: ${headingLine}`);
    assert.ok(region.includes('<table>') && /<th[^>]*>\s*Sr\.?\s*No/i.test(region),
      `${head} reconstructs into a table with a serial column`);
  }
});

test('§3.6 board value sits under its own header, Central-Reg column reserved (WB doc)', () => {
  const region = sliceIn(mdWB, '3.6 Discrepancy of Teaching', '## 4');
  // The merged "Name … State Board" header colspans across the data columns and
  // "Central Registration Number" keeps its own (empty) trailing column.
  assert.ok(/colspan="\d+">Name of Teacher.*State Board<\/th>\s*<th>Central Registration Number<\/th>/s.test(region),
    'merged name/state/board header colspans; Central-Reg header is a separate trailing column');
});

test('live doc: §3.3–3.6 render exactly once (no duplication) and §3.4 data survives', () => {
  for (const h of ['3.3 Visitor', '3.4 Visitors', '3.5 Reasons for Ineligibility', '3.6 Discrepancy']) {
    const n = (mdLive.match(new RegExp(h.replace(/[.]/g, '\\.').replace(/ /g, '\\s'), 'g')) || []).length;
    assert.strictEqual(n, 1, `${h} must appear exactly once, got ${n}`);
  }
  // §3.4 absence rows are nested inside the title item — must be recovered + tabled.
  const region = sliceIn(mdLive, '3.4 Visitors', '3.5 Reasons');
  assert.ok(region.includes('<table>') && /AMOL R\. RAJENIMBALKAR/.test(region) && /Informed Leave/.test(region),
    '§3.4 nested absence data is recovered into a table');
});

test('§4.2 non-teaching observation is a single-value occurrence table', () => {
  const region = slice('4.2 Non-Teaching Staff', '5. Hospital Infrastructure');
  assert.strictEqual((region.match(/<table>/g) || []).length, 1, 'one table across the page break');
  assert.ok(/<td>Total no\. of Non-teaching staff listed by the college<\/td>\s*<td>45<\/td>/.test(region),
    'each "phrase N" paragraph becomes a label|count row');
  assert.ok(/salary register<\/td>\s*<td>0<\/td>/.test(region), 'a value split to its own element pairs back');
});
