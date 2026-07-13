/**
 * CDM Builder — Main orchestrator
 *
 * Reads the OpenDataLoader element JSON and produces a Canonical Document
 * Model (CDM) by running sub-stages in order:
 *
 *   1. Noise filter   → removes page furniture + decorative duplicates
 *   2. Section tree   → hierarchical sections from numbering grammar
 *   3. Row regrouper  → forms + pseudo-tables from flattened blocks
 *   4. Table normalizer → expanded grids, header trees, cross-page stitching
 *
 * Output: CDM document JSON (persisted as `cdm.json` artifact).
 */

const { filterNoise } = require('./noise-filter');
const { buildSectionTree, flattenSections } = require('./section-tree');
const { regroupBlocks, reconstructSectionTables } = require('./row-regrouper');
const { normalizeAndStitchTables } = require('./table-normalizer');
const createLogger = require('../../../utils/logger');

const logger = createLogger('CdmBuilder');

/**
 * Builds a Canonical Document Model from the raw element JSON.
 *
 * @param {Object} elementJson - Root of the OpenDataLoader element JSON
 * @returns {Object} CDM document
 */
function buildCdm(elementJson) {
  if (!elementJson || !elementJson.kids || !Array.isArray(elementJson.kids)) {
    logger.error('Invalid element JSON: missing kids array');
    return createEmptyCdm(elementJson);
  }

  const totalPages = elementJson['number of pages'] || 0;
  const kids = elementJson.kids;

  // Stage 1: Noise filter
  logger.info(`Stage 1: Noise filter (${kids.length} elements, ${totalPages} pages)`);
  const { filtered, stats: noiseStats } = filterNoise(kids, totalPages);
  logger.info(`Noise filter: removed ${noiseStats.furnitureRemoved} furniture, ${noiseStats.duplicatesRemoved} duplicates → ${filtered.length} elements remain`);

  // Stage 2: Section tree
  logger.info('Stage 2: Section tree');
  const sectionTree = buildSectionTree(filtered);
  const flatSections = flattenSections(sectionTree);
  logger.info(`Section tree: ${flatSections.length} sections built`);

  // Stage 3: Row regrouping (within each section's blocks)
  logger.info('Stage 3: Row regrouping');
  let formCount = 0;
  let pseudoTableCount = 0;
  for (const section of flatSections) {
    section.blocks = reconstructSectionTables(section.blocks, section.title);
    section.blocks = regroupBlocks(section.blocks);
    formCount += section.blocks.filter((b) => b.type === 'form').length;
    pseudoTableCount += section.blocks.filter((b) => b.type === 'pseudo-table').length;
  }
  logger.info(`Row regrouping: ${formCount} forms, ${pseudoTableCount} pseudo-tables detected`);

  // Stage 4: Table normalization + cross-page stitching
  logger.info('Stage 4: Table normalization');
  // Collect all blocks across sections for cross-page stitching
  // (tables can span section boundaries), then redistribute
  const allBlocks = [];
  const sectionBoundaries = [];
  for (const section of flatSections) {
    sectionBoundaries.push({ sectionId: section.id, startIdx: allBlocks.length });
    allBlocks.push(...section.blocks);
  }

  const normalizedBlocks = normalizeAndStitchTables(allBlocks);

  // Redistribute blocks back to sections
  redistributeBlocks(flatSections, sectionBoundaries, normalizedBlocks);

  const tableCount = flatSections.reduce(
    (sum, s) => sum + s.blocks.filter((b) => b.type === 'table' && b.columns).length,
    0
  );
  logger.info(`Table normalization: ${tableCount} normalized tables`);

  // Build the CDM document
  const cdm = {
    meta: {
      pages: totalPages,
      title: extractTitle(sectionTree),
      source: 'opendataloader-fast',
      noiseStats,
    },
    sections: serializeSectionTree(sectionTree),
  };

  logger.info('CDM build complete');
  return cdm;
}

/**
 * Redistributes normalized/stitched blocks back to their sections.
 * After stitching, some blocks may have merged across section boundaries,
 * so we use a best-effort approach based on block order.
 */
function redistributeBlocks(flatSections, sectionBoundaries, normalizedBlocks) {
  // Clear all section blocks
  for (const section of flatSections) {
    section.blocks = [];
  }

  // Simple redistribution: assign blocks to sections in order
  let blockIdx = 0;
  for (let si = 0; si < sectionBoundaries.length; si++) {
    const section = flatSections.find((s) => s.id === sectionBoundaries[si].sectionId);
    if (!section) continue;

    const nextStart = si + 1 < sectionBoundaries.length
      ? sectionBoundaries[si + 1].startIdx
      : Infinity;

    // Assign blocks that originated from this section
    while (blockIdx < normalizedBlocks.length) {
      const block = normalizedBlocks[blockIdx];
      // Use page number as heuristic for ownership after stitching
      section.blocks.push(block);
      blockIdx++;

      // If we've used up the expected number of blocks for this section,
      // move on (but stitched tables may have consumed extras)
      if (blockIdx >= nextStart && si + 1 < sectionBoundaries.length) {
        break;
      }
    }
  }

  // Any remaining blocks go to the last section
  if (blockIdx < normalizedBlocks.length && flatSections.length > 0) {
    const lastSection = flatSections[flatSections.length - 1];
    while (blockIdx < normalizedBlocks.length) {
      lastSection.blocks.push(normalizedBlocks[blockIdx]);
      blockIdx++;
    }
  }
}

/**
 * Extracts the document title from the first heading in the section tree.
 */
function extractTitle(sectionTree) {
  if (sectionTree.length === 0) return null;
  const preamble = sectionTree[0];
  if (preamble.title && preamble.title !== 'Preamble') return preamble.title;
  // Look for the first heading block in the preamble
  for (const block of preamble.blocks || []) {
    if (block.type === 'heading' && block.content) return block.content.trim();
  }
  return null;
}

/**
 * Serializes the section tree for JSON output. Strips internal references
 * (originalElement, etc.) to keep the CDM JSON clean and portable.
 */
function serializeSectionTree(tree) {
  return tree.map((section) => ({
    id: section.id,
    title: section.title,
    level: section.level,
    page: section.page,
    blocks: section.blocks.map(serializeBlock),
    children: serializeSectionTree(section.children || []),
  }));
}

function serializeBlock(block) {
  if (block.type === 'table' && block.columns) {
    // Normalized table
    return {
      type: 'table',
      caption: block.caption || null,
      headerTree: block.headerTree || [],
      columns: block.columns,
      rows: (block.rows || []).map((row) => ({
        cells: row.cells,
        page: row.page,
      })),
      stitchedFrom: block.stitchedFrom || null,
      notes: block.notes || [],
      page: block.page,
    };
  }

  if (block.type === 'table') {
    // Raw table (not yet normalized — shouldn't happen after P3 but safety)
    return {
      type: 'table',
      page: block['page number'] || block.page || 1,
      rowCount: (block.rows || []).length,
    };
  }

  if (block.type === 'form') {
    return {
      type: 'form',
      fields: block.fields,
      page: block.page,
    };
  }

  if (block.type === 'pseudo-table') {
    return {
      type: 'pseudo-table',
      headers: block.headers,
      dataRows: block.dataRows,
      page: block.page,
    };
  }

  if (block.type === 'heading') {
    return {
      type: 'heading',
      level: block['heading level'] || 2,
      content: (block.content || '').trim(),
      page: block['page number'] || 1,
    };
  }

  if (block.type === 'paragraph') {
    return {
      type: 'paragraph',
      content: (block.content || '').trim(),
      page: block['page number'] || 1,
    };
  }

  if (block.type === 'list') {
    return {
      type: 'list',
      items: (block['list items'] || []).map((item) => ({
        content: (item.content || '').trim(),
      })),
      numberingStyle: block['numbering style'] || 'unordered',
      page: block['page number'] || 1,
    };
  }

  // Generic fallback
  return {
    type: block.type || 'unknown',
    content: (block.content || '').trim(),
    page: block['page number'] || block.page || 1,
  };
}

function createEmptyCdm(elementJson) {
  return {
    meta: {
      pages: elementJson?.['number of pages'] || 0,
      title: null,
      source: 'opendataloader-fast',
      noiseStats: { furnitureRemoved: 0, duplicatesRemoved: 0 },
    },
    sections: [],
  };
}

module.exports = { buildCdm };
