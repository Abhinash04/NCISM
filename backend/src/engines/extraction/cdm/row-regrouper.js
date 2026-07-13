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

  // Group elements by page first
  const byPage = new Map();
  for (const el of elements) {
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
 * Splits an inline text row into a label and trailing value tokens.
 */
function splitInlineRow(text) {
  if (!text) return { label: '', values: [] };
  const cleanText = text.trim().replace(/\s+/g, ' ');
  const parts = cleanText.split(' ');
  
  const isDataToken = (str) => {
    if (!str) return false;
    // Check if it's a number (with optional decimal, minus, percent)
    if (/^-?\d+(?:\.\d+)?%?$/.test(str)) return true;
    // Check if it's a dash/hyphen (various forms)
    if (/^[–—\-]$/.test(str)) return true;
    
    // Check common keywords
    const lower = str.toLowerCase();
    const keywords = [
      'yes', 'no', 'verified-correct', 'verifiedcorrect', 'verified', 'correct',
      'na', 'n.a.', 'n/a', 'adequate', 'inadequate', 'satisfactory', 'available',
      'both', 'functional', 'verifiedcorrected'
    ];
    if (keywords.includes(lower)) return true;
    return false;
  };

  const values = [];
  let i = parts.length - 1;
  while (i >= 0) {
    let token = parts[i];
    // Check for two-word tokens like "both available" or "verified correct"
    if (i > 0) {
      const twoWords = (parts[i-1] + ' ' + parts[i]).toLowerCase();
      if (twoWords === 'both available' || twoWords === 'verified correct') {
        token = parts[i-1] + ' ' + parts[i];
        i--;
      }
    }
    
    if (isDataToken(token)) {
      values.unshift(token);
      i--;
    } else {
      break;
    }
  }

  const label = parts.slice(0, i + 1).join(' ').trim();
  return { label, values };
}

/**
 * Checks if a text content represents a table data row.
 */
function isInlineDataRow(text) {
  if (!text) return false;
  const { label, values } = splitInlineRow(text);
  if (values.length >= 2) return true;
  if (values.length === 1 && label.match(/^\d+[\s.):\-]+/)) return true;
  return false;
}

/**
 * Merges consecutive paragraphs where one is a label and the next is a list of values.
 */
function mergeInlineRows(blocks) {
  const merged = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type === 'paragraph') {
      const nextBlock = blocks[i + 1];
      if (nextBlock && nextBlock.type === 'paragraph') {
        const text = (block.content || '').trim();
        const nextText = (nextBlock.content || '').trim();
        
        const isLabelOnly = (str) => {
          const { values } = splitInlineRow(str);
          return values.length === 0;
        };
        const isValuesOnly = (str) => {
          const { label, values } = splitInlineRow(str);
          return label.length === 0 && values.length >= 2;
        };
        
        if (isLabelOnly(text) && isValuesOnly(nextText)) {
          merged.push({
            ...block,
            content: text + ' ' + nextText
          });
          i++; // Skip next block
          continue;
        }
      }
    }
    merged.push(block);
  }
  return merged;
}

/**
 * Sorts header blocks by X coordinate and returns their text contents.
 */
function sortHeadersByX(headerBlocks) {
  const sorted = [...headerBlocks].sort((a, b) => {
    const aBox = a['bounding box'] || [0, 0, 0, 0];
    const bBox = b['bounding box'] || [0, 0, 0, 0];
    return aBox[0] - bBox[0];
  });
  return sorted.map(b => (b.content || '').trim());
}

/**
 * Splits a single header string into multiple column names based on target count.
 */
function splitHeaderString(headerText, targetColumnCount) {
  const clean = headerText.trim().replace(/\s+/g, ' ');
  const words = clean.split(' ');
  
  if (targetColumnCount <= 1 || words.length <= 1) {
    return [headerText];
  }
  
  if (words.length === targetColumnCount) {
    return words;
  }
  
  const parts = [];
  const wordsPerPart = Math.ceil(words.length / targetColumnCount);
  for (let i = 0; i < targetColumnCount; i++) {
    const part = words.slice(i * wordsPerPart, (i + 1) * wordsPerPart).join(' ');
    if (part) parts.push(part);
  }
  return parts;
}

/**
 * Reconstructs a table block from candidate header and data row blocks.
 */
function buildTableFromInlineRows(headerBlocks, dataRowBlocks) {
  let headers = sortHeadersByX(headerBlocks);
  const page = dataRowBlocks[0]?.page || 1;

  const parsedRows = dataRowBlocks.map((rowBlock) => {
    const text = rowBlock.content;
    const { label, values } = splitInlineRow(text);
    
    let cells = [];
    const match = label.match(/^(\d+)(?:\.|\s+)\s*(.*)$/);
    if (match && headers[0] && headers[0].toLowerCase().includes('sr')) {
      cells.push(match[1]);
      cells.push(match[2]);
    } else if (label) {
      cells.push(label);
    }
    
    for (const val of values) {
      cells.push(val);
    }
    return cells;
  });

  const maxDataCols = Math.max(...parsedRows.map(r => r.length), 1);

  // Refuse low-confidence reconstruction: a single non-"Sr.No" header that
  // would have to be word-chopped into 3+ columns is almost always a
  // mislabeled value/label paragraph (e.g. the interleaved §2.1 area block).
  // Rendering readable paragraphs beats emitting garbage split-word headers.
  if (headers.length === 1 && maxDataCols >= 3 && !/sr\.?\s*no|section/i.test(headers[0])) {
    return null;
  }

  if (headers.length < maxDataCols && headers.length > 0) {
    if (headers.length === 1) {
      headers = splitHeaderString(headers[0], maxDataCols);
    } else {
      const lastHeader = headers.pop();
      const remainingCols = maxDataCols - headers.length;
      const splitLast = splitHeaderString(lastHeader, remainingCols);
      headers.push(...splitLast);
    }
  }

  if (headers.length === 0) {
    for (let c = 1; c <= maxDataCols; c++) {
      headers.push(`Column ${c}`);
    }
  }

  const rows = parsedRows.map((cells) => {
    while (cells.length < headers.length) {
      cells.push('-');
    }
    if (cells.length > headers.length) {
      cells = cells.slice(0, headers.length);
    }
    return {
      cells: cells.map(c => ({ pdfua_tag: 'TD', content: c }))
    };
  });

  const headerCells = headers.map(h => ({ pdfua_tag: 'TH', content: h }));
  const allRows = [
    { cells: headerCells },
    ...rows
  ];

  return {
    type: 'table',
    rows: allRows,
    page
  };
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
 * Main entry point for table reconstruction in a section.
 */
function reconstructSectionTables(blocks, sectionTitle) {
  if (!blocks || blocks.length === 0) return [];

  // First, check if there is a 'Visitor Details' heading/paragraph block
  const visitorDetailsIdx = blocks.findIndex(b =>
    (b.type === 'heading' || b.type === 'paragraph') &&
    (b.content || '').trim().toLowerCase() === 'visitor details'
  );

  let mergedBlocks = blocks;
  if (visitorDetailsIdx !== -1) {
    const beforeBlocks = blocks.slice(0, visitorDetailsIdx + 1);
    const visitorBlocks = blocks.slice(visitorDetailsIdx + 1);
    const reconstructedVisitor = reconstructVisitorDetails(visitorBlocks);
    mergedBlocks = [...beforeBlocks, ...reconstructedVisitor];
  }

  // First, merge any wrapped label + value paragraphs
  mergedBlocks = mergeInlineRows(mergedBlocks);

  const result = [];
  let i = 0;
  while (i < mergedBlocks.length) {
    const block = mergedBlocks[i];

    // Check if this block or subsequent blocks form an inline table
    let dataRowBlocks = [];
    let j = i;
    while (j < mergedBlocks.length) {
      const b = mergedBlocks[j];
      if (b.type === 'paragraph' && isInlineDataRow(b.content)) {
        dataRowBlocks.push({ type: 'paragraph', content: b.content, page: b.page || b['page number'] || 1 });
        j++;
      } else if (b.type === 'list') {
        const items = b.items || b['list items'] || [];
        const allItemsAreData = items.length > 0 && items.every(item => isInlineDataRow(item.content));
        if (allItemsAreData) {
          for (const item of items) {
            dataRowBlocks.push({ type: 'list-item', content: item.content, page: b.page || b['page number'] || 1 });
          }
          j++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (dataRowBlocks.length >= 1) {
      // Backtrack to find header candidates
      const headers = [];
      let k = i - 1;
      while (k >= 0) {
        const prevBlock = mergedBlocks[k];
        if (prevBlock.type !== 'paragraph') break;
        const text = (prevBlock.content || '').trim();
        if (text.length > 100 || isInlineDataRow(text)) break;
        
        headers.unshift(prevBlock);
        k--;
      }

      if (headers.length >= 1) {
        const tableBlock = buildTableFromInlineRows(headers, dataRowBlocks);
        if (tableBlock) {
          // Only consume the header blocks once we know reconstruction succeeded.
          const headerCount = i - 1 - k;
          for (let hc = 0; hc < headerCount; hc++) {
            result.pop();
          }
          result.push(tableBlock);
          i = j;
          continue;
        }
      }
    }

    result.push(block);
    i++;
  }

  return result;
}

module.exports = { regroupBlocks, clusterIntoRows, reconstructSectionTables };
