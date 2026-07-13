const { found, missing } = require('./utils');
const { walk, textOf } = require('./element-utils');

/**
 * Harvests visitor observations generically from the document's assessment-
 * parameter table (the final "S.No | Parameter | ... | Meeting requirement |
 * Other Findings" table). Rows that fail the requirement ("No") and carry a
 * real finding sentence become observations.
 *
 * This is strictly document-derived — no hardcoded narrative. Findings that
 * are bare dashes, pure percentages, or empty are skipped.
 */
const NOISE = /^[-\s]*$|^\d+(\.\d+)?\s*%?$|manual verification/i;

function isMeaningful(text) {
  const t = (text || '').trim();
  return t.length >= 12 && /[A-Za-z]{4,}/.test(t) && !NOISE.test(t);
}

function extract(markdown, lines, elements) {
  if (!elements) {
    return { visitorObservations: missing(), otherObservations: missing() };
  }

  const tables = [...walk(elements)].filter((t) => t.type === 'table');
  const paramTables = tables.filter((t) =>
    (t.rows || []).some((r) => /Meeting the requirement|Assessment Parameter|Other Findings/i.test((r.cells || []).map(textOf).join(' ')))
  );

  const observations = [];
  const seen = new Set();
  for (const table of paramTables) {
    for (const row of table.rows || []) {
      const cells = (row.cells || []).map(textOf);
      // Requirement not met: a standalone "No" cell.
      if (!cells.some((c) => /^No$/i.test(c.trim()))) continue;
      const finding = cells[cells.length - 1];
      if (!isMeaningful(finding)) continue;
      const clean = finding.replace(/\s+/g, ' ').trim();
      if (seen.has(clean)) continue;
      seen.add(clean);
      observations.push(clean);
    }
  }

  return {
    visitorObservations: observations.length > 0
      ? found(observations, 'observations-json', `${observations.length} findings from the assessment-parameter table`)
      : missing(),
    otherObservations: missing(),
  };
}

module.exports = { extract };
