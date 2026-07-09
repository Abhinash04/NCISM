const { found, missing, findNumber, findText } = require('./utils');

const NUMERIC_FIELDS = [
  { param: 'libraryBooks', label: /total (number|no\.?) of books/i },
  { param: 'librarySittingCapacity', label: /library sitting capacity/i },
  { param: 'libraryComputers', label: /(no\.?|number) of computers? (available )?(with internet|in (the )?library)/i },
];

function extract(markdown, lines) {
  const params = {};

  for (const field of NUMERIC_FIELDS) {
    const hit = findNumber(markdown, lines, field.label);
    params[field.param] = hit && hit.value !== null
      ? found(hit.value, 'library', hit.evidence)
      : missing();
  }

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
