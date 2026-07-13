const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const { buildCdm } = require('../src/engines/extraction/cdm/cdm-builder');
const { render } = require('../src/engines/extraction/cdm/cdm-renderer');
const { walk } = require('../src/engines/assessment/extractors/element-utils');

const COLLEGES = ['AYU0659', 'AYU0265', 'AYU0038'];

/**
 * The structured view must not lose data. Every substantive numeric value and
 * name in the element JSON must survive into the CDM-rendered markdown.
 */
for (const id of COLLEGES) {
  test(`CDM markdown preserves all data values for ${id}`, () => {
    const elements = require(path.join(__dirname, 'fixtures', 'markdown', `${id}.elements.json`));
    const md = render(buildCdm(elements)).replace(/\s+/g, ' ');

    // Collect every numeric token (areas, counts, percentages) and capitalized
    // multi-word names from the element content.
    const tokens = new Set();
    for (const el of [...walk(elements)]) {
      const text = (el.content || '');
      // Skip formula / ratio cells (e.g. "Total number of beds x 365",
      // "Total no. of patients/300 days") — their constants aren't data.
      if (/\bx\s*\d|\/\s*\d|\bratio\b|per\s*\d+\s*days/i.test(text)) continue;
      for (const num of text.match(/\d[\d,]*\.\d+|\b\d{3,}\b/g) || []) {
        tokens.add(num.replace(/,/g, ''));
      }
    }

    const missing = [...tokens].filter((t) => !md.includes(t));
    assert.deepStrictEqual(missing, [], `${id}: these data values were dropped from the structured view: ${missing.join(', ')}`);
  });
}
