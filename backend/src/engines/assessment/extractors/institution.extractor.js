const { found, missing } = require('./utils');
const { textElements, normText } = require('./element-utils');

// Words that mark the start of the college/institution name in a visitor's
// "<Name> <College…>" cell — the visitor's own name is everything before.
const COLLEGE_KEYWORD = /\b(College|Hospital|University|Institute|Govt\.?|Government|Ayurved|Ayurveda|Medical|Vidyalaya|Mahavidyalaya|Society|Co-?operative|Sansthan|Trust|Council|Board|Shri)\b/i;
// A dotted uppercase acronym (S.R.M., J.G., V.K.R.Y) commonly starts a college name.
const ACRONYM = /\b([A-Z]\.){2,}/;

function titleCase(s) {
  return s.toLowerCase().replace(/\b([a-z])/g, (_, c) => c.toUpperCase());
}

/** "MONIKA ASTHANA S.R.M. Government…" -> "Dr. Monika Asthana". */
function visitorName(rawNameCell) {
  const text = rawNameCell.replace(/\s+/g, ' ').trim();
  const cut = [text.match(COLLEGE_KEYWORD), text.match(ACRONYM)]
    .filter(Boolean)
    .map((m) => m.index)
    .sort((a, b) => a - b)[0];
  let namePart = (cut !== undefined ? text.slice(0, cut) : text).trim();
  // Generic fallback: a visitor name is 2-4 words — cap trailing college text.
  const words = namePart.split(' ').filter(Boolean);
  if (words.length > 4) namePart = words.slice(0, 4).join(' ');
  const clean = titleCase(namePart) || text;
  return /^dr\.?\s/i.test(clean) ? clean : `Dr. ${clean}`;
}

/**
 * Visitors from the element JSON. The visitor block emits, in reading order,
 * a serial number, a "<Name> <College>" text element, and a "V##### AYU####"
 * id element per visitor (sometimes interleaved). Pairs each V-id with the
 * nearest preceding name-bearing element.
 */
function extractVisitors(elements) {
  const all = textElements(elements).filter((e) => (e['page number'] || 99) <= 3);
  // Scope to the "Visitor Details" region (before it lies the page title etc.).
  const start = all.findIndex((e) => /Visitor Details/i.test(normText(e)));
  const end = all.findIndex((e) => /Student Admission Capacity/i.test(normText(e)));
  const els = all.slice(start === -1 ? 0 : start + 1, end === -1 ? all.length : end);
  const visitors = [];
  let pendingName = null;

  for (const el of els) {
    const text = normText(el);
    const idMatch = text.match(/\bV\d{4,6}\b/);
    if (idMatch && pendingName) {
      visitors.push({ name: visitorName(pendingName), id: idMatch[0].toUpperCase() });
      pendingName = null;
      continue;
    }
    // A name-bearing line: has letters, isn't a header/label, isn't just an id.
    if (/[A-Za-z]{3,}/.test(text) && !/^(sr\.?\s*no|visitor (name|id|details)|institution|course|academic|visitation|type of|purpose|description|student admission)/i.test(text) && !/^V\d{4,6}/.test(text)) {
      // Prefer the first plausible name after a serial marker; keep the earliest.
      if (!pendingName) pendingName = text;
    }
  }

  return visitors;
}

/**
 * Extracts institution identity fields from the reconstructed markdown, plus
 * visitors from the element JSON when available.
 */
function extract(markdown, lines, elements) {
  const params = {};

  // The CDM renderer emits some blocks as HTML tables; strip tags so the
  // line-based lookups below see plain text regardless of the renderer.
  lines = lines.map((l) => l.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);

  // Institution Name
  let institutionName = '';
  const instNameLine = lines.find((l) => l.includes('Institution Name :') || l.includes('Institution Name:'));
  if (instNameLine) {
    institutionName = instNameLine.replace(/Institution Name\s*:\s*/i, '').replace(/\|/g, '').trim();
    let idx = lines.indexOf(instNameLine);
    while (institutionName.endsWith(',') && idx + 1 < lines.length) {
      idx++;
      institutionName += ' ' + lines[idx].replace(/\|/g, '').trim();
    }
  }
  params.institutionName = institutionName ? found(institutionName, 'institution', 'Institution Name label') : missing();

  // Institution ID (AYUxxxx)
  const instIdMatch = markdown.match(/AYU\d{4}/i);
  params.institutionId = instIdMatch ? found(instIdMatch[0].toUpperCase(), 'institution', instIdMatch[0]) : missing();

  // Visitation dates
  const startLine = lines.find((l) => l.includes('Visitation Start Date'));
  params.visitationStartDate = startLine
    ? found(startLine.replace(/.*Visitation Start Date\s*:?\s*/i, '').replace(/\|/g, '').trim(), 'institution', 'Visitation Start Date label')
    : missing();

  const endLine = lines.find((l) => l.includes('Visitation End Date'));
  params.visitationEndDate = endLine
    ? found(endLine.replace(/.*Visitation End Date\s*:?\s*/i, '').replace(/\|/g, '').trim(), 'institution', 'Visitation End Date label')
    : missing();

  // Academic year
  const acLine = lines.find((l) => /Academic year/i.test(l));
  params.academicYear = acLine
    ? found(acLine.replace(/.*Academic year\s*:?\s*/i, '').replace(/\|/g, '').trim(), 'institution', 'Academic year label')
    : missing();

  // Intake capacity: "... N seats" in the visitation description, or the
  // line following an "Intake Capacity" label.
  let intake = null;
  const descLine = lines.find((l) => l.includes('Description of Visitation Done by NCISM'));
  if (descLine) {
    const seatMatch = descLine.match(/(\d+)\s*seats/i);
    if (seatMatch) intake = parseInt(seatMatch[1], 10);
  }
  const intakeLine = lines.find((l) => l.includes('Intake Capacity'));
  if (intakeLine) {
    const idx = lines.indexOf(intakeLine);
    const inline = intakeLine.replace(/.*Intake Capacity\s*:?\s*/i, '').match(/\d+/);
    if (inline) {
      intake = parseInt(inline[0], 10);
    } else if (idx + 1 < lines.length) {
      const match = lines[idx + 1].match(/\d+/);
      if (match) intake = parseInt(match[0], 10);
    }
  }
  params.intake = intake !== null ? found(intake, 'institution', 'Intake Capacity / description') : missing();

  // Visitors: real names from the element JSON (paired name <-> V-id).
  const visitors = elements ? extractVisitors(elements) : [];
  params.visitors = visitors.length > 0
    ? found(visitors, 'institution-json', 'Visitor Details block (element JSON)')
    : missing();

  return params;
}

module.exports = { extract };
