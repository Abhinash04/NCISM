const test = require('node:test');
const assert = require('node:assert');
const {
  expandToGrid,
  detectHeaderBand,
  buildHeaderPaths,
  headersMatch,
  stitchTables,
  attachNotes,
  normalizeAndStitchTables,
} = require('../src/engines/extraction/cdm/table-normalizer');

test('expandToGrid expands colspan and rowspan', () => {
  const rows = [
    {
      cells: [
        { content: 'H1', 'column span': 2, pdfua_tag: 'TH' },
        { content: 'H2', pdfua_tag: 'TH' },
      ],
    },
    {
      cells: [
        { content: 'R1C1', 'row span': 2 },
        { content: 'R1C2' },
        { content: 'R1C3' },
      ],
    },
    {
      cells: [
        { content: 'R2C2' },
        { content: 'R2C3' },
      ],
    },
  ];

  const grid = expandToGrid(rows);
  assert.strictEqual(grid.length, 3, 'should have 3 rows');
  assert.strictEqual(grid[0].length, 3, 'should have 3 columns');
  
  // Row 1 checks
  assert.strictEqual(grid[0][0].text, 'H1');
  assert.strictEqual(grid[0][1].text, 'H1');
  assert.strictEqual(grid[0][2].text, 'H2');

  // Row 2 checks
  assert.strictEqual(grid[1][0].text, 'R1C1');
  assert.strictEqual(grid[1][1].text, 'R1C2');
  assert.strictEqual(grid[1][2].text, 'R1C3');

  // Row 3 checks (rowspan from row 2 carries over to col 0)
  assert.strictEqual(grid[2][0].text, 'R1C1', 'rowspan carryover');
  assert.strictEqual(grid[2][0].isCarryForward, true);
  assert.strictEqual(grid[2][1].text, 'R2C2');
  assert.strictEqual(grid[2][2].text, 'R2C3');
});

test('detectHeaderBand identifies header rows correctly', () => {
  const grid = [
    [
      { text: 'Name', isHeader: true },
      { text: 'Age', isHeader: true },
    ],
    [
      { text: 'Required', isHeader: true },
      { text: 'Available', isHeader: true },
    ],
    [
      { text: 'A', isHeader: false },
      { text: '12', isHeader: false },
    ],
  ];

  const headerCount = detectHeaderBand(grid);
  assert.strictEqual(headerCount, 2, 'should detect first 2 rows as headers');
});

test('buildHeaderPaths flattens nested headers', () => {
  const headerGrid = [
    [
      { text: 'Professor' },
      { text: 'Associate Prof' },
      { text: 'Associate Prof' },
    ],
    [
      { text: 'Required' },
      { text: 'Required' },
      { text: 'Available' },
    ],
  ];

  const columns = buildHeaderPaths(headerGrid);
  assert.deepStrictEqual(columns, [
    'Professor | Required',
    'Associate Prof | Required',
    'Associate Prof | Available',
  ]);
});

test('headersMatch checks for 60% overlap in columns', () => {
  const colsA = ['Name', 'Age', 'Department', 'Designation'];
  const colsB = ['Name', 'Age', 'Dept', 'Designation']; // 3 matches out of 4 (75% overlap)
  const colsC = ['Title', 'Role', 'Rank', 'Salary'];

  assert.ok(headersMatch(colsA, colsB), 'colsA and colsB should match');
  assert.ok(!headersMatch(colsA, colsC), 'colsA and colsC should not match');
});

test('stitchTables stitches consecutive pages with matching headers', () => {
  const blocks = [
    {
      type: 'table',
      columns: ['Name', 'Age'],
      grid: [['Name', 'Age'], ['Alice', '30']],
      rows: [{ cells: { Name: 'Alice', Age: '30' } }],
      page: 1,
      headerTree: [['Name', 'Age']],
    },
    {
      type: 'table',
      columns: ['Name', 'Age'],
      grid: [['Name', 'Age'], ['Bob', '25']],
      rows: [{ cells: { Name: 'Bob', Age: '25' } }],
      page: 2,
      headerTree: [['Name', 'Age']],
    },
  ];

  const stitched = stitchTables(blocks);
  assert.strictEqual(stitched.length, 1, 'should merge into 1 table');
  assert.strictEqual(stitched[0].rows.length, 2, 'should have 2 rows');
  assert.deepStrictEqual(stitched[0].stitchedFrom, [1, 2]);
  assert.strictEqual(stitched[0].rows[0].cells.Name, 'Alice');
  assert.strictEqual(stitched[0].rows[1].cells.Name, 'Bob');
});

test('attachNotes attaches note paragraph to preceding table', () => {
  const blocks = [
    {
      type: 'table',
      columns: ['Name'],
      rows: [{ cells: { Name: 'Alice' } }],
      page: 1,
    },
    {
      type: 'paragraph',
      content: 'Note: This is a test note.',
      'page number': 1,
    },
    {
      type: 'paragraph',
      content: 'Regular paragraph',
      'page number': 1,
    },
  ];

  const processed = attachNotes(blocks);
  assert.strictEqual(processed.length, 2, 'note paragraph should be consumed');
  assert.strictEqual(processed[0].type, 'table');
  assert.deepStrictEqual(processed[0].notes, ['Note: This is a test note.']);
  assert.strictEqual(processed[1].content, 'Regular paragraph');
});
