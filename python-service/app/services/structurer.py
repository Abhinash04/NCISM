"""Stage 5 (PDF) — hybrid structured-markdown builder.

MarkItDown's PDF backend loses table structure (pdfminer text), so the
structured markdown for PDFs is built here instead:

- genuine ruled tables detected by pdfplumber are rendered as valid GFM
  tables (page-frame and mega-cell artifacts are filtered out and treated
  as prose),
- numbered section lines ("2.", "2.1", "2.4.1 …") become markdown headings,
- "Label : value" lines become bold key-value lines,
- everything else stays as paragraph text in reading order.

The pipeline falls back to the raw MarkItDown output if this stage fails.
"""

import re

import pdfplumber

#: A candidate table whose largest cell exceeds this is a page-frame artifact.
MAX_CELL_CHARS = 1000

#: Minimum share of non-empty cells for a candidate table to count as real.
MIN_FILLED_RATIO = 0.10

#: Tables covering more than this share of the page area with <=2 rows are
#: page borders, not tables.
FRAME_AREA_RATIO = 0.85

# Section headings carry either a dotted number ("2.1", "2.4.1") or a single
# number immediately followed by "." or ")" ("1. Student Admission …").
# Bare numbers ("5 Central Library 200 250.00 -") are table/data rows.
HEADING_RE = re.compile(r"^(\d+(?:\.\d+)+\.?|\d+[.)])\s+([A-Za-z(].{2,150})$")

NUMERIC_TOKEN_RE = re.compile(r"^[\d.,%()-]+$")
KEY_VALUE_RE = re.compile(r"^([^:|]{2,60}?)\s*:\s*(.+)$")


def _is_real_table(table, page) -> bool:
    rows = table.extract()
    if len(rows) < 2:
        return False
    width = max((len(r) for r in rows), default=0)
    if width < 2:
        return False

    cells = [c for r in rows for c in r]
    filled = [c for c in cells if c and str(c).strip()]
    if not filled or len(filled) / len(cells) < MIN_FILLED_RATIO:
        return False
    if max(len(str(c)) for c in filled) > MAX_CELL_CHARS:
        return False

    x0, top, x1, bottom = table.bbox
    area_ratio = ((x1 - x0) * (bottom - top)) / (page.width * page.height)
    if area_ratio > FRAME_AREA_RATIO and len(rows) <= 2:
        return False
    return True


def _cell_text(cell) -> str:
    if cell is None:
        return ""
    text = str(cell).strip()
    text = text.replace("|", "\\|")
    return "<br>".join(part.strip() for part in text.splitlines() if part.strip())


def _table_to_gfm(rows) -> str:
    width = max(len(r) for r in rows)
    normalized = [[_cell_text(c) for c in r] + [""] * (width - len(r)) for r in rows]

    # Promote the first row that has content as the header.
    header_index = next(
        (i for i, r in enumerate(normalized) if any(r)), 0
    )
    header = normalized[header_index]
    body = normalized[header_index + 1 :]

    lines = [
        "| " + " | ".join(header) + " |",
        "| " + " | ".join(["---"] * width) + " |",
    ]
    lines += ["| " + " | ".join(r) + " |" for r in body if any(r)]
    return "\n".join(lines)


def classify_section_heading(line: str) -> tuple[str, str, int] | None:
    """Stateless test: is `line` a numbered-section heading?

    Returns `(number, title, level)` — where `level` is the markdown heading
    depth ("1." -> 2/``##``, "1.1" -> 3/``###``, deeper -> 4/``####``) — or
    ``None`` for data rows and non-headings. The guards distinguish a real
    heading ("2.3 Area of the Teaching Departments") from a data row that also
    starts with a number ("1 Ayurved Samhita & Siddhant 100 104.00 -": several
    numeric tokens, ends with "-"). Shared by the structurer and the
    OpenDataLoader heading repair so both apply identical rules.
    """
    match = HEADING_RE.match(line)
    if not match:
        return None
    number, title = match.groups()
    title = title.strip()
    # Guards against table/data rows that begin with a number:
    alpha = sum(ch.isalpha() for ch in title)
    if alpha < max(3, len(title) * 0.4):
        return None
    numeric_tokens = sum(1 for tok in title.split() if NUMERIC_TOKEN_RE.match(tok))
    if numeric_tokens >= 2 or title.endswith(("-", ":")) or title[-1].isdigit():
        return None

    plain = number.rstrip(".)")
    depth = plain.count(".") + 1
    level = min(depth + 1, 4)  # "1." -> ##, "1.1" -> ###, deeper -> ####
    return number, title, level


def _classify_heading(line: str, outline: dict) -> str | None:
    result = classify_section_heading(line)
    if result is None:
        return None
    number, title, level = result

    plain = number.rstrip(".)")
    depth = plain.count(".") + 1
    if depth == 1:
        # Top-level sections form a strictly ascending outline (1., 2., …).
        # Numbered list/data lines ("1. Dean Office … Both available") repeat
        # or jump backwards, so they are prose, not headings.
        if int(plain) != outline["next_top"]:
            return None
        outline["next_top"] += 1

    return f"{'#' * level} {number.rstrip(')')} {title}"


def _is_garbled(line: str) -> bool:
    """Detects crop artifacts where a table band clipped characters out of a
    text line, leaving fragments like "3 T hi t ff (S h d l V)"."""
    tokens = line.split()
    if len(tokens) < 4:
        return False
    single_chars = sum(1 for tok in tokens if len(tok.strip("().,")) <= 1)
    return single_chars / len(tokens) > 0.5


def _prose_to_markdown(text: str, outline: dict) -> str:
    blocks: list[str] = []
    paragraph: list[str] = []

    def flush():
        if paragraph:
            # Hard line breaks keep the form-like line structure readable.
            blocks.append("  \n".join(paragraph))
            paragraph.clear()

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            flush()
            continue
        if _is_garbled(line):
            continue

        heading = _classify_heading(line, outline)
        if heading:
            flush()
            blocks.append(heading)
            continue

        kv = KEY_VALUE_RE.match(line)
        if kv and kv.group(2).strip():
            flush()
            blocks.append(f"**{kv.group(1).strip()}:** {kv.group(2).strip()}")
            continue

        paragraph.append(line)

    flush()
    return "\n\n".join(blocks)


def _page_to_markdown(page, outline: dict) -> str:
    tables = [t for t in page.find_tables() if _is_real_table(t, page)]
    tables.sort(key=lambda t: t.bbox[1])

    parts: list[str] = []
    cursor = 0  # top of the not-yet-emitted vertical band

    def emit_prose(top, bottom):
        if bottom - top < 4:
            return
        band = page.crop((0, top, page.width, bottom))
        text = band.extract_text() or ""
        if text.strip():
            prose = _prose_to_markdown(text, outline)
            if prose:
                parts.append(prose)

    for table in tables:
        x0, top, x1, bottom = table.bbox
        emit_prose(cursor, max(cursor, top))
        parts.append(_table_to_gfm(table.extract()))
        cursor = max(cursor, bottom)

    emit_prose(cursor, page.height)
    return "\n\n".join(parts)


def build(pdf_path: str) -> str:
    """Builds structured markdown for a digital PDF, page by page."""
    sections: list[str] = []
    outline = {"next_top": 1}
    with pdfplumber.open(pdf_path) as pdf:
        for index, page in enumerate(pdf.pages, start=1):
            page_md = _page_to_markdown(page, outline)
            if page_md:
                sections.append(f"<!-- page {index} -->\n\n{page_md}")
    return "\n\n".join(sections)
