const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { filterNoise, deWhitespace, isSubsequence } = require('../src/engines/extraction/cdm/noise-filter');
const { buildSectionTree, findSection, parseSectionHeading } = require('../src/engines/extraction/cdm/section-tree');
const { buildCdm } = require('../src/engines/extraction/cdm/cdm-builder');
const cdmRenderer = require('../src/engines/extraction/cdm/cdm-renderer');

const fixturesDir = path.join(__dirname, 'fixtures', 'markdown');
const SAMPLES = ['AYU0659', 'AYU0265', 'AYU0038'];

// --- Noise Filter unit tests ---

test('deWhitespace strips spaces, punctuation, and lowercases', () => {
  assert.strictEqual(deWhitespace('3 T hi t ff (S h d l V)'), '3thitffshdlv');
  assert.strictEqual(deWhitespace('3. Teaching staff (Schedule-V)'), '3teachingstaffschedulev');
});

test('isSubsequence detects character-order subsequences', () => {
  assert.strictEqual(isSubsequence('abc', 'axbxc'), true);
  assert.strictEqual(isSubsequence('abc', 'abc'), true);
  assert.strictEqual(isSubsequence('abc', 'ab'), false);
  assert.strictEqual(isSubsequence('', 'anything'), true);
});

test('noise filter removes decorative duplicate headings', () => {
  const kids = [
    // The garbled decorative copy
    { type: 'heading', content: '3 T hi t ff (S h d l V)', 'heading level': 2, 'page number': 5, 'bounding box': [60, 700, 400, 720] },
    // The correct heading
    { type: 'heading', content: '3. Teaching staff (Schedule-V)', 'heading level': 2, 'page number': 5, 'bounding box': [60, 705, 500, 725] },
    // A normal paragraph
    { type: 'paragraph', content: 'Some normal text', 'page number': 5, 'bounding box': [60, 650, 500, 670] },
  ];

  const { filtered, stats } = filterNoise(kids, 20);
  assert.strictEqual(stats.duplicatesRemoved, 1, 'should remove the garbled duplicate');
  assert.strictEqual(filtered.length, 2, 'should keep the correct heading and paragraph');
  assert.ok(filtered.some((e) => e.content.includes('Teaching staff')), 'correct heading preserved');
  assert.ok(!filtered.some((e) => e.content.includes('3 T hi t ff')), 'garbled heading removed');
});

test('noise filter removes page furniture', () => {
  const kids = [];
  // Add a "Page X" element appearing on 8 of 10 pages at the same y position
  for (let page = 1; page <= 8; page++) {
    kids.push({
      type: 'paragraph',
      content: 'Part-I Proforma',
      'page number': page,
      'bounding box': [250, 790, 370, 800],
    });
  }
  // Add a real paragraph on page 1
  kids.push({
    type: 'paragraph',
    content: 'Institution Name : Test College',
    'page number': 1,
    'bounding box': [60, 600, 500, 620],
  });

  const { filtered, stats } = filterNoise(kids, 10);
  assert.strictEqual(stats.furnitureRemoved, 8, 'all 8 furniture instances removed');
  assert.strictEqual(filtered.length, 1, 'only real paragraph remains');
  assert.strictEqual(filtered[0].content, 'Institution Name : Test College');
});

// --- Section Tree unit tests ---

test('parseSectionHeading extracts numbered sections', () => {
  assert.deepStrictEqual(parseSectionHeading('2.1 Constructed Area'), { number: '2.1', title: 'Constructed Area' });
  assert.deepStrictEqual(parseSectionHeading('3. Teaching staff (Schedule-V)'), { number: '3', title: 'Teaching staff (Schedule-V)' });
  assert.strictEqual(parseSectionHeading('Not a section heading'), null);
});

test('buildSectionTree creates hierarchical sections', () => {
  const elements = [
    { type: 'paragraph', content: 'Preamble text', 'page number': 1 },
    { type: 'heading', content: '1. Introduction', 'heading level': 1, 'page number': 1 },
    { type: 'paragraph', content: 'Intro paragraph', 'page number': 1 },
    { type: 'heading', content: '1.1 Sub-section A', 'heading level': 2, 'page number': 1 },
    { type: 'paragraph', content: 'Sub-A paragraph', 'page number': 1 },
    { type: 'heading', content: '2. Infrastructure', 'heading level': 1, 'page number': 2 },
    { type: 'paragraph', content: 'Infra paragraph', 'page number': 2 },
    { type: 'heading', content: '2.1 Constructed Area', 'heading level': 2, 'page number': 2 },
    { type: 'paragraph', content: 'Area paragraph', 'page number': 2 },
  ];

  const tree = buildSectionTree(elements);

  // Root: preamble (id=0), section 1, section 2
  assert.strictEqual(tree.length, 3, 'three top-level sections');
  assert.strictEqual(tree[0].id, '0', 'preamble section');
  assert.strictEqual(tree[0].blocks.length, 1, 'preamble has 1 block');
  assert.strictEqual(tree[1].id, '1', 'section 1');
  assert.strictEqual(tree[1].blocks.length, 1, 'section 1 has 1 block');
  assert.strictEqual(tree[1].children.length, 1, 'section 1 has 1 child');
  assert.strictEqual(tree[1].children[0].id, '1.1', 'child is 1.1');
  assert.strictEqual(tree[2].id, '2', 'section 2');
  assert.strictEqual(tree[2].children.length, 1, 'section 2 has 1 child');
  assert.strictEqual(tree[2].children[0].id, '2.1', 'child is 2.1');
});

test('findSection locates sections by ID', () => {
  const tree = buildSectionTree([
    { type: 'heading', content: '2. Infrastructure', 'heading level': 1, 'page number': 1 },
    { type: 'heading', content: '2.1 Area Details', 'heading level': 2, 'page number': 1 },
    { type: 'paragraph', content: 'details', 'page number': 1 },
  ]);

  const found = findSection(tree, '2.1');
  assert.ok(found, 'section 2.1 found');
  assert.strictEqual(found.title, 'Area Details');
});

// --- Full CDM build tests (against real fixtures) ---

for (const id of SAMPLES) {
  test(`CDM builds successfully from ${id} elements JSON`, () => {
    const elementJson = JSON.parse(fs.readFileSync(path.join(fixturesDir, `${id}.elements.json`), 'utf8'));
    const cdm = buildCdm(elementJson);

    // CDM has required structure
    assert.ok(cdm.meta, 'CDM has meta');
    assert.ok(cdm.meta.pages > 0, 'CDM has page count');
    assert.ok(cdm.sections, 'CDM has sections');
    assert.ok(cdm.sections.length > 0, 'CDM has at least one section');

    // Check noise stats
    assert.ok(cdm.meta.noiseStats, 'CDM has noise stats');
    assert.ok(typeof cdm.meta.noiseStats.furnitureRemoved === 'number', 'furniture stat');
    assert.ok(typeof cdm.meta.noiseStats.duplicatesRemoved === 'number', 'duplicates stat');
  });
}

for (const id of SAMPLES) {
  test(`CDM renderer produces non-empty markdown for ${id}`, () => {
    const elementJson = JSON.parse(fs.readFileSync(path.join(fixturesDir, `${id}.elements.json`), 'utf8'));
    const cdm = buildCdm(elementJson);
    const markdown = cdmRenderer.render(cdm);

    assert.ok(markdown.length > 100, `rendered markdown should be substantial (got ${markdown.length} chars)`);
    assert.ok(!markdown.includes('3 T hi t ff'), 'garbled heading should not appear in rendered markdown');
  });
}

test('CDM renderer round-trips: forms render as markdown tables', () => {
  const cdm = {
    meta: { pages: 1 },
    sections: [{
      id: '0', title: 'Test', level: 0, page: 1,
      blocks: [{
        type: 'form',
        fields: [
          { label: 'Name', value: 'Test College', extras: [] },
          { label: 'Location', value: 'Delhi', extras: [] },
        ],
        page: 1,
      }],
      children: [],
    }],
  };

  const md = cdmRenderer.render(cdm);
  assert.ok(md.includes('| Field | Value |'), 'form renders as markdown table');
  assert.ok(md.includes('Test College'), 'form value preserved');
});

test('CDM renderer: pseudo-tables render as markdown tables', () => {
  const cdm = {
    meta: { pages: 1 },
    sections: [{
      id: '0', title: 'Test', level: 0, page: 1,
      blocks: [{
        type: 'pseudo-table',
        headers: ['Name', 'ID', 'College'],
        dataRows: [['Dr. Smith', 'V12345', 'AIIMS']],
        page: 1,
      }],
      children: [],
    }],
  };

  const md = cdmRenderer.render(cdm);
  assert.ok(md.includes('| Name | ID | College |'), 'pseudo-table headers render');
  assert.ok(md.includes('Dr. Smith'), 'pseudo-table data renders');
});
