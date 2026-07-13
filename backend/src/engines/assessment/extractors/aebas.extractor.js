const { found, missing } = require('./utils');
const { textElements, normText } = require('./element-utils');

/**
 * AEBAS (section 2.8): three question paragraphs, each answered by a
 * following Yes/No element on the same page.
 */
const QUESTIONS = [
  { param: 'aebasTeaching', label: /track attendance of the teaching staff/i },
  { param: 'aebasNonTeaching', label: /track attendance of the non.?\s?teaching staff/i },
  { param: 'aebasHospital', label: /track attendance of the hospital staff/i },
];

function answerAfter(els, index) {
  for (const e of els.slice(index + 1, index + 4)) {
    const text = normText(e);
    if (/^(Yes|No)\b/i.test(text)) return /^Yes/i.test(text);
    if (/track attendance/i.test(text)) continue; // next question interleaved
  }
  return null;
}

function extract(markdown, lines, elements) {
  const params = {
    aebasTeaching: missing(),
    aebasNonTeaching: missing(),
    aebasHospital: missing(),
    aebasImplemented: missing(),
    websiteFunctional: missing(),
  };
  if (!elements) return params;

  const els = textElements(elements);
  const answers = {};

  for (const q of QUESTIONS) {
    const idx = els.findIndex((e) => q.label.test(normText(e)));
    if (idx === -1) continue;
    const answer = answerAfter(els, idx);
    if (answer !== null) {
      answers[q.param] = answer;
      params[q.param] = found(answer, 'aebas-json', `${normText(els[idx]).slice(0, 60)} -> ${answer ? 'Yes' : 'No'}`);
    }
  }

  // AEBAS counts as implemented only when all three systems are in place —
  // the punitive policy denies permission for partial implementation.
  if (['aebasTeaching', 'aebasNonTeaching', 'aebasHospital'].every((k) => k in answers)) {
    const implemented = answers.aebasTeaching && answers.aebasNonTeaching && answers.aebasHospital;
    params.aebasImplemented = found(implemented, 'aebas-json', 'derived from the three section-2.8 answers');
  }

  // "Is the College Website Functional : Yes" (section 2.9)
  const site = els.find((e) => /Is the College Website Functional/i.test(normText(e)));
  if (site) {
    const yes = /:\s*Yes/i.test(normText(site));
    params.websiteFunctional = found(yes, 'aebas-json', normText(site).slice(0, 60));
  }

  return params;
}

module.exports = { extract };
