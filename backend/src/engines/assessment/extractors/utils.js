/**
 * Shared helpers for parameter extractors. Every extracted parameter is
 * wrapped with provenance so the evaluator can distinguish "found" from
 * "missing" — extractors never invent values.
 *
 * Extraction is precision-first: a value is only reported when the source
 * shape is unambiguous. A wrong number silently feeding the punitive engine
 * is worse than a missing one (missing renders as "manual verification
 * required" in the report).
 */
function found(value, extractor, evidence) {
  return { value, status: 'found', source: { extractor, evidence } };
}

function missing() {
  return { value: null, status: 'missing' };
}

function stripTags(html) {
  return html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const PURE_NUMBER = /^-?\d{1,3}(,\d{3})*(\.\d+)?$|^-?\d+(\.\d+)?$/;

function parseNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const cleaned = String(raw).replace(/,/g, '').trim();
  const match = cleaned.match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

/**
 * Proforma tables render as raw <table> HTML with rows shaped
 * [label | (formula) | required | ACTUAL | remark]. The actual value is the
 * LAST purely-numeric cell after the label cell; mixed-content cells
 * (formulas, ratios inside the label) are ignored.
 */
function findTableRowValue(markdown, labelRegex) {
  const rows = markdown.split(/<tr>/i).slice(1);
  for (const row of rows) {
    const cellMatches = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)];
    if (cellMatches.length === 0) continue;

    const cells = cellMatches.map((m) => stripTags(m[1]));
    const labelIdx = cells.findIndex((c) => labelRegex.test(c));
    if (labelIdx === -1) continue;

    const numericCells = cells.slice(labelIdx + 1).filter((c) => PURE_NUMBER.test(c));
    if (numericCells.length === 0) continue;

    const value = parseNumber(numericCells[numericCells.length - 1]);
    return { value, evidence: `table row "${cells[labelIdx].slice(0, 80)}"` };
  }
  return null;
}

/**
 * Plain-line lookup ("Label : value", "| Label | value |", "**Label:** value").
 * Only accepts lines whose remainder contains exactly one number — a line
 * with several numbers (e.g. required + actual columns flattened together)
 * is ambiguous and rejected.
 */
function findLineValue(lines, labelRegex) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('<')) continue; // HTML rows are handled by findTableRowValue
    if (!labelRegex.test(line)) continue;

    const remainder = line.replace(labelRegex, ' ').replace(/[*|]/g, ' ');
    const numbers = remainder.match(/-?\d+(\.\d+)?/g) || [];
    if (numbers.length !== 1) continue;

    return { value: parseFloat(numbers[0]), evidence: `line ${i}: "${line.slice(0, 80)}"` };
  }
  return null;
}

/**
 * Numeric parameter lookup: structured table rows first, then strict
 * plain-line fallback.
 */
function findNumber(markdown, lines, labelRegex) {
  return findTableRowValue(markdown, labelRegex) || findLineValue(lines, labelRegex);
}

/**
 * Text lookup for non-numeric fields (first matching line's remainder).
 */
function findText(lines, labelRegex) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!labelRegex.test(line)) continue;
    const after = line.replace(labelRegex, '').replace(/^[*\s:|-]+/, '').replace(/[*\s|]+$/, '').trim();
    if (after) return { value: after, evidence: `line ${i}` };
  }
  return null;
}

module.exports = { found, missing, parseNumber, findNumber, findText };
