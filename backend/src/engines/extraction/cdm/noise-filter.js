/**
 * CDM Sub-stage 1: Noise Filter
 *
 * Removes two categories of noise from the raw element JSON:
 *
 * 1. **Page furniture**: Text elements recurring on ≥60% of pages at the
 *    same y-band (±5pt) — page headers, footers, page numbers. Detection
 *    is purely geometric + frequency-based.
 *
 * 2. **Decorative duplicates**: A heading whose de-whitespaced text is a
 *    fuzzy subsequence of an overlapping or adjacent heading on the same
 *    page — the letter-spaced/outline decorative copy that OpenDataLoader
 *    faithfully emits alongside the correct heading.
 *
 * Both mechanisms are generic — no document-specific patterns.
 */

/**
 * Strips all whitespace and punctuation for fuzzy comparison.
 * "3 T hi t ff (S h d l V)" → "3thitffshdlv"
 */
function deWhitespace(text) {
  return text.replace(/[\s.,;:()\-–—/\\[\]{}'"!?#*_]+/g, '').toLowerCase();
}

/**
 * Returns true if `shorter` is a subsequence of `longer` (character-by-
 * character order preserved, not necessarily contiguous). Used to detect
 * decorative headings whose letter-spaced text is a garbled subsequence
 * of the real heading.
 */
function isSubsequence(shorter, longer) {
  if (shorter.length === 0) return true;
  if (shorter.length > longer.length) return false;
  let si = 0;
  for (let li = 0; li < longer.length && si < shorter.length; li++) {
    if (longer[li] === shorter[si]) si++;
  }
  return si === shorter.length;
}

/**
 * Returns the y-band midpoint for an element's bounding box.
 * Bounding box format: [x0, yBottom, x1, yTop] (PDF coords, y grows up).
 */
function yMid(el) {
  const box = el['bounding box'];
  if (!box) return null;
  return (box[1] + box[3]) / 2;
}

/**
 * Detects page furniture: text content appearing on ≥ threshold fraction
 * of pages at a similar y position.
 *
 * @param {Array} kids - All elements from the document
 * @param {number} totalPages - Total page count
 * @param {number} [threshold=0.6] - Fraction of pages required
 * @param {number} [yTolerance=5] - Y-band tolerance in points
 * @returns {Set<Object>} Set of elements identified as furniture
 */
function detectPageFurniture(kids, totalPages, threshold = 0.6, yTolerance = 5) {
  const furniture = new Set();
  if (totalPages < 3) return furniture; // Too few pages for meaningful detection

  // Group text content by de-whitespaced form
  const contentGroups = new Map();
  for (const kid of kids) {
    if (kid.type !== 'paragraph' && kid.type !== 'heading') continue;
    const text = (kid.content || '').trim();
    if (!text || text.length > 100) continue; // Furniture is short

    const norm = deWhitespace(text);
    if (norm.length < 2) continue;

    if (!contentGroups.has(norm)) contentGroups.set(norm, []);
    contentGroups.get(norm).push(kid);
  }

  const minPages = Math.ceil(totalPages * threshold);

  for (const [, elements] of contentGroups) {
    // Count distinct pages
    const pages = new Set(elements.map((e) => e['page number']));
    if (pages.size < minPages) continue;

    // Check y-band consistency: all occurrences should be at similar y positions
    const yMids = elements.map((e) => yMid(e)).filter((y) => y !== null);
    if (yMids.length === 0) continue;

    const avgY = yMids.reduce((s, y) => s + y, 0) / yMids.length;
    const allConsistent = yMids.every((y) => Math.abs(y - avgY) < yTolerance);
    if (!allConsistent) continue;

    for (const el of elements) furniture.add(el);
  }

  return furniture;
}

function detectDecorativeDuplicates(kids) {
  const duplicates = new Set();
  const headings = kids.filter((kid) => kid.type === 'heading');

  for (let i = 0; i < headings.length; i++) {
    if (duplicates.has(headings[i])) continue;
    const textI = deWhitespace(headings[i].content || '');
    if (textI.length < 3) continue;

    for (let j = 0; j < headings.length; j++) {
      if (i === j || duplicates.has(headings[j])) continue;
      const textJ = deWhitespace(headings[j].content || '');
      if (textJ.length < 3) continue;

      // Check if one is a subsequence of the other
      let shorter, longer, shorterEl;
      if (textI.length <= textJ.length) {
        shorter = textI; longer = textJ; shorterEl = headings[i];
      } else {
        shorter = textJ; longer = textI; shorterEl = headings[j];
      }

      // Must be a strict subsequence (not identical) and cover >=40% of the longer
      if (shorter === longer) continue;
      if (shorter.length < longer.length * 0.4) continue;

      if (isSubsequence(shorter, longer)) {
        // If they are on the same page, or on adjacent pages (page difference <= 1)
        const pageA = headings[i]['page number'] || 1;
        const pageB = headings[j]['page number'] || 1;
        if (Math.abs(pageA - pageB) <= 1) {
          const yA = yMid(headings[i]);
          const yB = yMid(headings[j]);
          
          let proximityMatch = false;
          if (pageA === pageB) {
            if (yA !== null && yB !== null && Math.abs(yA - yB) < 20) {
              proximityMatch = true;
            }
          } else {
            // Adjacent pages: one at bottom, one at top
            if (yA !== null && yB !== null) {
              const [bottomY, topY] = pageA < pageB ? [yA, yB] : [yB, yA];
              if (bottomY < 50 && topY > 750) {
                proximityMatch = true;
              }
            }
          }
          
          if (proximityMatch) {
            duplicates.add(shorterEl);
          }
        }
      }
    }
  }

  return duplicates;
}

/**
 * Filters noise from the element JSON kids array.
 *
 * @param {Array} kids - Raw kids array from the element JSON
 * @param {number} totalPages - Total page count
 * @returns {{ filtered: Array, stats: { furnitureRemoved: number, duplicatesRemoved: number } }}
 */
function filterNoise(kids, totalPages) {
  const furniture = detectPageFurniture(kids, totalPages);
  const duplicates = detectDecorativeDuplicates(kids);

  const filtered = kids.filter((kid) => !furniture.has(kid) && !duplicates.has(kid));

  return {
    filtered,
    stats: {
      furnitureRemoved: furniture.size,
      duplicatesRemoved: duplicates.size,
    },
  };
}

module.exports = { filterNoise, deWhitespace, isSubsequence };
