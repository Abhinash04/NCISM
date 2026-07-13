/**
 * CDM Sub-stage 2: Section Tree Builder
 *
 * Builds a hierarchical section tree from the cleaned element list using:
 * 1. Numbering grammar: `\d+(\.\d+)*` patterns (e.g., "2", "2.1", "2.4.1")
 * 2. Heading levels from the element's `heading level` property
 *
 * Every non-heading element is assigned to the nearest preceding section.
 * Elements before the first heading go into a synthetic root section (id "0").
 *
 * Output shape:
 * ```
 * [{ id, title, level, page, blocks: [element...], children: [section...] }]
 * ```
 */

const SECTION_NUMBER_RE = /^(\d+(?:\.\d+)*)[\s.):\-–—]+/;

/**
 * Infers a section's numeric level from its numbering.
 * "2" → 1, "2.1" → 2, "2.4.1" → 3
 */
function levelFromNumber(sectionNum) {
  return sectionNum.split('.').length;
}

/**
 * Extracts a section number and title from a heading element's content.
 * Returns null if the heading doesn't start with a section number.
 */
function parseSectionHeading(content) {
  const text = (content || '').trim();
  const match = text.match(SECTION_NUMBER_RE);
  if (!match) return null;

  const number = match[1];
  const title = text.slice(match[0].length).trim();
  return { number, title };
}

/**
 * Creates a new section node.
 */
function createSection(id, title, level, page) {
  return { id, title, level, page, blocks: [], children: [] };
}

/**
 * Builds a flat list of sections from the element array, then nests them
 * into a tree based on their numeric levels.
 *
 * @param {Array} elements - Cleaned element array (post noise-filter)
 * @returns {Array} Array of top-level section objects
 */
function buildSectionTree(elements) {
  // Phase 1: Walk elements and create sections on headings
  const flatSections = [];
  let currentSection = createSection('0', 'Preamble', 0, 1);
  flatSections.push(currentSection);

  for (const el of elements) {
    if (el.type === 'heading') {
      const parsed = parseSectionHeading(el.content);
      const page = el['page number'] || 1;

      if (parsed) {
        const level = levelFromNumber(parsed.number);
        const section = createSection(parsed.number, parsed.title, level, page);
        flatSections.push(section);
        currentSection = section;
      } else {
        // Heading without a section number — treat as a block in current section,
        // but promote to a sub-section with a synthetic ID if it has a heading level
        const headingLevel = el['heading level'] || 2;
        // Add as a block — the heading text is preserved
        currentSection.blocks.push(el);
      }
    } else {
      currentSection.blocks.push(el);
    }
  }

  // Phase 2: Nest into a tree based on levels
  if (flatSections.length <= 1) return flatSections;

  const root = [];
  const stack = []; // Stack of { section, level }

  for (const section of flatSections) {
    // Pop stack until we find a parent with lower level
    // Preamble (level 0) should never parent any numbered section (level >= 1)
    while (
      stack.length > 0 &&
      (stack[stack.length - 1].level >= section.level ||
        (stack[stack.length - 1].level === 0 && section.level >= 1))
    ) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(section);
    } else {
      stack[stack.length - 1].section.children.push(section);
    }

    stack.push({ section, level: section.level });
  }

  return root;
}

/**
 * Flattens a section tree back into a flat list (depth-first) for
 * iteration. Each section carries a `depth` property.
 */
function flattenSections(tree, depth = 0) {
  const result = [];
  for (const section of tree) {
    section.depth = depth;
    result.push(section);
    result.push(...flattenSections(section.children, depth + 1));
  }
  return result;
}

/**
 * Finds a section by its numeric ID (e.g., "2.1") in the tree.
 */
function findSection(tree, sectionId) {
  for (const section of tree) {
    if (section.id === sectionId) return section;
    const found = findSection(section.children, sectionId);
    if (found) return found;
  }
  return null;
}

module.exports = { buildSectionTree, flattenSections, findSection, parseSectionHeading };
