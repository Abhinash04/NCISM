/**
 * CDM Sub-stage 3: Row Regrouper (P2)
 *
 * Within each section, clusters non-table text elements into rows by
 * y-band overlap, then orders cells by x-coordinate. Classification:
 *
 * - Block whose rows follow `label : value` pattern → **form**
 *   with `fields: [{label, value, extras}]`.
 * - Block whose first row(s) look like labels (short, title-case, no
 *   digits) → **pseudo-table** with inferred columns.
 * - Remaining → plain paragraphs (passed through unchanged).
 *
 * This is the proven `element-utils` y-band technique, promoted from
 * per-extractor hack to a generic pipeline stage.
 */

const { reconstructTables } = require('./spatial-table');

/**
 * Returns the y-range [yMin, yMax] for an element's bounding box.
 * Bounding box format: [x0, yBottom, x1, yTop] in PDF coordinates.
 */
function yRange(el) {
  const box = el['bounding box'];
  if (!box) return null;
  return [Math.min(box[1], box[3]), Math.max(box[1], box[3])];
}

function xLeft(el) {
  const box = el['bounding box'];
  return box ? box[0] : 0;
}

/**
 * Two elements overlap vertically if their y-ranges intersect.
 */
function yOverlaps(rangeA, rangeB) {
  if (!rangeA || !rangeB) return false;
  return rangeA[0] <= rangeB[1] && rangeB[0] <= rangeA[1];
}

/**
 * Clusters elements into rows by y-band overlap. Elements that share
 * overlapping y-ranges are grouped into the same row.
 *
 * @param {Array} elements - Non-table text elements
 * @returns {Array<Array>} Array of rows, each row is an array of elements sorted by x
 */
function clusterIntoRows(elements) {
  if (elements.length === 0) return [];

  // Sort by y-band midpoint (descending for PDF coords where y grows up)
  const sorted = [...elements].sort((a, b) => {
    const aRange = yRange(a);
    const bRange = yRange(b);
    if (!aRange || !bRange) return 0;
    const aMid = (aRange[0] + aRange[1]) / 2;
    const bMid = (bRange[0] + bRange[1]) / 2;
    return bMid - aMid; // Higher y (top of page) first
  });

  const rows = [];
  const assigned = new Set();

  for (const el of sorted) {
    if (assigned.has(el)) continue;
    const range = yRange(el);
    if (!range) {
      rows.push([el]);
      assigned.add(el);
      continue;
    }

    // Find all unassigned elements that overlap with this element's y-band
    const row = [el];
    assigned.add(el);

    // Expand the band as we find overlapping elements
    let bandMin = range[0];
    let bandMax = range[1];

    for (const other of sorted) {
      if (assigned.has(other)) continue;
      const otherRange = yRange(other);
      if (!otherRange) continue;
      if (other['page number'] !== el['page number']) continue;

      if (yOverlaps([bandMin, bandMax], otherRange)) {
        row.push(other);
        assigned.add(other);
        bandMin = Math.min(bandMin, otherRange[0]);
        bandMax = Math.max(bandMax, otherRange[1]);
      }
    }

    // Sort row cells by x position (left to right)
    row.sort((a, b) => xLeft(a) - xLeft(b));
    rows.push(row);
  }

  return rows;
}

/**
 * Detects if a row is a "label : value" pair. A label element ends with
 * ':' or ':-' and sits to the left of the value.
 */
function isLabelValueRow(row) {
  if (row.length < 2) return false;
  const firstText = (row[0].content || '').trim();
  return /[:]\s*[-]?\s*$/.test(firstText);
}

/**
 * Detects if a row looks like a header row (short text, mostly title-case
 * or uppercase, no digits).
 */
function isHeaderLikeRow(row) {
  return row.every((cell) => {
    const text = (cell.content || '').trim();
    return text.length < 40 && text.length > 0 && !/\d{2,}/.test(text);
  });
}

/**
 * Regroups a section's non-table blocks into forms, pseudo-tables, or
 * plain paragraphs.
 *
 * @param {Array} blocks - Block elements from a section
 * @returns {Array} Regrouped blocks with type annotations
 */
function regroupBlocks(blocks) {
  // Separate table elements (already structured) from text elements
  const result = [];
  let textBuffer = [];

  for (const block of blocks) {
    if (block.type === 'table' || block.type === 'form' || block.type === 'pseudo-table') {
      // Flush text buffer
      if (textBuffer.length > 0) {
        result.push(...classifyTextBlock(textBuffer));
        textBuffer = [];
      }
      result.push(block);
    } else {
      textBuffer.push(block);
    }
  }

  // Flush remaining
  if (textBuffer.length > 0) {
    result.push(...classifyTextBlock(textBuffer));
  }

  return result;
}

/**
 * Classifies a contiguous block of text elements into form, pseudo-table,
 * or plain paragraphs.
 */
function classifyTextBlock(elements) {
  // Only attempt regrouping if elements have bounding boxes
  const withBbox = elements.filter((e) => e['bounding box']);
  if (withBbox.length < 2) return elements; // Not enough for regrouping

  // Group elements by page first. Only elements WITH a bounding box are
  // clustered here; bbox-less elements are emitted once via `noBbox` below.
  // (Including them here too double-emitted every bbox-less block — e.g. the
  // numbered-title heading blocks produced by the spatial table builder.)
  const byPage = new Map();
  for (const el of elements) {
    if (!el['bounding box']) continue;
    const page = el['page number'] || 1;
    if (!byPage.has(page)) byPage.set(page, []);
    byPage.get(page).push(el);
  }

  const result = [];
  // Elements without bounding boxes go through as-is
  const noBbox = elements.filter((e) => !e['bounding box']);
  result.push(...noBbox);

  for (const [page, pageEls] of byPage) {
    const rows = clusterIntoRows(pageEls);

    // Check if this block is a form (majority of rows are label:value)
    const lvRows = rows.filter((r) => isLabelValueRow(r));
    if (lvRows.length > 0 && lvRows.length >= rows.length * 0.4) {
      const fields = [];
      const leftoverRows = [];

      for (const row of rows) {
        if (isLabelValueRow(row)) {
          const labelText = (row[0].content || '').trim().replace(/[:]\s*[-]?\s*$/, '').trim();
          const valueParts = row.slice(1).map((c) => (c.content || '').trim()).filter(Boolean);
          const value = valueParts[0] || '';
          const extras = valueParts.slice(1);
          fields.push({
            label: labelText,
            value,
            extras,
            bbox: row[0]['bounding box'],
            page,
          });
        } else {
          // Non-label rows in a form block — pass through
          leftoverRows.push(...row);
        }
      }

      if (fields.length > 0) {
        result.push({ type: 'form', fields, page });
      }
      result.push(...leftoverRows);
      continue;
    }

    // Check if this block is a pseudo-table (first row(s) are header-like)
    if (rows.length >= 2 && isHeaderLikeRow(rows[0]) && rows[0].length >= 2) {
      const headers = rows[0].map((c) => (c.content || '').trim());
      const dataRows = rows.slice(1).map((row) =>
        row.map((c) => (c.content || '').trim())
      );

      // Only classify as pseudo-table if data rows have similar column counts
      const avgCols = dataRows.reduce((s, r) => s + r.length, 0) / dataRows.length;
      if (Math.abs(avgCols - headers.length) <= 1) {
        result.push({
          type: 'pseudo-table',
          headers,
          dataRows,
          page,
        });
        continue;
      }
    }

    // Default: pass through as individual elements
    for (const row of rows) {
      result.push(...row);
    }
  }

  return result;
}

/**
 * Reconstructs Visitor Details section blocks into a unified table.
 */
function collectTextFromBlock(block, pageNum) {
  const items = [];
  
  if (block.content) {
    const text = block.content.trim();
    if (text) {
      items.push({ content: text, page: pageNum });
    }
  }
  
  if (block.items) {
    for (const item of block.items) {
      items.push(...collectTextFromBlock(item, pageNum));
    }
  }
  
  if (block.kids) {
    for (const kid of block.kids) {
      items.push(...collectTextFromBlock(kid, pageNum));
    }
  }
  
  if (block.dataRows) {
    for (const row of block.dataRows) {
      for (const cell of row) {
        const text = (cell || '').trim();
        if (text) {
          items.push({ content: text, page: pageNum });
        }
      }
    }
  }
  
  return items;
}

function reconstructVisitorDetails(blocks) {
  const textItems = [];
  const otherBlocks = [];

  for (const block of blocks) {
    const pageNum = block.page || block['page number'] || 1;
    if (block.type === 'paragraph' || block.type === 'list' || block.type === 'pseudo-table') {
      const extracted = collectTextFromBlock(block, pageNum);
      for (const ext of extracted) {
        const content = ext.content;
        if (content !== 'Visitor Details' && content !== 'Sr. No.' && content !== 'Visitor Name Visitor Id') {
          textItems.push(ext);
        }
      }
    } else {
      otherBlocks.push(block);
    }
  }

  const rows = [];
  let currentSrNo = '';
  let currentName = '';
  let currentId = '';

  for (const item of textItems) {
    const text = item.content;
    
    if (/^\d+$/.test(text)) {
      if (currentName || currentId) {
        rows.push([currentSrNo, currentName, currentId]);
        currentName = '';
        currentId = '';
      }
      currentSrNo = text;
    } else if (/[Vv]\d{4,5}/.test(text) || /AYU\d{4}/.test(text)) {
      currentId = text;
      rows.push([currentSrNo || String(rows.length + 1), currentName, currentId]);
      currentSrNo = '';
      currentName = '';
      currentId = '';
    } else {
      if (currentName) {
        currentName += ' ' + text;
      } else {
        currentName = text;
      }
    }
  }

  if (currentName || currentId) {
    rows.push([currentSrNo || String(rows.length + 1), currentName, currentId]);
  }

  if (rows.length > 0) {
    const tableRows = [
      {
        cells: [
          { pdfua_tag: 'TH', content: 'Sr. No.' },
          { pdfua_tag: 'TH', content: 'Visitor Name & College' },
          { pdfua_tag: 'TH', content: 'Visitor Id & College Id' }
        ]
      },
      ...rows.map(r => ({
        cells: [
          { pdfua_tag: 'TD', content: r[0] },
          { pdfua_tag: 'TD', content: r[1] },
          { pdfua_tag: 'TD', content: r[2] }
        ]
      }))
    ];

    return [
      ...otherBlocks,
      {
        type: 'table',
        rows: tableRows,
        page: 1
      }
    ];
  }

  return blocks;
}

/**
 * Main entry point for table reconstruction in a section. The Visitor Details
 * block has its own name↔id pairing; everything else goes through the generic
 * geometry-driven spatial table builder.
 */
function reconstructSectionTables(blocks, sectionTitle) {
  if (!blocks || blocks.length === 0) return blocks;

  const visitorDetailsIdx = blocks.findIndex((b) =>
    (b.type === 'heading' || b.type === 'paragraph') &&
    (b.content || '').trim().toLowerCase() === 'visitor details'
  );
  if (visitorDetailsIdx !== -1) {
    const before = blocks.slice(0, visitorDetailsIdx + 1);
    const after = reconstructVisitorDetails(blocks.slice(visitorDetailsIdx + 1));
    return [...before, ...reconstructTables(after)];
  }

  return reconstructTables(blocks);
}

module.exports = { regroupBlocks, clusterIntoRows, reconstructSectionTables };
