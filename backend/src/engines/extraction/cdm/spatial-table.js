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

/** Clusters lines on one page into rows by y-band overlap; cells sorted by x. */
function clusterLinesIntoRows(lines) {
  const sorted = [...lines].sort((a, b) => b.yT - a.yT);
  const rows = [];
  const used = new Set();
  for (const line of sorted) {
    if (used.has(line)) continue;
    let bandMin = line.yB, bandMax = line.yT;
    const row = [line];
    used.add(line);
    for (const other of sorted) {
      if (used.has(other)) continue;
      if (other.yB <= bandMax && bandMin <= other.yT) { // overlap
        row.push(other);
        used.add(other);
        bandMin = Math.min(bandMin, other.yB);
        bandMax = Math.max(bandMax, other.yT);
      }
    }
    row.sort((a, b) => a.x - b.x);
    rows.push({ cells: row, yT: bandMax });
  }
  return rows.sort((a, b) => b.yT - a.yT);
}

// --- row classification ---------------------------------------------------

/** Extracts a data row's cells: leading label + trailing value tokens. */
function dataCells(row, hasSerialHeader) {
  const joined = row.cells.map((c) => c.text).filter(Boolean).join(' ');
  const { label, values } = splitInlineRow(joined);
  const cells = [];
  const serial = label.match(/^(\d+)[.)]?\s+(.*)$/);
  if (hasSerialHeader && serial) {
    cells.push(serial[1], serial[2]);
  } else if (label) {
    cells.push(label);
  }
  return cells.concat(values);
}

function isDataRow(row) {
  const joined = row.cells.map((c) => c.text).filter(Boolean).join(' ');
  if (isColonValueLine(joined)) return false;
  const { label, values } = splitInlineRow(joined);
  if (values.length >= 2) return true;
  if (values.length === 1 && /^\d+[.)]?\s+\S/.test(label)) return true; // "1 Name  100"
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
  const rows = dataRows.map((r) => dataCells(r, hasSerial));
  const maxDataCols = Math.max(...rows.map((r) => r.length), 0);
  if (maxDataCols < 2) return null;

  const headers = headerCells.map((h) => h.text);
  const colCount = Math.max(headers.length, maxDataCols);

  // Header row: pad/absorb. When there are fewer header cells than columns the
  // leftmost header spans the deficit (merged "Sr.No + Name" / single heading
  // header over N columns) — honest, invents no column boundaries.
  const headerRow = [];
  if (headers.length === 0) {
    // No header text — emit a column-count-only header of blanks.
    for (let c = 0; c < colCount; c++) headerRow.push({ content: '', 'column span': 1, pdfua_tag: 'TH' });
  } else {
    const deficit = colCount - headers.length;
    headers.forEach((h, idx) => {
      headerRow.push({ content: h, 'column span': idx === 0 && deficit > 0 ? deficit + 1 : 1, pdfua_tag: 'TH' });
    });
  }

  const dataTableRows = rows.map((cells) => {
    const padded = [...cells];
    while (padded.length < colCount) padded.push('-');
    return { cells: padded.slice(0, colCount).map((v) => ({ content: String(v), pdfua_tag: 'TD' })) };
  });

  return {
    type: 'table',
    rows: [{ cells: headerRow }, ...dataTableRows],
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
  // Preserve reading order but cluster per page.
  const byPage = new Map();
  const order = []; // { kind:'page'|'passthrough', ... } to rebuild order
  for (const line of lines) {
    if (line.passthrough) { order.push({ passthrough: line.passthrough, oi: line.oi }); continue; }
    if (!byPage.has(line.page)) { byPage.set(line.page, []); order.push({ pageRef: line.page, oi: line.oi }); }
    byPage.get(line.page).push(line);
  }

  // Build a map: page -> ordered emitted blocks (tables + leftover paragraphs).
  const pageBlocks = new Map();
  for (const [page, pageLines] of byPage) {
    const rows = clusterLinesIntoRows(pageLines);
    const emitted = [];
    let headerCells = [];
    let dataRows = [];

    const flush = () => {
      if (dataRows.length >= 1 && (headerCells.length >= 1 || dataRows.length >= 2)) {
        const table = buildTable(headerCells, dataRows, page);
        if (table) {
          emitted.push({ block: table, oi: Math.min(...[...headerCells, ...dataRows.flatMap((r) => r.cells)].map((c) => c.oi)) });
          headerCells = [];
          dataRows = [];
          return;
        }
      }
      // Not a table — release accumulated header + data rows as paragraphs.
      for (const c of headerCells) emitted.push({ block: lineToBlock(c), oi: c.oi });
      for (const r of dataRows) for (const c of r.cells) emitted.push({ block: lineToBlock(c), oi: c.oi });
      headerCells = [];
      dataRows = [];
    };

    for (const row of rows) {
      const joined = row.cells.map((c) => c.text).filter(Boolean).join(' ');
      if (isDataRow(row)) {
        dataRows.push(row);
      } else if (isHeaderRow(row) && dataRows.length === 0) {
        headerCells.push(...row.cells); // accumulate staggered header rows
      } else if (isHeaderRow(row) && dataRows.length > 0) {
        flush(); // a new header after data → new table
        headerCells.push(...row.cells);
      } else {
        // Prose / colon line / anything else: end any region, emit as paragraphs.
        flush();
        for (const c of row.cells) emitted.push({ block: lineToBlock(c), oi: c.oi });
        void joined;
      }
    }
    flush();

    // Sort this page's emitted blocks back into document order.
    emitted.sort((a, b) => a.oi - b.oi);
    pageBlocks.set(page, emitted.map((e) => e.block));
  }

  // Rebuild the section block list in original order, expanding page refs once.
  const out = [];
  const emittedPages = new Set();
  for (const o of order) {
    if (o.passthrough) { out.push(o.passthrough); continue; }
    if (!emittedPages.has(o.pageRef)) {
      out.push(...(pageBlocks.get(o.pageRef) || []));
      emittedPages.add(o.pageRef);
    }
  }
  return out;
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
