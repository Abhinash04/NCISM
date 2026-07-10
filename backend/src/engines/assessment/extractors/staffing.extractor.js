const { found, missing } = require('./utils');
const {
  textElements, textOf, cellText, findTable, findNumberAfter, parseNum,
} = require('./element-utils');

/**
 * Staff tables from the element JSON.
 *
 * Teaching staff: THE structured table (page 5, 18 rows x 19 columns in every
 * sample college). Column map from the 3-row header band:
 *   1 Sr.No | 2 Department | 3-5 required Prof/Reader/Lecturer (UG per
 *   MSR/MESAR) | 6-7 additional PG | 8-10 EXISTING Prof/Reader/Lecturer |
 *   11 existing total | 12-15 excess | 16-19 shortcomings
 * Data rows carry a numeric Sr.No in column 1; header rows don't. Cells are
 * resolved by their declared 'column number' (row spans drop leading cells).
 *
 * Non-teaching staff: 6-column tables [Sr.No | Department | Post |
 * Required( as per MSR)? | Existing | Short comings], split across pages —
 * anchor by header text, never by table index. Department carries forward
 * across row-spanned rows.
 */

/** "1" + "AND 1"/"OR 1" + "2" -> requirement text the staff-table check parses. */
function buildRequirementText(profReq, readerReq, lecturerReq) {
  const conjMatch = readerReq.match(/\b(AND|OR)\b/i);
  const p = parseNum(profReq) ?? 0;
  const r = parseNum(readerReq) ?? 0;
  const l = parseNum(lecturerReq) ?? 0;
  if (conjMatch && conjMatch[1].toUpperCase() === 'OR') {
    // "1P OR 1R" = one HF of either grade
    return `${Math.max(p, r)} HF + ${l} LF`;
  }
  return `${p}P And ${r}R +${l}L`;
}

function parseTeachingTable(root) {
  const table = findTable(root, { headerRegex: /eligible teachers required as per M(E)?S(A)?R/i });
  if (!table) return null;

  const rows = [];
  let total = null;

  for (const row of table.rows || []) {
    const srNo = cellText(row, 1);
    const dept = cellText(row, 2);

    if (/^Total/i.test(srNo) || /^Total/i.test(dept)) {
      total = parseNum(cellText(row, 11));
      continue;
    }
    if (!/^\d+$/.test(srNo)) continue; // header band rows

    rows.push({
      dept,
      requirementText: buildRequirementText(cellText(row, 3), cellText(row, 4), cellText(row, 5)),
      existingProfessor: cellText(row, 8) || '0',
      existingReader: cellText(row, 9) || '0',
      existingLecturer: cellText(row, 10) || '0',
    });
  }

  return rows.length > 0 ? { rows, total } : null;
}

function parseNonTeachingTables(root) {
  const tables = (root.kids || []).filter((t) => {
    if (t.type !== 'table') return false;
    const header = (t.rows?.[0]?.cells || []).map((c) => textOf(c)).join('|');
    return /Post/i.test(header) && /Existing/i.test(header) && /Required/i.test(header);
  });
  if (tables.length === 0) return null;

  const rows = [];
  let total = null;
  let currentDept = null;

  for (const table of tables) {
    for (const row of table.rows || []) {
      const deptCell = cellText(row, 2);
      const postCell = cellText(row, 3);
      const requiredCell = cellText(row, 4);
      const existingCell = cellText(row, 5);

      if (/^Department$/i.test(deptCell) || /^Post$/i.test(postCell)) continue; // header
      if (deptCell) currentDept = deptCell;

      if (/^Total/i.test(deptCell) || /^Total/i.test(cellText(row, 1)) || /^Total/i.test(postCell)) {
        const nums = (row.cells || []).map((c) => parseNum(textOf(c))).filter((n) => n !== null);
        if (nums.length > 0) total = nums[nums.length - 1];
        continue;
      }

      const required = parseNum(requiredCell);
      const existing = parseNum(existingCell);
      if (!postCell || required === null || existing === null) continue;

      rows.push({ dept: currentDept, post: postCell, required, existing });
    }
  }

  return rows.length > 0 ? { rows, total } : null;
}

function extract(markdown, lines, elements) {
  const params = {
    teachingStaff: missing(),
    nonTeachingStaff: missing(),
    yogaTeacherAvailable: missing(),
    bioStatisticianAvailable: missing(),
  };
  if (!elements) return params;

  const els = textElements(elements);

  const teaching = parseTeachingTable(elements);
  if (teaching) {
    const absent = findNumberAfter(els, /teaching staff absent on the visitation day\s+(\d+)/i);
    params.teachingStaff = found(
      { rows: teaching.rows, total: teaching.total, absent: absent ? absent.value : null },
      'staffing-json',
      `teaching table, ${teaching.rows.length} departments`
    );
  }

  const nonTeaching = parseNonTeachingTables(elements);
  if (nonTeaching) {
    const absent = findNumberAfter(els, /non.?teaching staff absent on the visitation day\s+(\d+)/i);
    // The summary paragraph is authoritative; table Total rows are sometimes
    // sub-totals of the required column (AYU0265: "Total | 67 | 29").
    const total = findNumberAfter(els, /non.?teaching staff listed by the college\s+(\d+)/i)?.value
      ?? nonTeaching.total
      ?? null;
    params.nonTeachingStaff = found(
      { rows: nonTeaching.rows, total, absent: absent ? absent.value : null },
      'staffing-json',
      `non-teaching tables, ${nonTeaching.rows.length} posts`
    );
  }

  return params;
}

module.exports = { extract };
