const { found, missing, findText } = require('./utils');
const { textElements, normText, parseNum } = require('./element-utils');

/**
 * Central Library figures (section 2.5/2.6). Rows follow the header
 * "Details | Required as per MSR | Available | Shortcomings" — the actual is
 * the SECOND number after the label. Computers appear either as a single
 * trailing value ("... internet facility available: 12") or as a
 * required/actual pair ("... internet facility 10 12 -").
 */
function secondNumberAfter(els, labelRegex, extractor) {
  for (const e of els) {
    const match = normText(e).match(labelRegex);
    if (match) {
      const actual = parseNum(match[2]);
      if (actual !== null) return found(actual, extractor, normText(e).slice(0, 80));
    }
  }
  return missing();
}

function computers(els) {
  for (const e of els) {
    const text = normText(e);
    let match = text.match(/computers? available with internet facility(?: available)?\s*:\s*(\d+)\s*$/i);
    if (match) return found(parseNum(match[1]), 'library-json', text.slice(0, 90));
    match = text.match(/Computers? available with internet facility\s+(\d+)\s+(\d+)/i);
    if (match) return found(parseNum(match[2]), 'library-json', text.slice(0, 90));
  }
  return missing();
}

function extract(markdown, lines, elements) {
  const params = {
    libraryBooks: missing(),
    librarySittingCapacity: missing(),
    libraryComputers: missing(),
  };

  if (elements) {
    const els = textElements(elements);
    params.libraryBooks = secondNumberAfter(els, /Total no\.? of books available\s+([\d,]+)\s+([\d,]+)/i, 'library-json');
    params.librarySittingCapacity = secondNumberAfter(els, /^Sitting Capacity\s+(\d+)\s+(\d+)/i, 'library-json');
    params.libraryComputers = computers(els);
  }

  // Seating adequacy stays on the markdown path (narrative field).
  const seatingHit = findText(lines, /sitting arrangement/i);
  if (seatingHit && /adequate/i.test(seatingHit.value)) {
    const adequate = !/not\s*-?\s*adequate|non\s*-?\s*adequate/i.test(seatingHit.value);
    params.librarySeatingAdequate = found(adequate, 'library', seatingHit.evidence);
  } else {
    params.librarySeatingAdequate = missing();
  }

  return params;
}

module.exports = { extract };
