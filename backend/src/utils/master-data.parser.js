/**
 * Parses the NCISM institute master (a markdown pipe-table) into normalized
 * institution rows. Tolerant of the source's header typos ("Instutite ID") and
 * `-` placeholders. Malformed rows are collected in `exceptions` (never thrown)
 * — this is the import "exception queue".
 */

const SYSTEM_MAP = {
  ayurveda: 'ayurveda',
  unani: 'unani',
  siddha: 'siddha',
  sowarigpa: 'sowa_rigpa',
};

const ID_RE = /^(AYU|UNI|SI|SW)\d{4}$/;

function clean(cell) {
  const v = (cell || '').trim();
  return v === '' || v === '-' ? null : v;
}

/** Splits a markdown table row into trimmed cells (drops the outer pipes). */
function splitRow(line) {
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
}

function isSeparator(cells) {
  return cells.every((c) => /^:?-{2,}:?$/.test(c) || c === '');
}

/** Maps header labels → our field keys by keyword. */
function columnIndex(headerCells) {
  const idx = {};
  headerCells.forEach((h, i) => {
    const k = h.toLowerCase();
    if (/system/.test(k)) idx.system = i;
    else if (/inst.*id|instutite|institute\s*id/.test(k)) idx.instituteId = i;
    else if (/state/.test(k)) idx.state = i;
    else if (/college|name/.test(k)) idx.name = i;
    else if (/file/.test(k)) idx.fileNumber = i;
    else if (/email/.test(k)) idx.email = i;
    else if (/contact|phone/.test(k)) idx.contact = i;
  });
  return idx;
}

function parseMasterData(text) {
  const lines = String(text).split(/\r?\n/);
  const tableLines = lines
    .map((l, n) => ({ l, n: n + 1 }))
    .filter(({ l }) => l.trim().startsWith('|'));

  if (tableLines.length < 2) return { rows: [], exceptions: [] };

  const header = splitRow(tableLines[0].l);
  const idx = columnIndex(header);
  const rows = [];
  const exceptions = [];

  for (let i = 1; i < tableLines.length; i++) {
    const { l, n } = tableLines[i];
    const cells = splitRow(l);
    if (isSeparator(cells)) continue;

    const instituteId = (cells[idx.instituteId] || '').trim().toUpperCase();
    const systemRaw = (cells[idx.system] || '').toLowerCase().replace(/[^a-z]/g, '');
    const system = SYSTEM_MAP[systemRaw];
    const state = clean(cells[idx.state]);
    const name = clean(cells[idx.name]);

    if (!ID_RE.test(instituteId)) {
      exceptions.push({ line: n, raw: l.trim(), reason: `invalid institute id "${instituteId}"` });
      continue;
    }
    if (!system) { exceptions.push({ line: n, raw: l.trim(), reason: `unknown system "${cells[idx.system]}"` }); continue; }
    if (!state) { exceptions.push({ line: n, raw: l.trim(), reason: 'missing state' }); continue; }
    if (!name) { exceptions.push({ line: n, raw: l.trim(), reason: 'missing name' }); continue; }

    rows.push({
      instituteId, system, state, name,
      fileNumber: clean(cells[idx.fileNumber]),
      email: clean(cells[idx.email]),
      contact: clean(cells[idx.contact]),
    });
  }

  return { rows, exceptions };
}

module.exports = { parseMasterData, ID_RE };
