/**
 * Teaching-staff departmental matrix check (Schedule IV style).
 *
 * Parameter value shape:
 *   { rows: [{ dept, requirementText, existingProfessor, existingReader,
 *              existingLecturer }], total, absent }
 *
 * Requirement notation supports both forms found in visitation reports:
 *   "1P And 1R +2L"  -> 1 Professor + 1 Reader + 2 Lecturers
 *   "1 HF + 1 LF"    -> 1 High Faculty + 1 Low Faculty
 * HF (high faculty) = professor + reader grades; LF (low faculty) = lecturer.
 *
 * Counting existing staff: all integers in the cell are summed, so entries
 * like "0+1vo" (visiting officer counted toward the grade) resolve to 1 —
 * this matches how MARB assessors counted in the reference reports.
 */
function countStaff(cell) {
  const matches = String(cell ?? '').match(/\d+/g);
  if (!matches) return 0;
  return matches.reduce((sum, n) => sum + parseInt(n, 10), 0);
}

function parseRequirement(text) {
  const t = String(text || '');
  const req = { HF: 0, LF: 0 };

  const hfMatch = t.match(/(\d+)\s*HF/i);
  const lfMatch = t.match(/(\d+)\s*LF/i);
  if (hfMatch || lfMatch) {
    req.HF = hfMatch ? parseInt(hfMatch[1], 10) : 0;
    req.LF = lfMatch ? parseInt(lfMatch[1], 10) : 0;
    return req;
  }

  // "1P And 1R +2L" form: P and R are HF grades, L is LF.
  const pMatch = t.match(/(\d+)\s*P/i);
  const rMatch = t.match(/(\d+)\s*R/i);
  const lMatch = t.match(/(\d+)\s*L(?!F)/i);
  req.HF = (pMatch ? parseInt(pMatch[1], 10) : 0) + (rMatch ? parseInt(rMatch[1], 10) : 0);
  req.LF = lMatch ? parseInt(lMatch[1], 10) : 0;
  return req;
}

function formatShort(hfShort, lfShort) {
  if (hfShort > 0 && lfShort > 0) return `${hfShort} HF+${lfShort}LF`;
  if (hfShort > 0) return `${hfShort} HF`;
  if (lfShort > 0) return `${lfShort} LF`;
  return '';
}

function formatExcess(hfExcess, lfExcess) {
  if (hfExcess > 0 && lfExcess > 0) return `${hfExcess} HF+${lfExcess} LF`;
  if (hfExcess > 0) return `${hfExcess} HF`;
  if (lfExcess > 0) return `${lfExcess} LF`;
  return '';
}

function evaluate(rule, param) {
  if (!param || param.status !== 'found' || !param.value || !Array.isArray(param.value.rows)) {
    return { status: 'insufficient-data' };
  }

  const rows = param.value.rows.map((row) => {
    const req = parseRequirement(row.requirementText);
    const hfExist = countStaff(row.existingProfessor) + countStaff(row.existingReader);
    const lfExist = countStaff(row.existingLecturer);

    const hfShort = Math.max(0, req.HF - hfExist);
    const lfShort = Math.max(0, req.LF - lfExist);
    const hfExcess = Math.max(0, hfExist - req.HF);
    const lfExcess = Math.max(0, lfExist - req.LF);

    return {
      dept: row.dept,
      requirementText: row.requirementText,
      existingDisplay: row.existingProfessor,
      hfRequired: req.HF,
      lfRequired: req.LF,
      hfExisting: hfExist,
      lfExisting: lfExist,
      deficientCount: hfShort + lfShort,
      zeroFaculty: hfExist + lfExist === 0 && req.HF + req.LF > 0,
      shortText: formatShort(hfShort, lfShort),
      excessText: formatExcess(hfExcess, lfExcess),
    };
  });

  const anyDeficiency = rows.some((r) => r.deficientCount > 0);

  return {
    status: anyDeficiency ? 'fail' : 'pass',
    rows,
    total: param.value.total ?? null,
    absent: param.value.absent ?? null,
  };
}

module.exports = { evaluate };
