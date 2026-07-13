const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const {
  walk, textElements, normText, cellByColumn, findValueRowForLabel,
} = require('../src/engines/assessment/extractors/element-utils');

const root = require(path.join(__dirname, 'fixtures', 'markdown', 'AYU0659.elements.json'));

test('walk() traverses the "list items" key (space in key name)', () => {
  const all = [...walk(root)];
  const listItems = all.filter((e) => e.type === 'list item');
  assert.ok(listItems.length > 0, 'fixture lists must be visited');
  // The lecture-hall area lives only inside a list item — a kids-only
  // traversal loses it.
  const lectureRow = all.find((e) => /Total Area of Lect\w* Halls/i.test(normText(e)));
  assert.ok(lectureRow, 'lecture-hall list row reachable');
});

test('cellByColumn resolves by declared column number, not position', () => {
  const table = root.kids.find(
    (t) => t.type === 'table' && t['page number'] === 5 && (t.rows || []).length >= 15
  );
  assert.ok(table, 'teaching table present');
  const dataRow = table.rows.find((r) => r.cells?.some((c) => c['column number'] === 8));
  const cell8 = cellByColumn(dataRow, 8);
  assert.ok(cell8, 'existing-professor column resolvable');
  assert.strictEqual(cell8['column number'], 8);
});

test('label→value association survives the interleaved section-2.1 block', () => {
  // AYU0659 emits label,label,value,value for college/hospital areas —
  // adjacency pairing would swap them; y-band overlap must not.
  const els = textElements(root);
  const college = findValueRowForLabel(els, /Constructed Area of\s*College\s*\(sq\.?\s*mt\)/i);
  const hospital = findValueRowForLabel(els, /Constructed Area of\s*hospital\s*\(sq\.?\s*mt\)/i);
  assert.strictEqual(college.tokens[1], '4585.59');
  assert.strictEqual(hospital.tokens[1], '3752.00');
});
