/**
 * CDM Sub-stage 4: Table Normalizer (P3)
 *
 * Normalizes raw table elements from the element JSON:
 *
 * 1. **Expand rowspan/colspan** into a logical grid — every logical cell
 *    filled with rowspan carry-forward.
 * 2. **Build header tree** from the header band (rows before the first
 *    data row, detected structurally).
 * 3. **Flatten header paths** into column names (e.g., "Required | Professor").
 * 4. **Cross-page stitching**: consecutive tables whose header signature
 *    matches merge into one logical table, headers deduped, rowspan
 *    carry-forward across the seam.
 * 5. **Notes attachment**: paragraphs immediately below a table that look
 *    like notes attach as `table.notes[]`.
 */

/**
 * Gets the text content of a table cell.
 */
function cellTextContent(cell) {
  if (!cell) return '';
  if (typeof cell.content === 'string') return cell.content.trim();
  // Cell with kids (paragraphs inside)
  if (cell.kids) {
    return cell.kids
      .map((k) => (typeof k.content === 'string' ? k.content : ''))
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return '';
}

/**
 * Expands a table's rows into a logical grid, filling rowspan/colspan.
 * Each grid cell is { text, rowSpan, colSpan, isHeader, originalCell }.
 *
 * @param {Array} rows - Table rows with cells
 * @returns {Array<Array>} 2D grid
 */
function expandToGrid(rows) {
  if (!rows || rows.length === 0) return [];

  // Determine grid dimensions
  let maxCols = 0;
  for (const row of rows) {
    let cols = 0;
    for (const cell of row.cells || []) {
      cols += cell['column span'] || 1;
    }
    maxCols = Math.max(maxCols, cols);
  }

  // Build grid with rowspan/colspan expansion
  const grid = [];
  const rowSpanTracker = []; // Track active rowspans per column

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const gridRow = new Array(maxCols).fill(null);

    // Initialize rowspan tracker for this row
    while (rowSpanTracker.length < maxCols) rowSpanTracker.push(null);

    // First pass: place rowspan carry-forwards
    for (let ci = 0; ci < maxCols; ci++) {
      if (rowSpanTracker[ci] && rowSpanTracker[ci].remaining > 0) {
        gridRow[ci] = {
          text: rowSpanTracker[ci].text,
          rowSpan: 1,
          colSpan: 1,
          isHeader: rowSpanTracker[ci].isHeader,
          isCarryForward: true,
          originalCell: rowSpanTracker[ci].originalCell,
        };
        rowSpanTracker[ci].remaining--;
        if (rowSpanTracker[ci].remaining === 0) {
          rowSpanTracker[ci] = null;
        }
      }
    }

    // Second pass: place actual cells
    let cellIdx = 0;
    for (const cell of row.cells || []) {
      const colSpan = cell['column span'] || 1;
      const rowSpan = cell['row span'] || 1;
      const isHeader = cell.pdfua_tag === 'TH';
      const text = cellTextContent(cell);

      // Find the next empty slot using column number if available
      const declaredCol = cell['column number'];
      if (declaredCol && declaredCol > 0 && declaredCol <= maxCols) {
        cellIdx = declaredCol - 1;
      } else {
        while (cellIdx < maxCols && gridRow[cellIdx] !== null) cellIdx++;
      }

      // Place the cell
      for (let cs = 0; cs < colSpan && cellIdx + cs < maxCols; cs++) {
        gridRow[cellIdx + cs] = {
          text: cs === 0 ? text : text, // All spanning cells get the text
          rowSpan,
          colSpan,
          isHeader,
          isCarryForward: false,
          originalCell: cell,
        };

        // Set up rowspan tracking for subsequent rows
        if (rowSpan > 1) {
          rowSpanTracker[cellIdx + cs] = {
            text,
            remaining: rowSpan - 1,
            isHeader,
            originalCell: cell,
          };
        }
      }

      cellIdx += colSpan;
    }

    // Fill any remaining nulls with empty cells
    for (let ci = 0; ci < maxCols; ci++) {
      if (gridRow[ci] === null) {
        gridRow[ci] = { text: '', rowSpan: 1, colSpan: 1, isHeader: false, isCarryForward: false, originalCell: null };
      }
    }

    grid.push(gridRow);
  }

  return grid;
}

/**
 * Detects the header band: consecutive rows at the top where ≥50% of
 * cells are marked as headers (TH) or all cells are non-numeric text.
 */
function detectHeaderBand(grid) {
  let headerRows = 0;

  for (let ri = 0; ri < grid.length; ri++) {
    const row = grid[ri];
    const headerCount = row.filter((c) => c.isHeader).length;
    const nonEmpty = row.filter((c) => c.text.trim().length > 0);

    // A header row: ≥50% of cells are TH, or all non-empty cells are non-numeric text
    const isNumeric = (t) => /^\d+([.,]\d+)?$/.test(t.trim());
    const allText = nonEmpty.length > 0 && nonEmpty.every((c) => !isNumeric(c.text));

    if (headerCount >= row.length * 0.5 || (ri < 3 && allText && nonEmpty.length >= 2)) {
      headerRows++;
    } else {
      break; // First non-header row ends the header band
    }
  }

  return Math.max(headerRows, 1); // At least 1 header row
}

/**
 * Builds header paths from a multi-row header band. Each column gets a
 * path like "Required | Professor" from the header tree.
 *
 * @param {Array<Array>} headerGrid - Grid rows that form the header
 * @returns {string[]} Flattened column names
 */
function buildHeaderPaths(headerGrid) {
  if (headerGrid.length === 0) return [];

  const numCols = headerGrid[0].length;
  const paths = [];

  for (let ci = 0; ci < numCols; ci++) {
    const parts = [];
    for (let ri = 0; ri < headerGrid.length; ri++) {
      const text = (headerGrid[ri][ci]?.text || '').trim();
      if (text && !parts.includes(text)) {
        parts.push(text);
      }
    }
    paths.push(parts.join(' | ') || `Column ${ci + 1}`);
  }

  return paths;
}

/**
 * Normalizes a single table element into the CDM table format.
 */
function normalizeTable(tableElement) {
  const grid = expandToGrid(tableElement.rows || []);
  if (grid.length === 0) {
    return {
      type: 'table',
      caption: null,
      headerTree: [],
      columns: [],
      grid: [],
      rows: [],
      notes: [],
      page: tableElement['page number'] || 1,
      originalElement: tableElement,
    };
  }

  const headerRowCount = detectHeaderBand(grid);
  const headerGrid = grid.slice(0, headerRowCount);
  const dataGrid = grid.slice(headerRowCount);
  const columns = buildHeaderPaths(headerGrid);

  // Build row objects with cells accessible by column name
  const dataRows = dataGrid.map((gridRow, ri) => {
    const cells = {};
    for (let ci = 0; ci < gridRow.length; ci++) {
      const colName = columns[ci] || `Column ${ci + 1}`;
      cells[colName] = gridRow[ci]?.text || '';
    }
    return {
      cells,
      gridRow: gridRow.map((c) => c?.text || ''),
      page: tableElement['page number'] || 1,
    };
  });

  return {
    type: 'table',
    caption: null,
    headerTree: headerGrid.map((row) => row.map((c) => c?.text || '')),
    columns,
    grid: grid.map((row) => row.map((c) => c?.text || '')),
    rows: dataRows,
    notes: [],
    page: tableElement['page number'] || 1,
    originalElement: tableElement,
  };
}

/**
 * Computes the header signature (sorted column names) for table matching.
 */
function headerSignature(columns) {
  return columns.map((c) => c.toLowerCase().replace(/\s+/g, ' ').trim()).sort().join('|');
}

/**
 * Checks if two tables have matching header signatures (≥60% overlap).
 */
function headersMatch(colsA, colsB) {
  if (colsA.length === 0 || colsB.length === 0) return false;

  const sigA = new Set(colsA.map((c) => c.toLowerCase().replace(/\s+/g, ' ').trim()));
  const sigB = new Set(colsB.map((c) => c.toLowerCase().replace(/\s+/g, ' ').trim()));

  let overlap = 0;
  for (const s of sigA) {
    if (sigB.has(s)) overlap++;
  }

  const threshold = Math.min(sigA.size, sigB.size) * 0.6;
  return overlap >= threshold;
}

/**
 * Stitches consecutive tables with matching headers into single logical
 * tables. Cross-page continuation is the primary use case.
 *
 * @param {Array} blocks - Section blocks (may contain normalized tables)
 * @returns {Array} Blocks with stitched tables
 */
function stitchTables(blocks) {
  const result = [];
  let pendingTable = null;

  for (const block of blocks) {
    if (block.type !== 'table' || !block.columns || block.columns.length === 0) {
      if (pendingTable) {
        result.push(pendingTable);
        pendingTable = null;
      }
      result.push(block);
      continue;
    }

    if (!pendingTable) {
      pendingTable = { ...block, stitchedFrom: [block.page] };
      continue;
    }

    // Check if this table continues the pending one
    if (headersMatch(pendingTable.columns, block.columns)) {
      // Merge: append data rows, extend grid, track provenance
      pendingTable.rows = [...pendingTable.rows, ...block.rows];
      pendingTable.stitchedFrom.push(block.page);
      // Extend the grid (skip header rows of the continuation)
      const contHeaderCount = block.headerTree?.length || 1;
      const contDataGrid = block.grid.slice(contHeaderCount);
      pendingTable.grid = [...pendingTable.grid, ...contDataGrid];
    } else {
      result.push(pendingTable);
      pendingTable = { ...block, stitchedFrom: [block.page] };
    }
  }

  if (pendingTable) result.push(pendingTable);
  return result;
}

/**
 * Attaches trailing note paragraphs to their preceding table.
 * A note is a paragraph immediately following a table that starts with
 * "Note:", "*", or is sentence-case and within a y-gap threshold.
 */
function attachNotes(blocks) {
  const result = [];
  let lastTable = null;

  for (const block of blocks) {
    if (block.type === 'table') {
      if (lastTable) result.push(lastTable);
      lastTable = block;
      continue;
    }

    if (lastTable && isNoteParagraph(block)) {
      if (!lastTable.notes) lastTable.notes = [];
      lastTable.notes.push((block.content || '').trim());
      continue;
    }

    if (lastTable) {
      result.push(lastTable);
      lastTable = null;
    }
    result.push(block);
  }

  if (lastTable) result.push(lastTable);
  return result;
}

function isNoteParagraph(block) {
  if (block.type !== 'paragraph') return false;
  const text = (block.content || '').trim();
  if (!text) return false;
  return /^(Note\s*:|^\*\s|\d+\.\s*Note)/i.test(text);
}

/**
 * Full table normalization pipeline for a list of blocks.
 */
function normalizeAndStitchTables(blocks) {
  // Step 1: Normalize all raw table elements
  const normalized = blocks.map((block) => {
    if (block.type === 'table' && block.rows && !block.columns) {
      return normalizeTable(block);
    }
    return block;
  });

  // Step 2: Stitch consecutive matching tables
  const stitched = stitchTables(normalized);

  // Step 3: Attach notes
  return attachNotes(stitched);
}

module.exports = {
  normalizeTable, expandToGrid, detectHeaderBand, buildHeaderPaths,
  headersMatch, stitchTables, attachNotes, normalizeAndStitchTables,
  cellTextContent,
};
