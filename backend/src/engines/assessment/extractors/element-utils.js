/**
 * Traversal and lookup helpers for OpenDataLoader element JSON.
 *
 * Element shapes:
 *  - paragraph/heading: text in `.content`
 *  - table: `.rows[].cells[]`, each cell has 'column number'/'row span'/
 *    'column span' and `.kids[]` paragraphs
 *  - list: children under `.["list items"]` (key contains a space!) — a
 *    traversal that only follows `kids` silently drops all list data
 *
 * Bounding boxes are [x0, yBottom, x1, yTop] in PDF coordinates (y grows
 * upward). In the flattened proforma blocks a label paragraph and its value
 * row share the same y-band side by side, so label→value association uses
 * y-range overlap — never blind adjacency (AYU0659 interleaves
 * label,label,value,value in section 2.1).
 */

/** Depth-first walk over the element tree. */
function* walk(node) {
  if (!node) return;
  yield node;
  for (const kid of node.kids || []) yield* walk(kid);
  for (const item of node['list items'] || []) yield* walk(item);
  for (const row of node.rows || []) {
    for (const cell of row.cells || []) yield* walk(cell);
  }
}

/** All elements (at any depth) that carry text content. */
function textElements(root) {
  return [...walk(root)].filter((e) => typeof e.content === 'string' && e.content.trim());
}

/** Flattened text of an element including its descendants. */
function textOf(el) {
  if (typeof el.content === 'string' && !el.kids && !el.rows && !el['list items']) {
    return el.content.replace(/\s+/g, ' ').trim();
  }
  return [...walk(el)]
    .map((k) => (typeof k.content === 'string' ? k.content : ''))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve a table cell by its declared 'column number' — row-spanned rows
 * drop their leading cells, so positional indexing is wrong.
 */
function cellByColumn(row, col) {
  return (row.cells || []).find((c) => c['column number'] === col) || null;
}

function cellText(row, col) {
  const cell = cellByColumn(row, col);
  return cell ? textOf(cell) : '';
}

/** First top-level table whose any cell text matches headerRegex. */
function findTable(root, { headerRegex, page = null }) {
  return (root.kids || []).find(
    (t) =>
      t.type === 'table' &&
      (page === null || t['page number'] === page) &&
      (t.rows || []).some((r) => (r.cells || []).some((c) => headerRegex.test(textOf(c))))
  ) || null;
}

function yRange(el) {
  const box = el['bounding box'];
  if (!box) return null;
  return [Math.min(box[1], box[3]), Math.max(box[1], box[3])];
}

function yOverlaps(a, b) {
  const ra = yRange(a);
  const rb = yRange(b);
  if (!ra || !rb) return false;
  return ra[0] <= rb[1] && rb[0] <= ra[1];
}

const normText = (el) => (typeof el.content === 'string' ? el.content.replace(/\s+/g, ' ').trim() : '');

/**
 * Finds the value row belonging to a label paragraph in a flattened proforma
 * block: same page, y-band overlapping the label, content starting with two
 * numbers (the "<required> <actual> ..." shape; trailing verification words
 * are allowed).
 *
 * @returns {{label: Object, row: Object, tokens: string[]}|null}
 */
function findValueRowForLabel(elements, labelRegex, { valueRowRegex = /^\d[\d.,]*\s+\d[\d.,]*(\s|$)/ } = {}) {
  const label = elements.find((e) => labelRegex.test(normText(e)));
  if (!label) return null;

  const row = elements.find(
    (e) =>
      e !== label &&
      e['page number'] === label['page number'] &&
      valueRowRegex.test(normText(e)) &&
      yOverlaps(e, label)
  );
  if (!row) return null;

  return { label, row, tokens: normText(row).split(' ') };
}

/**
 * Elements between two anchors in document (kids-array) order. End anchor is
 * optional; when the start anchor is missing returns [].
 */
function elementsBetween(elements, startRegex, endRegex = null) {
  const start = elements.findIndex((e) => startRegex.test(normText(e)));
  if (start === -1) return [];
  let end = elements.length;
  if (endRegex) {
    const rel = elements.slice(start + 1).findIndex((e) => endRegex.test(normText(e)));
    if (rel !== -1) end = start + 1 + rel;
  }
  return elements.slice(start + 1, end);
}

/** First captured number following a label regex anywhere in the elements. */
function findNumberAfter(elements, regex) {
  for (const e of elements) {
    const match = normText(e).match(regex);
    if (match) {
      const value = parseNum(match[1]);
      if (value !== null) return { value, evidence: normText(e).slice(0, 80) };
    }
  }
  return null;
}

function parseNum(raw) {
  if (raw === null || raw === undefined) return null;
  const match = String(raw).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

module.exports = {
  walk, textElements, textOf, normText, cellByColumn, cellText, findTable,
  yOverlaps, findValueRowForLabel, elementsBetween, findNumberAfter, parseNum,
};
