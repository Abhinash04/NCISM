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
  const s = md.indexOf(startAnchor);
  assert.ok(s >= 0, `anchor not found: ${startAnchor}`);
  const e = endAnchor ? md.indexOf(endAnchor, s + startAnchor.length) : md.length;
  return md.slice(s, e < 0 ? md.length : e);
}

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
