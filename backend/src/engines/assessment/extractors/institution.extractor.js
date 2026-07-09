const { found, missing } = require('./utils');

/**
 * Extracts institution identity fields from the reconstructed markdown.
 * Ported from the legacy assessment service's parsing logic (the part that
 * was genuinely dynamic).
 */
function extract(markdown, lines) {
  const params = {};

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

  // Visitors: rows between "Visitor Details" and the first numbered section,
  // identified by V##### ids.
  const visitors = [];
  const visitorStart = lines.findIndex((l) => l.includes('Visitor Details'));
  if (visitorStart !== -1) {
    const searchEnd = Math.min(lines.length, visitorStart + 40);
    for (let i = visitorStart; i < searchEnd; i++) {
      const line = lines[i];
      const idMatch = line.match(/V\d{3,6}/i);
      if (!idMatch) continue;
      const id = idMatch[0].toUpperCase();
      let clean = line.replace(/\|/g, ' ').replace(idMatch[0], '').replace(/Visitor Name/i, '').replace(/Visitor Id/i, '').replace(/No\./, '').trim();
      clean = clean.replace(/^\d+/, '').trim();
      if (clean.length < 3 && i > 0) {
        clean = lines[i - 1].replace(/\|/g, ' ').replace(/^\d+/, '').trim();
      }
      let name = clean;
      if (name && name.length > 3 && !/visitor|sr\./i.test(name)) {
        if (!name.toLowerCase().startsWith('dr.')) name = 'Dr. ' + name;
        visitors.push({ name, id });
      }
    }
  }
  params.visitors = visitors.length > 0 ? found(visitors, 'institution', 'Visitor Details block') : missing();

  return params;
}

module.exports = { extract };
