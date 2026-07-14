/**
 * CDM Sub-stage 3b: Spatial Table Builder
 *
 * Reconstructs tables that the extractor flattened into positioned text
 * paragraphs / headings / list items — the NCISM "verification matrix" and
 * inline pseudo-tables (§2.1, §2.3, §2.4.1, §2.5, §2.6, §5.1, §6.1, …).
 *
 * Purely geometric, no document-specific vocabulary:
 *   1. Turn a section's leaf blocks into positioned lines (x, yTop, yBot).
 *   2. Cluster lines into visual rows by y-band overlap (labels + their
 *      right-aligned values pair here even when they arrive out of order).
 *   3. Walk rows top→bottom; a run of data rows (rows carrying value tokens)
 *      plus the text-only header rows directly above them form one table
 *      region. `label : value` status lines and long prose break the region
 *      (they stay paragraphs → forms).
 *   4. Emit a RAW table block (`rows[].cells[]`); stage-4 `normalizeTable`
 *      expands it into the span-aware grid, so rendering is uniform with real
 *      PDF tables.
 *
 * Everything else passes through untouched, in original document order.
 */

// --- geometry -------------------------------------------------------------

function bboxOf(el) {
  return el['bounding box'] || null;
}
function xLeft(el) {
  const b = bboxOf(el);
  return b ? b[0] : 0;
}
function yTop(el) {
  const b = bboxOf(el);
  return b ? Math.max(b[1], b[3]) : 0;
}
function yBot(el) {
  const b = bboxOf(el);
  return b ? Math.min(b[1], b[3]) : 0;
}

// --- token classification (shared with the inline splitter) ---------------

function isDataToken(str) {
  if (!str) return false;
  if (/^-?\d+(?:\.\d+)?%?$/.test(str)) return true; // number / percent
  if (/^[–—\-]$/.test(str)) return true; // dash / nil
  const lower = str.toLowerCase();
  const keywords = [
    'yes', 'no', 'na', 'n.a.', 'n/a', 'adequate', 'inadequate', 'satisfactory',
    'available', 'both', 'functional', 'verified', 'correct', 'verified-correct',
    'verifiedcorrect', 'verifiedcorrected', 'both available', 'verified correct',
  ];
  return keywords.includes(lower);
}

/**
 * Splits an inline "label v1 v2 …" string into its leading label and the run
 * of trailing value tokens (numbers / dashes / yes-no keywords).
 */
function splitInlineRow(text) {
  if (!text) return { label: '', values: [] };
  const parts = text.trim().replace(/\s+/g, ' ').split(' ');
  const values = [];
  const isNumeric = (t) => /^-?\d+(?:\.\d+)?%?$/.test(t);
  let numberSeen = false;
  let i = parts.length - 1;
  while (i >= 0) {
    let token = parts[i];
    if (i > 0) {
      const twoWords = (parts[i - 1] + ' ' + parts[i]).toLowerCase();
      if (twoWords === 'both available' || twoWords === 'verified correct') {
        token = parts[i - 1] + ' ' + parts[i];
        i--;
      }
    }
    if (!isDataToken(token)) break;
    // Word-keyword values (Yes / Available / Verified-Correct) only belong in
    // the trailing run — a keyword sitting to the LEFT of numeric columns is a
    // label word ("books available 7500 …"), not a value. Numbers/dashes are
    // always values.
    if (!isNumeric(token) && !/^[–—-]$/.test(token) && numberSeen) break;
    if (isNumeric(token)) numberSeen = true;
    values.unshift(token);
    i--;
  }
  return { label: parts.slice(0, i + 1).join(' ').trim(), values };
}

/** A colon status/form line ("Herbal garden : Available") — never a table. */
function isColonValueLine(text) {
  return /\S\s*:\s*\S/.test(text) && !/^\d/.test(text.trim());
}

// --- line model -----------------------------------------------------------

/**
 * Flattens section blocks into positioned lines. Tables/forms and any block
 * without geometry are kept as opaque pass-throughs (rendered in place).
 */
function toLines(blocks) {
  const lines = [];
  blocks.forEach((block, oi) => {
    if (block.type === 'paragraph' || block.type === 'heading') {
      if (!bboxOf(block)) { lines.push({ passthrough: block, oi }); return; }
      lines.push({
        text: (block.content || '').replace(/\s+/g, ' ').trim(),
        x: xLeft(block), yT: yTop(block), yB: yBot(block),
        page: block['page number'] || 1, kind: block.type, oi,
      });
    } else if (block.type === 'list') {
      const items = block['list items'] || block.items || [];
      if (!items.length || !items.every((it) => bboxOf(it))) { lines.push({ passthrough: block, oi }); return; }
      pushNodeLines(items, block['page number'] || 1, oi, 'item', lines);
    } else {
      lines.push({ passthrough: block, oi });
    }
  });
  return lines;
}

/**
 * Emits a positioned line per list item and RECURSES into each item's nested
 * kids (a sub-list or trailing paragraphs). NCISM proformas nest a table's
 * data list inside the title's list-item (§3.4 absence rows live under the
 * "3.4 … Sr. No. …" item); without recursion that data is silently dropped.
 */
function pushNodeLines(nodes, page, oi, kind, lines) {
  for (const node of nodes) {
    const box = bboxOf(node);
    if ((node.content || '').trim() && box) {
      lines.push({
        text: node.content.replace(/\s+/g, ' ').trim(),
        x: xLeft(node), yT: yTop(node), yB: yBot(node), page, kind, oi,
      });
    }
    for (const kid of node.kids || []) {
      if (kid.type === 'list') pushNodeLines(kid['list items'] || kid.items || [], page, oi, 'item', lines);
      else pushNodeLines([kid], page, oi, kid.type === 'heading' ? 'heading' : 'para', lines);
    }
  }
}

/**
 * Clusters lines on one page into rows. Each row is seeded by the topmost
 * unused line; other lines join when their vertical MIDPOINT falls inside the
 * seed's y-band (or vice-versa). The band is NOT expanded as members join —
 * that would chain tightly-packed rows of a dense table (e.g. §3.6 pages 7-8)
 * into one giant row.
 */
function clusterLinesIntoRows(lines) {
  const sorted = [...lines].sort((a, b) => b.yT - a.yT);
  const rows = [];
  const used = new Set();
  const mid = (l) => (l.yT + l.yB) / 2;
  for (const seed of sorted) {
    if (used.has(seed)) continue;
    const sMid = mid(seed);
    const row = [seed];
    used.add(seed);
    for (const other of sorted) {
      if (used.has(other)) continue;
      const oMid = mid(other);
      if ((oMid <= seed.yT && oMid >= seed.yB) || (sMid <= other.yT && sMid >= other.yB)) {
        row.push(other);
        used.add(other);
      }
    }
    row.sort((a, b) => a.x - b.x);
    rows.push({ cells: row, yT: seed.yT });
  }
  return rows.sort((a, b) => b.yT - a.yT);
}

// --- row classification ---------------------------------------------------

/** A row's full text (cells joined left→right). */
function rowText(row) {
  return row.cells.map((c) => c.text).filter(Boolean).join(' ');
}

/** A cell whose every token is a value token — "3", "- 7 -", "5 5.285 Yes". */
function isValueBlob(text) {
  const toks = text.trim().split(/\s+/).filter(Boolean);
  return toks.length > 0 && toks.every(isDataToken);
}

/**
 * Extracts a data row's cells, PRESERVING source element boundaries so columns
 * that arrive as separate elements stay separate (§3.6 "Institute State" at x73
 * vs "Name of State Board" at x354). Processes cells left→right:
 *   - value-blob cell → each token is its own column;
 *   - first text cell → leading serial + ID-anchored name|id|after split, then
 *     any trailing value tokens within the cell;
 *   - later text cell → its own column (+ trailing values peeled).
 */
function dataCells(row, hasSerialHeader) {
  const out = [];
  let seenText = false;
  // When the row already carries its values in a separate value-blob cell
  // ("250 251 - 251 -"), a keyword-only tail on a text cell ("… species
  // available") is label text, not a value. When the text cell is on its own,
  // that tail IS the value ("… Both available").
  const hasSeparateValueCell = row.cells.some((c) => c.text && isValueBlob(c.text.trim()));
  for (const cell of row.cells) {
    const text = (cell.text || '').trim();
    if (!text) continue;
    if (isValueBlob(text)) {
      for (const t of text.split(/\s+/)) out.push(t);
      continue;
    }
    let { label: labelPart, values } = splitInlineRow(text);
    if (hasSeparateValueCell && !values.some((v) => /^-?\d+(?:\.\d+)?%?$/.test(v))) {
      labelPart = text; values = [];
    }
    if (!seenText) {
      seenText = true;
      const serial = labelPart.match(/^(\d+)[.)]?\s+(.*)$/);
      if (hasSerialHeader && serial) { out.push(serial[1]); labelPart = serial[2]; }
      // ID-anchored split "SHRADHA BHARDWAJ AYSS01576 Madhya Pradesh" →
      // name | id | after-id, generic (fires only when an ID token is present).
      const idm = labelPart.match(/^(.+?)\s+([A-Za-z]{2,}\d{3,})\b\s*(.*)$/);
      if (idm) {
        if (idm[1].trim()) out.push(idm[1].trim());
        out.push(idm[2]);
        if (idm[3].trim()) out.push(idm[3].trim());
      } else if (labelPart) {
        out.push(labelPart);
      }
    } else if (labelPart) {
      out.push(labelPart);
    }
    for (const v of values) out.push(v);
  }
  return out;
}

/**
 * Splits a run-on "occurrence" blob — "<phrase> <n> <phrase> <n> …" — into
 * [phrase, number] pairs. Used for the NCISM No.-of-Occurrences observation
 * tables whose rows the extractor concatenated into one paragraph. Generic:
 * any repeated "text ending in a number" pattern.
 */
function splitOccurrenceBlob(text) {
  const pairs = [];
  const re = /(.+?)\s+(\d+)(?=\s+\D|\s*$)/g;
  let m;
  while ((m = re.exec(text)) !== null) pairs.push([m[1].trim(), m[2]]);
  return pairs;
}

function isDataRow(row) {
  const joined = rowText(row);
  if (isColonValueLine(joined)) return false;
  const { label, values } = splitInlineRow(joined);
  if (values.length >= 2) return true;
  if (values.length === 1 && /^\d+[.)]?\s+\S/.test(label)) return true; // "1 Name  100"
  // Run-on occurrence blob: "<phrase> N <phrase> N …" (≥2 pairs).
  if (splitOccurrenceBlob(joined).length >= 2) return true;
  return false;
}

/**
 * A single "<phrase> <number>" observation row (§4.2 non-teaching staff: each
 * count is its own paragraph rather than one concatenated blob). Recognised
 * only under a 1–2 column non-Sr.No header (see the region loop).
 */
function isOccurrenceRow(row) {
  const t = rowText(row);
  if (isColonValueLine(t)) return false;
  const { label, values } = splitInlineRow(t);
  return values.length === 1 && /^-?\d+$/.test(values[0]) &&
    /[A-Za-z]/.test(label) && label.split(/\s+/).length >= 2;
}

/** Whitespace/case-insensitive text key, for de-duplicating repeated headers. */
function headerKey(text) {
  return (text || '').replace(/\s+/g, '').toLowerCase();
}

function isHeaderRow(row) {
  const cells = row.cells.filter((c) => c.text);
  if (!cells.length) return false;
  const joined = cells.map((c) => c.text).join(' ');
  if (isColonValueLine(joined)) return false;
  if (isDataRow(row)) return false;
  // A header row's cells are each a short label (not prose, not a bare number).
  // Cap PER CELL — a wide multi-column header row is long in total but each
  // column header stays short.
  return cells.every((c) => c.text.length < 90 && !/^-?\d+(?:\.\d+)?$/.test(c.text));
}

// --- table assembly -------------------------------------------------------

/** Builds a RAW table block from accumulated header cells + data rows. */
function buildTable(headerCells, dataRows, page) {
  const hasSerial = headerCells.some((h) => /\bs\.?\s*no\b|sr\.?\s*no/i.test(h.text));
  const headers = headerCells.map((h) => h.text);

  // Expand each data row into concrete cells, a group-label marker, or (for
  // 2-column occurrence tables) several "phrase | number" rows.
  const cellRows = [];
  for (const r of dataRows) {
    if (r.group !== undefined) { cellRows.push({ group: r.group }); continue; }
    // Occurrence table: one paragraph packs many "phrase N" rows. Only for
    // 1–2 header tables (a wide multi-column table never packs like this).
    if (headers.length <= 2) {
      const pairs = splitOccurrenceBlob(rowText(r));
      if (pairs.length >= 2) { for (const p of pairs) cellRows.push(p); continue; }
    }
    cellRows.push(dataCells(r, hasSerial));
  }

  const arrays = cellRows.filter(Array.isArray);
  const maxDataCols = Math.max(...arrays.map((r) => r.length), 0);
  if (maxDataCols < 2) return null;

  // Trailing empty columns: when the data's values are separate elements (a
  // multi-cell row), a header sitting to the RIGHT of every data cell is a
  // column with no data (§3.6 "Central Registration Number"). Reserve a column
  // for each so the merged middle header's colspan reaches the last data column
  // instead of leaving the last value under the trailing header.
  const dataXs = dataRows.flatMap((r) => (r.cells || []).map((c) => c.x)).filter((x) => typeof x === 'number');
  const multiCell = dataRows.some((r) => (r.cells || []).length >= 2);
  // A value-blob cell ("- 7 -") packs several columns at ONE x, so its x under-
  // reads the real column spread — disable the geometric trailing-empty check
  // for such tables (§6.1). It only applies to all-text-cell rows (§3.6).
  const hasValueBlobData = dataRows.some((r) => (r.cells || []).some((c) => c.text && isValueBlob(c.text.trim())));
  let trailingEmpty = 0;
  if (multiCell && !hasValueBlobData && dataXs.length > 0 && headerCells.length >= 2) {
    const maxDataX = Math.max(...dataXs);
    for (let i = headerCells.length - 1; i >= 1; i--) {
      if (typeof headerCells[i].x === 'number' && headerCells[i].x > maxDataX + 20) trailingEmpty++;
      else break;
    }
  }
  const colCount = Math.max(headers.length, maxDataCols + trailingEmpty);

  // Header row: pad/absorb. When there are fewer header cells than columns the
  // merged header (the one packing several logical columns into one element)
  // spans the deficit; trailing single-column headers keep their own column.
  const headerRow = [];
  if (headers.length === 0) {
    for (let c = 0; c < colCount; c++) headerRow.push({ content: '', 'column span': 1, pdfua_tag: 'TH' });
  } else {
    const deficit = colCount - headers.length;
    // Pick the merged header among the NON-trailing headers (usually the
    // longest text, e.g. "Name of Teacher Teacher Id Institute State Name of
    // State Board"), so the trailing headers stay aligned to the right.
    let mergeIdx = 0;
    if (deficit > 0) {
      for (let i = 0; i < headers.length - trailingEmpty; i++) {
        if (headers[i].length > headers[mergeIdx].length) mergeIdx = i;
      }
    }
    headers.forEach((h, idx) => {
      headerRow.push({ content: h, 'column span': idx === mergeIdx && deficit > 0 ? deficit + 1 : 1, pdfua_tag: 'TH' });
    });
  }

  const bodyRows = cellRows.map((r) => {
    if (!Array.isArray(r)) {
      // Full-width group-label row (interior sub-heading).
      return { cells: [{ content: r.group, 'column span': colCount, pdfua_tag: 'TD' }] };
    }
    const padded = [...r];
    while (padded.length < colCount) padded.push('-');
    return { cells: padded.slice(0, colCount).map((v) => ({ content: String(v), pdfua_tag: 'TD' })) };
  });

  return {
    type: 'table',
    rows: [{ cells: headerRow }, ...bodyRows],
    'page number': page,
    page,
  };
}

/**
 * Reconstructs tables in a section's block list. Returns a new block list
 * (tables + untouched pass-throughs) in original document order.
 */
function reconstructTables(blocks) {
  if (!blocks || blocks.length === 0) return blocks;

  const lines = toLines(blocks);
  // Cluster positioned lines into rows per page, then process ALL pages as one
  // reading-order stream so an inline table whose header sits only on the first
  // page carries down through data rows on later pages (§6.1/§3.6/§3.4 span
  // pages 6-8 / 12-15). Pass-throughs (real tables, prose, no-geometry blocks)
  // slot back by original document index.
  const passthroughs = [];
  const byPage = new Map();
  for (const line of lines) {
    if (line.passthrough) { passthroughs.push({ block: line.passthrough, oi: line.oi }); continue; }
    if (!byPage.has(line.page)) byPage.set(line.page, []);
    byPage.get(line.page).push(line);
  }

  // One reading-order stream of rows AND pass-throughs, ordered by (page, then
  // y top-down). Geometry — not document/block index — is reading order: two
  // spatially-overlapping lists (a §3.4 title list + its data list) interleave
  // correctly by y, and a real table / image between two inline regions still
  // resets the current region.
  const ptYTop = (b) => { const bb = b['bounding box']; return bb ? Math.max(bb[1], bb[3]) : Infinity; };
  const stream = [];
  for (const page of byPage.keys()) {
    for (const row of clusterLinesIntoRows(byPage.get(page))) {
      stream.push({ row, page, y: row.yT });
    }
  }
  for (const pt of passthroughs) stream.push({ passthrough: pt.block, page: pt.block['page number'] || 1, y: ptYTop(pt.block) });
  stream.sort((a, b) => (a.page - b.page) || (b.y - a.y));

  const emitted = [];
  let headerCells = [];
  let dataRows = [];

  const flush = () => {
    if (dataRows.length >= 1 && (headerCells.length >= 1 || dataRows.length >= 2)) {
      const page = (headerCells[0] || dataRows[0].cells[0]).page;
      const table = buildTable(headerCells, dataRows, page);
      if (table) {
        const oi = Math.min(...[...headerCells, ...dataRows.flatMap((r) => r.cells)].map((c) => c.oi));
        emitted.push({ block: table, oi });
        headerCells = [];
        dataRows = [];
        return;
      }
    }
    for (const c of headerCells) emitted.push({ block: lineToBlock(c), oi: c.oi });
    for (const r of dataRows) for (const c of r.cells) emitted.push({ block: lineToBlock(c), oi: c.oi });
    headerCells = [];
    dataRows = [];
  };

  const headerHasSerial = () => headerCells.some((c) => /\bs\.?\s*no\b|sr\.?\s*no/i.test(c.text));

  for (const item of stream) {
    if (item.passthrough) {
      // A real table resets the region (the §4.1 tables must not bleed into
      // §4.2's header). Images / watermarks do not — they sit inside a
      // continuing cross-page table (§6.1) and must not split it.
      if (item.passthrough.type === 'table') flush();
      emitted.push({ block: item.passthrough, oi: item.oi });
      continue;
    }
    const row = item.row;
    // A numbered sub-section title emitted as a paragraph/list-item ("4.2 Non-
    // Teaching Staff …", or "3.4 … Absence Sr. No. Name of Absent Teacher …")
    // is a heading, not a table header: break the region and render it as a
    // heading. If a table header is concatenated into it, split that out as a
    // header line so the following serial rows reconstruct into a table.
    if (row.cells.length === 1 && /^\d+(?:\.\d+)+[\s.):-]/.test(rowText(row).trim())) {
      flush();
      const c = row.cells[0];
      const full = c.text.trim();
      const embedded = full.match(/^(.*?\S)\s+(Sr\.?\s*No\.?\b.*)$/i);
      const titleText = embedded ? embedded[1] : full;
      const level = Math.min(titleText.match(/^\d+(?:\.\d+)+/)[0].split('.').length + 1, 6);
      emitted.push({
        block: { type: 'heading', level, content: titleText, 'bounding box': [c.x, c.yB, c.x, c.yT], 'page number': c.page },
        oi: c.oi,
      });
      if (embedded) headerCells.push({ text: embedded[2], x: c.x, yT: c.yT, yB: c.yB, page: c.page, oi: c.oi });
      continue;
    }
    if (isDataRow(row)) {
      dataRows.push(row);
    } else if (headerCells.length > 0 && headerHasSerial() && /^\d+\b/.test(rowText(row).trim())) {
      // A serial-led row inside a "Sr.No" table is a data row even when its
      // fields are all text (names, designations) with no numeric values —
      // §3.4 absence list, §3.6 discrepancy list.
      dataRows.push(row);
    } else if (headerCells.length > 0 && headerCells.length <= 2 && !headerHasSerial() && isOccurrenceRow(row)) {
      // Single "<phrase> N" observation row under a 1–2 column occurrence
      // header (§4.2, whose rows are separate paragraphs, not one blob).
      dataRows.push(row);
    } else if (isHeaderRow(row) && dataRows.length === 0) {
      headerCells.push(...row.cells); // accumulate staggered header rows
    } else if (isHeaderRow(row) && dataRows.length > 0 && row.cells.length === 1) {
      // A repeat of an accumulated header (§4.2 reprints its header on the next
      // page) is skipped; any other interior single-cell heading becomes a
      // full-width group-label row ("Modern Medical Staff" in §6.1) so the
      // table stays continuous and the label is never dropped.
      const key = headerKey(row.cells[0].text);
      if (!headerCells.some((c) => headerKey(c.text) === key)) {
        dataRows.push({ group: row.cells[0].text, cells: row.cells });
      }
    } else if (isHeaderRow(row) && dataRows.length > 0) {
      flush(); // a genuine multi-cell header after data → new table
      headerCells.push(...row.cells);
    } else {
      flush(); // prose / colon line: end the region, emit as paragraphs
      for (const c of row.cells) emitted.push({ block: lineToBlock(c), oi: c.oi });
    }
  }
  flush();

  // Emitted in the reading order the stream was processed in — no re-sort.
  return emitted.map((e) => e.block);
}

/** Turns a leftover line back into a paragraph block. */
function lineToBlock(line) {
  return {
    type: line.kind === 'heading' ? 'heading' : 'paragraph',
    content: line.text,
    'bounding box': [line.x, line.yB, line.x, line.yT],
    'page number': line.page,
  };
}

module.exports = { reconstructTables, splitInlineRow };
