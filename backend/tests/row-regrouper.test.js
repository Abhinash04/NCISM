const test = require('node:test');
const assert = require('node:assert');
const { regroupBlocks, clusterIntoRows } = require('../src/engines/extraction/cdm/row-regrouper');

test('clusterIntoRows clusters elements by vertical y-band overlap and sorts by x', () => {
  const elements = [
    { type: 'paragraph', content: 'Value 1', 'bounding box': [200, 100, 300, 115], 'page number': 1 },
    { type: 'paragraph', content: 'Label 1:', 'bounding box': [50, 102, 150, 117], 'page number': 1 },
    { type: 'paragraph', content: 'Label 2:', 'bounding box': [50, 50, 150, 65], 'page number': 1 },
    { type: 'paragraph', content: 'Value 2', 'bounding box': [200, 48, 300, 63], 'page number': 1 },
  ];

  const rows = clusterIntoRows(elements);
  
  assert.strictEqual(rows.length, 2, 'should form 2 rows');
  // Since y grows up in PDF, Row 1 has higher y (midpoint around 108.5 vs 56.5)
  assert.strictEqual(rows[0][0].content, 'Label 1:', 'Row 0 Col 0');
  assert.strictEqual(rows[0][1].content, 'Value 1', 'Row 0 Col 1');
  assert.strictEqual(rows[1][0].content, 'Label 2:', 'Row 1 Col 0');
  assert.strictEqual(rows[1][1].content, 'Value 2', 'Row 1 Col 1');
});

test('regroupBlocks classifies label:value pairs as a form', () => {
  const blocks = [
    { type: 'paragraph', content: 'Name of College :', 'bounding box': [50, 100, 150, 115], 'page number': 1 },
    { type: 'paragraph', content: 'A.R. Medical College', 'bounding box': [200, 100, 350, 115], 'page number': 1 },
    { type: 'paragraph', content: 'Established Year :', 'bounding box': [50, 70, 150, 85], 'page number': 1 },
    { type: 'paragraph', content: '2001', 'bounding box': [200, 70, 250, 85], 'page number': 1 },
  ];

  const regrouped = regroupBlocks(blocks);
  assert.strictEqual(regrouped.length, 1, 'should group into a single block');
  assert.strictEqual(regrouped[0].type, 'form');
  assert.strictEqual(regrouped[0].fields.length, 2);
  assert.strictEqual(regrouped[0].fields[0].label, 'Name of College');
  assert.strictEqual(regrouped[0].fields[0].value, 'A.R. Medical College');
  assert.strictEqual(regrouped[0].fields[1].label, 'Established Year');
  assert.strictEqual(regrouped[0].fields[1].value, '2001');
});

test('regroupBlocks classifies tabular layout as pseudo-table', () => {
  const blocks = [
    { type: 'paragraph', content: 'Department', 'bounding box': [50, 100, 120, 115], 'page number': 1 },
    { type: 'paragraph', content: 'Count', 'bounding box': [150, 100, 200, 115], 'page number': 1 },
    { type: 'paragraph', content: 'Verified', 'bounding box': [250, 100, 300, 115], 'page number': 1 },
    
    { type: 'paragraph', content: 'Anatomy', 'bounding box': [50, 80, 120, 95], 'page number': 1 },
    { type: 'paragraph', content: '5', 'bounding box': [150, 80, 200, 95], 'page number': 1 },
    { type: 'paragraph', content: 'Yes', 'bounding box': [250, 80, 300, 95], 'page number': 1 },
    
    { type: 'paragraph', content: 'Physiology', 'bounding box': [50, 60, 120, 75], 'page number': 1 },
    { type: 'paragraph', content: '3', 'bounding box': [150, 60, 200, 75], 'page number': 1 },
    { type: 'paragraph', content: 'No', 'bounding box': [250, 60, 300, 75], 'page number': 1 },
  ];

  const regrouped = regroupBlocks(blocks);
  assert.strictEqual(regrouped.length, 1, 'should group into a single pseudo-table');
  assert.strictEqual(regrouped[0].type, 'pseudo-table');
  assert.deepStrictEqual(regrouped[0].headers, ['Department', 'Count', 'Verified']);
  assert.strictEqual(regrouped[0].dataRows.length, 2);
  assert.deepStrictEqual(regrouped[0].dataRows[0], ['Anatomy', '5', 'Yes']);
  assert.deepStrictEqual(regrouped[0].dataRows[1], ['Physiology', '3', 'No']);
});
