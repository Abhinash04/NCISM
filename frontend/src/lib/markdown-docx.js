import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType,
} from 'docx';

const HEADINGS = [
  HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6,
];

/** Split a line on ** markers into alternating bold / normal TextRuns. */
function runs(text) {
  return String(text).split('**').map((part, i) => new TextRun({ text: part, bold: i % 2 === 1 }));
}

const stripBold = (s) => String(s).replace(/\*\*/g, '').trim();
const splitRow = (line) => line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
const isSeparator = (cells) => cells.every((c) => /^:?-{2,}:?$/.test(c) || c === '');

function buildTable(rows) {
  const cellsPerRow = rows.map(splitRow).filter((c) => !isSeparator(c));
  if (!cellsPerRow.length) return null;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: cellsPerRow.map((cells, r) => new TableRow({
      children: cells.map((c) => new TableCell({
        children: [new Paragraph({ children: runs(stripBold(c) || ' ') })],
        shading: r === 0 ? { fill: 'F2F2F2' } : undefined,
      })),
    })),
  });
}

/** Best-effort markdown → .docx Blob (headings, bold, lists, tables, paragraphs). */
export async function markdownToDocxBlob(markdown) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const children = [];
  let tableBuf = [];

  const flushTable = () => {
    if (tableBuf.length) { const t = buildTable(tableBuf); if (t) children.push(t); tableBuf = []; }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (/^\s*\|/.test(line)) { tableBuf.push(line); continue; }
    flushTable();

    if (!line.trim()) { children.push(new Paragraph({ children: [] })); continue; }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) { children.push(new Paragraph({ heading: HEADINGS[heading[1].length - 1], children: runs(heading[2]) })); continue; }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) { children.push(new Paragraph({ bullet: { level: 0 }, children: runs(bullet[1]) })); continue; }

    const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ordered) { children.push(new Paragraph({ numbering: undefined, children: runs(`• ${ordered[1]}`) })); continue; }

    children.push(new Paragraph({ children: runs(line) }));
  }
  flushTable();

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}
