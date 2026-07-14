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
      for (const it of items) {
        lines.push({
          text: (it.content || '').replace(/\s+/g, ' ').trim(),
          x: xLeft(it), yT: yTop(it), yB: yBot(it),
          page: block['page number'] || 1, kind: 'item', oi,
        });
      }
    } else {
      lines.push({ passthrough: block, oi });
    }
  });
  return lines;
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

// An identifier token like "AYSS01576" / "AYPS01794" (≥2 letters + ≥3 digits).
const ID_TOKEN = /^[A-Za-z]{2,}\d{3,}$/;

/** Extracts a data row's cells: leading label + trailing value tokens. */
function dataCells(row, hasSerialHeader) {
  const { label, values } = splitInlineRow(rowText(row));
  const cells = [];
  let rest = label;
  const serial = label.match(/^(\d+)[.)]?\s+(.*)$/);
  if (hasSerialHeader && serial) {
    cells.push(serial[1]);
    rest = serial[2];
  }
  // Generic ID-anchored split: "SHRADHA BHARDWAJ AYSS01576 Madhya Pradesh"
  // → name | id | trailing-state. Fires only when an ID token is present, so
  // ordinary labels ("Hospital Superintendent") are untouched. No vocabulary.
  const idm = rest.match(/^(.+?)\s+([A-Za-z]{2,}\d{3,})\b\s*(.*)$/);
  if (idm) {
    if (idm[1].trim()) cells.push(idm[1].trim());
    cells.push(idm[2]);
    if (idm[3].trim()) cells.push(idm[3].trim());
  } else if (!hasSerialHeader || !serial) {
    if (label) cells.push(label);
  } else if (rest) {
    cells.push(rest);
  }
  return cells.concat(values);
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
  const colCount = Math.max(headers.length, maxDataCols);

  // Header row: pad/absorb. When there are fewer header cells than columns the
  // leftmost header spans the deficit (merged "Sr.No + Name" / single heading
  // header over N columns) — honest, invents no column boundaries.
  const headerRow = [];
  if (headers.length === 0) {
    for (let c = 0; c < colCount; c++) headerRow.push({ content: '', 'column span': 1, pdfua_tag: 'TH' });
  } else {
    const deficit = colCount - headers.length;
    headers.forEach((h, idx) => {
      headerRow.push({ content: h, 'column span': idx === 0 && deficit > 0 ? deficit + 1 : 1, pdfua_tag: 'TH' });
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

  const rows = [];
  for (const page of [...byPage.keys()].sort((a, b) => a - b)) {
    rows.push(...clusterLinesIntoRows(byPage.get(page)));
  }

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

  for (const row of rows) {
    if (isDataRow(row)) {
      dataRows.push(row);
    } else if (headerCells.length > 0 && headerHasSerial() && /^\d+\b/.test(rowText(row).trim())) {
      // A serial-led row inside a "Sr.No" table is a data row even when its
      // fields are all text (names, designations) with no numeric values —
      // §3.4 absence list, §3.6 discrepancy list.
      dataRows.push(row);
    } else if (isHeaderRow(row) && dataRows.length === 0) {
      headerCells.push(...row.cells); // accumulate staggered header rows
    } else if (isHeaderRow(row) && dataRows.length > 0 && row.cells.length === 1) {
      // Interior single-cell heading mid-table → full-width group-label row
      // (e.g. "Modern Medical Staff" inside the §6.1 staff list). Keep the
      // table continuous; never drop the label.
      dataRows.push({ group: row.cells[0].text, cells: row.cells });
    } else if (isHeaderRow(row) && dataRows.length > 0) {
      flush(); // a genuine multi-cell header after data → new table
      headerCells.push(...row.cells);
    } else {
      flush(); // prose / colon line: end the region, emit as paragraphs
      for (const c of row.cells) emitted.push({ block: lineToBlock(c), oi: c.oi });
    }
  }
  flush();

  // Merge reconstructed blocks with pass-throughs by document order.
  return [...emitted, ...passthroughs].sort((a, b) => a.oi - b.oi).map((e) => e.block);
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
