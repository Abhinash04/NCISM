"""OpenDataLoader element-JSON -> structured Markdown.

OpenDataLoader's own Markdown *serializer* is where table structure is lost:
borderless / multi-line-cell / merged-cell tables (e.g. the "Visitor Details"
and "Constructed Area" assessment tables) are flattened into loose paragraphs
and bullet lists, and column mapping is dropped.

Its element **JSON**, however, retains the faithful table grid — every cell
carries its `row number`, `column number`, `row span` and `column span`
(merged cells) plus bounding boxes and reading order. This module walks that
JSON (produced with `use_struct_tree=True`, which yields the richest table set
for the tagged NCISM PDFs) and rebuilds Markdown deterministically:

- headings from `heading level` (and numbered-section paragraphs, via the
  shared `classify_section_heading` guard),
- tables from `rows`/`cells` -> GFM tables with merged spans expanded so
  columns always line up,
- lists from genuine leaf list items; structural list wrappers (the struct
  tree nests whole sections inside a top-level list) are flattened so their
  headings/tables/paragraphs are emitted as blocks, not bullets,
- everything else as paragraph text, in document (reading) order.

Header note: these NCISM PDFs tag each table's header *band* as a separate
element (concatenated, sometimes duplicated label text), so the labels are not
part of the table's own `rows` and cannot be reliably aligned to columns.
Correct column names come from the curated `ncism_table_headers` map, applied
by section title only when its length matches the reconstructed column count.
When no curated header matches, a table whose first column is a serial sequence
(or whose first row is mostly numeric) is emitted with an empty header row
rather than promoting a data row to the header; the section heading above the
table supplies its title.
"""

import re
from dataclasses import dataclass, field

from app.services.structurer import classify_section_heading

@dataclass
class CanonicalTable:
    title: str | None = None
    caption: str | None = None
    headers: list[list[dict]] = field(default_factory=list)
    rows: list[list[dict]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

def _deduplicate_header_band(band: str) -> str:
    if not band: return ""
    tokens = " ".join(band.split()).split()
    if not tokens: return ""
    for n in range(1, len(tokens) // 2 + 1):
        if len(tokens) % n != 0: continue
        chunk = tokens[:n]
        is_repeating = True
        for i in range(n, len(tokens), n):
            if tokens[i:i+n] != chunk:
                is_repeating = False
                break
        if is_repeating:
            return " ".join(chunk)
    return " ".join(tokens)

#: A cell/row value made only of digits, separators and punctuation is numeric
#: data (e.g. "1", "104.00", "-", "2,535"); used for header detection.
_NUMERIC_RE = re.compile(r"^[\d.,%()/+-]+$")

#: Types that carry block content when nested inside a list item, which marks
#: the list as a structural wrapper (flatten) rather than a real bullet list.
_BLOCK_TYPES = {"table", "list", "heading"}

#: A "Label : value" boundary — a colon with a trailing space (optionally a
#: leading space). It deliberately does not match "http://" (colon + "/") so
#: URLs in answers stay intact.
_KV_DELIM_RE = re.compile(r"\s*:\s+")

#: Boundary where a concatenated table header band starts after prose in
#: list-item `content` (only used when the whole string is not a pure band).
_HEADER_BAND_AFTER_PROSE_RE = re.compile(
    r"\s+(?:Sr\.?\s*No\.?|Section\s|Details\s|Required\s+as\s|Common\s+Department|Visitor'?s\s+Observation)",
    re.I,
)

#: Next form-field label inside run-on key-value text (`Label : value`).
_KV_LABEL_RE = re.compile(r"([A-Za-z][A-Za-z0-9\s./()'&-]{1,100}?)\s*:\s*")

#: Known NCISM form-field labels (longest first — used for run-on cover-page /
#: schedule blocks where generic regex would match labels inside address values).
_FORM_FIELD_LABELS: tuple[str, ...] = (
    "Purpose of Visitation for which college applied for",
    "Description of Visitation Done by NCISM",
    "Does the institution use Aadhar Enabled Biometrics to track attendance of the teaching staff",
    "Does the institution use Aadhar Enabled Biometrics to track attendance of the non teaching staff",
    "Does the institution use Aadhar Enabled Biometrics to track attendance of the hospital staff",
    "All Information uploaded on college website as per 9(2) of RMS 2016",
    "Availability of the college website?",
    "College Website address",
    "Is Quality Testing Lab Available",
    "Institution Name",
    "Course Name",
    "Course Degrees",
    "Visitation Start Date",
    "Visitation End Date",
    "Actual Visitation Dates",
    "Type Of Visitation",
    "Institution Id",
    "Visitation Id",
    "File No.",
    "File Number",
    "Academic year",
    "Herbal garden",
    "Functional Status",
    "Sitting Arrangements",
    "Equipment Status",
    "Infrastructure",
    "No of Yoga Teacher",
    "No of Biostatistician",
)

_FORM_FIELD_RE = re.compile(
    "(" + "|".join(re.escape(label) for label in _FORM_FIELD_LABELS) + r")\s*:\s*",
    re.I,
)

#: A short, alphabetic paragraph with no "Label : value" colon is treated as a
#: table's section title (e.g. "Visitor Details") for header lookup.
_TITLE_MAX_WORDS = 8
_TITLE_MAX_CHARS = 60


def _text_of(node) -> str:
    """Concatenate all paragraph/content text under `node` in reading order.

    Tables are skipped (rendered separately) so a cell/list-item's own text is
    not polluted by a nested table.
    """
    if node is None:
        return ""
    if isinstance(node, list):
        return " ".join(t for t in (_text_of(n) for n in node) if t)
    if isinstance(node, dict):
        if node.get("type") == "table":
            return ""
        parts: list[str] = []
        if node.get("content"):
            parts.append(str(node["content"]))
        for key in ("kids", "list items"):
            if node.get(key):
                parts.append(_text_of(node[key]))
        return " ".join(p for p in parts if p).strip()
    return ""


def _cell_text(cell) -> str:
    """Raw text for one table cell: paragraphs joined with `<br>`.

    Pipes are not escaped here — GFM emission escapes them per cell, while the
    HTML path escapes markup instead.
    """
    if cell is None:
        return ""
    paragraphs: list[str] = []
    if cell.get("content"):
        paragraphs.append(str(cell["content"]))
    for kid in cell.get("kids") or []:
        text = _text_of(kid)
        if text:
            paragraphs.append(text)
    return "<br>".join(p.strip() for p in paragraphs if p.strip()).strip()


def _gfm_cell(text: str) -> str:
    """Escape a cell value for a GFM table cell (pipes break the columns)."""
    return (text or "").replace("|", "\\|")


def _html_cell(text: str) -> str:
    """Escape a cell value for an HTML table cell, preserving `<br>` breaks."""
    escaped = (text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return escaped.replace("&lt;br&gt;", "<br>")


def _build_grid(node) -> list[list[str]]:
    """Expand a table node's cells into a dense grid, honouring row/col spans.

    Merged cells are expanded by repeating the value across every spanned
    position so the columns always align in GFM.
    """
    nrows = int(node.get("number of rows") or 0)
    ncols = int(node.get("number of columns") or 0)
    if nrows < 1 or ncols < 1:
        return []

    grid = [["" for _ in range(ncols)] for _ in range(nrows)]
    taken = [[False] * ncols for _ in range(nrows)]
    for row in node.get("rows") or []:
        for cell in row.get("cells") or []:
            r = int(cell.get("row number") or 1) - 1
            c = int(cell.get("column number") or 1) - 1
            row_span = int(cell.get("row span") or 1)
            col_span = int(cell.get("column span") or 1)
            text = _cell_text(cell)
            for dr in range(row_span):
                for dc in range(col_span):
                    rr, cc = r + dr, c + dc
                    if 0 <= rr < nrows and 0 <= cc < ncols and not taken[rr][cc]:
                        grid[rr][cc] = text
                        taken[rr][cc] = True

    return [row for row in grid if any(cell.strip() for cell in row)]


def _has_inline_header(rows: list[list[str]]) -> bool:
    """Decide whether the grid's first row is a genuine header row.

    The NCISM tables place their header *band* in a separate element, so the
    grid's first row is usually data — promoting it would mislabel real data as
    a header. The first row is treated as a header only when it does not look
    like data:

    - a serial first column (1, 2, 3 …) means every row (including the first)
      is a data record, so there is no inline header, and
    - a header cell that is numeric in a column whose body is numeric means the
      first row is just another data row.
    """
    if len(rows) < 2:
        return False

    first_col = [row[0].strip() for row in rows if row and row[0].strip()]
    serials = [v for v in first_col if _serial_cell(v)]
    if len(serials) >= 2 and serials[0].rstrip(".") == "1" and serials[1].rstrip(".") == "2":
        return False

    header = rows[0]
    body = rows[1:]
    if not any(c.strip() for c in header):
        return False

    for col in range(len(header)):
        head_cell = header[col].strip()
        column = [r[col].strip() for r in body if col < len(r) and r[col].strip()]
        if not column or not head_cell:
            continue
        body_numeric = sum(1 for v in column if _NUMERIC_RE.match(v)) / len(column)
        if body_numeric > 0.5 and _NUMERIC_RE.match(head_cell):
            return False  # header is numeric where the body is numeric -> data

    return True


def _html_table(spec, rows: list[list[str]]) -> str:
    """Render a table with a curated multi-row header as HTML.

    GFM cannot express grouped headers, so `spec` (rows of
    ``(label, colspan, rowspan)``) becomes a `<thead>` with real spans and the
    reconstructed grid becomes the `<tbody>`. HTML renders via `rehype-raw`.
    """
    out = ["<table>", "<thead>"]
    for header_row in spec:
        out.append("<tr>")
        for label, colspan, rowspan in header_row:
            attrs = ""
            if colspan != 1:
                attrs += f' colspan="{colspan}"'
            if rowspan != 1:
                attrs += f' rowspan="{rowspan}"'
            out.append(f"<th{attrs}>{_html_cell(label)}</th>")
        out.append("</tr>")
    out.append("</thead>")
    out.append("<tbody>")
    for row in rows:
        cells = "".join(f"<td>{_html_cell(c)}</td>" for c in row)
        out.append(f"<tr>{cells}</tr>")
    out.append("</tbody>")
    out.append("</table>")
    return "\n".join(out)


def _table_md(
    node,
    title: str | None = None,
    header_band: str | None = None,
) -> str:
    # Render natively as semantic HTML to preserve captions, grouped headers, and notes.
    nrows = int(node.get("number of rows") or 0)
    ncols = int(node.get("number of columns") or 0)
    if nrows < 1 or ncols < 1:
        return ""

    table = CanonicalTable(title=title)
    raw_rows = node.get("rows") or []
    
    # 1. Semantic Boundary Detection: Spanning Notes/Captions
    start_idx = 0
    end_idx = len(raw_rows)
    
    while start_idx < end_idx:
        cells = raw_rows[start_idx].get("cells") or []
        if len(cells) == 1 and int(cells[0].get("column span") or 1) >= ncols * 0.8:
            text = _cell_text(cells[0])
            if text:
                table.caption = (table.caption + " " + text).strip() if table.caption else text
            start_idx += 1
        else:
            break
            
    while end_idx > start_idx:
        cells = raw_rows[end_idx - 1].get("cells") or []
        if len(cells) == 1 and int(cells[0].get("column span") or 1) >= ncols * 0.8:
            text = _cell_text(cells[0])
            if text:
                table.notes.insert(0, text)
            end_idx -= 1
        else:
            break
            
    body_raw = raw_rows[start_idx:end_idx]
    
    # 2. Header Hierarchy Reconstruction natively from table spans
    header_rows = 0
    max_rowspan = 1
    for i, row in enumerate(body_raw):
        cells = row.get("cells") or []
        is_grouped = False
        for cell in cells:
            rs = int(cell.get("row span") or 1)
            cs = int(cell.get("column span") or 1)
            max_rowspan = max(max_rowspan, rs)
            if cs > 1 and len(cells) > 1:
                is_grouped = True
        
        if i < max_rowspan or is_grouped:
            header_rows = max(header_rows, i + 1)
        else:
            break
            
    table.headers = body_raw[:header_rows]
    table.rows = body_raw[header_rows:]
    
    # 3. Best-effort fallback for external header band (deduplicated)
    if header_band:
        deduped = _deduplicate_header_band(header_band)
        if not table.headers:
            table.headers = [{"cells": [{"content": deduped, "column span": ncols}]}]
        elif deduped:
            if not table.caption:
                table.caption = deduped
            elif deduped not in table.caption:
                table.caption += " " + deduped
                
    # 4. Canonical HTML Generation
    out = ["<table>"]
    if table.caption:
        out.append(f"<caption>{_html_cell(table.caption)}</caption>")
        
    if table.headers:
        out.append("<thead>")
        for row in table.headers:
            out.append("<tr>")
            for cell in (row.get("cells") or []):
                rs = int(cell.get("row span") or 1)
                cs = int(cell.get("column span") or 1)
                text = _cell_text(cell)
                attrs = ""
                if rs > 1: attrs += f' rowspan="{rs}"'
                if cs > 1: attrs += f' colspan="{cs}"'
                out.append(f"<th{attrs}>{_html_cell(text)}</th>")
            out.append("</tr>")
        out.append("</thead>")
        
    if table.rows:
        out.append("<tbody>")
        for row in table.rows:
            out.append("<tr>")
            for cell in (row.get("cells") or []):
                rs = int(cell.get("row span") or 1)
                cs = int(cell.get("column span") or 1)
                text = _cell_text(cell)
                attrs = ""
                if rs > 1: attrs += f' rowspan="{rs}"'
                if cs > 1: attrs += f' colspan="{cs}"'
                out.append(f"<td{attrs}>{_html_cell(text)}</td>")
            out.append("</tr>")
        out.append("</tbody>")
        
    out.append("</table>")
    
    if table.notes:
        out.append("\n".join(f"<p><em>{_html_cell(n)}</em></p>" for n in table.notes))
        
    return "\n".join(out)


def _serial_cell(value: str) -> bool:
    """True when a first-column cell is a row serial (``1``, ``2.``, …)."""
    return bool(re.match(r"^\d+\.?$", (value or "").strip()))


def _is_pure_header_band(text: str) -> bool:
    """True when list-item `content` is only a concatenated table header band."""
    text = (text or "").strip()
    if not text or _KV_DELIM_RE.search(text):
        return False
    if classify_section_heading(text):
        return False
    lower = text.lower()
    if lower.startswith("sr.") or lower.startswith("sr no") or lower.startswith("sr.no"):
        return True
    if text.startswith("Section ") or text.startswith("Details "):
        return True
    if "required as per" in lower and (
        "actual availability" in lower or "available" in lower or "shortcoming" in lower
    ):
        return True
    if "observations during" in lower and "occurrence" in lower:
        return True
    return False


def _split_header_band(content: str) -> tuple[str, str]:
    """Split list-item `content` into prose prefix and a header-band suffix."""
    content = (content or "").strip()
    if not content:
        return "", ""
    if _is_pure_header_band(content):
        return "", content
    match = _HEADER_BAND_AFTER_PROSE_RE.search(content)
    if match:
        return content[: match.start()].strip(), content[match.start() :].strip()
    return content, ""


def _kv_blocks_multiword(text: str) -> list[str]:
    """Split run-on ``Label : value Label2 : value2`` text with multi-word values."""
    text = (text or "").strip()
    if not text or ":" not in text:
        return []

    matches = list(_FORM_FIELD_RE.finditer(text))
    if matches:
        blocks: list[str] = []
        for i, match in enumerate(matches):
            label = match.group(1).strip()
            start = match.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            value = text[start:end].strip()
            if label and value:
                blocks.append(f"**{label}:** {value}")
        if blocks:
            return blocks

    # Generic fallback for unlisted Q&A labels (2.8 / 2.9-style single-line pairs).
    generic = list(_KV_LABEL_RE.finditer(text))
    if not generic:
        return []

    pairs: list[tuple[str, str]] = []
    for i, match in enumerate(generic):
        label = match.group(1).strip()
        start = match.end()
        end = generic[i + 1].start() if i + 1 < len(generic) else len(text)
        value = text[start:end].strip()
        if not label or not value or not any(ch.isalpha() for ch in label):
            continue
        pairs.append((label, value))

    if not pairs:
        return []
    return [f"**{label}:** {value}" for label, value in pairs]


def _subsection_heading_from_content(content: str) -> str | None:
    """Return a markdown heading when `content` opens with a numbered subsection."""
    prefix, _band = _split_header_band(content)
    if not prefix:
        return None
    classified = classify_section_heading(prefix)
    if not classified:
        return None
    number, title, level = classified
    return f"{'#' * level} {number.rstrip(')')} {title}"


def _update_ctx_title(ctx: dict, text: str) -> None:
    """Thread the nearest section title for curated table-header lookup."""
    if not text:
        return
    stripped = text.lstrip("#").strip()
    classified = classify_section_heading(stripped)
    if classified:
        number, title, _level = classified
        ctx["title"] = f"{number.rstrip(')')} {title}".strip()
    elif _title_like(stripped):
        ctx["title"] = stripped


def _content_blocks(text: str) -> list[str]:
    """Format a list item's free text.

    NCISM Q&A sections (e.g. 2.8 Bio-metric, 2.9 College Website) tag the whole
    block as one run-on string of "Question : Answer" pairs. This best-effort
    splitter reflows them into `**Question:** Answer` lines (answers are single
    tokens, so each split segment is "<answer> <next question>"); if the split
    looks inconsistent it returns the text unchanged as a single paragraph.
    """
    text = (text or "").strip()
    if not text:
        return []

    parts = _KV_DELIM_RE.split(text)
    if len(parts) < 2:
        return [text]

    pairs: list[tuple[str, str]] = []
    question = parts[0].strip()
    for middle in parts[1:-1]:
        tokens = middle.split()
        if len(tokens) < 2:  # cannot separate this answer from the next question
            return [text]
        pairs.append((question, tokens[0]))
        question = " ".join(tokens[1:])
    answer = parts[-1].strip()
    if answer:
        pairs.append((question, answer))

    if not all(len(k) > 2 and any(ch.isalpha() for ch in k) for k, _ in pairs):
        return [text]
    return [f"**{k.strip()}:** {v.strip()}" for k, v in pairs]


def _title_like(text: str) -> bool:
    """True when a plain paragraph reads like a section title (used for header
    lookup), not a data / key-value line."""
    if not text or ":" in text:
        return False
    if len(text) > _TITLE_MAX_CHARS or len(text.split()) > _TITLE_MAX_WORDS:
        return False
    alpha = sum(ch.isalpha() for ch in text)
    return alpha >= max(3, len(text) * 0.5)


#: A well-formed numbered title, e.g. "3. Teaching staff (Schedule-V)".
_NUMBERED_TITLE_RE = re.compile(r"\d+\.\s+[A-Z][A-Za-z].{2,}")


def _looks_garbled(text: str) -> bool:
    """Crop artifact where a shaded table band clipped characters out of a
    heading, leaving fragments like "3 T hi t ff (S h d l V)" (mirrors the
    structurer's `_is_garbled`: mostly one/two-character tokens)."""
    tokens = text.split()
    if len(tokens) < 4:
        return False
    single_chars = sum(1 for tok in tokens if len(tok.strip("().,")) <= 1)
    return single_chars / len(tokens) > 0.5


def _clean_heading_text(text: str) -> str:
    """Strip a character-clipped artifact from a heading.

    The shaded title band is sometimes tagged as a clipped run concatenated with
    the clean title, e.g. "3 T hi t ff (S h d l V) 3. Teaching staff
    (Schedule-V)". When the text looks garbled, prefer the rightmost well-formed
    numbered title; if none is present the whole run is dropped. Clean headings
    pass through unchanged.
    """
    text = (text or "").strip()
    if not text or not _looks_garbled(text):
        return text
    matches = list(_NUMBERED_TITLE_RE.finditer(text))
    if matches:
        return matches[-1].group(0).strip()
    return text


def _paragraph_md(node) -> str | None:
    text = (node.get("content") or "").strip()
    if not text:
        return None
    classified = classify_section_heading(text)
    if classified:
        number, title, level = classified
        return f"{'#' * level} {number.rstrip(')')} {title}"
    # Not a recognised heading: de-garble clipped title bands, but never drop a
    # paragraph (fall back to the original text if cleaning would empty it).
    return _clean_heading_text(text) or text


def _heading_md(node) -> str | None:
    level = node.get("heading level")
    text = _clean_heading_text(_text_of(node))
    if not text:
        return None
    depth = int(level) + 1 if level else 2
    return f"{'#' * min(depth, 6)} {text}"


def _is_structural_item(item) -> bool:
    """A list item that wraps block content (table/heading/nested list or more
    than one child) is a structural container, not a bullet."""
    kids = [k for k in (item.get("kids") or []) if isinstance(k, dict)]
    if any(k.get("type") in _BLOCK_TYPES for k in kids):
        return True
    return len(kids) > 1


def _render(node, out: list[str], ctx: dict) -> None:
    if isinstance(node, list):
        for child in node:
            _render(child, out, ctx)
        return
    if not isinstance(node, dict):
        return

    node_type = node.get("type")
    if node_type == "image":
        return
    if node_type == "table":
        # The nearest preceding heading / title names the table for header lookup.
        table = _table_md(
            node,
            ctx.get("title"),
            ctx.pop("header_band", None),
        )
        if table:
            out.append(table)
        return
    if node_type == "heading":
        heading = _heading_md(node)
        if heading:
            out.append(heading)
            ctx["title"] = _text_of(node)
        return
    if node_type == "paragraph":
        paragraph = _paragraph_md(node)
        if paragraph:
            out.append(paragraph)
            if paragraph.startswith("#") or _title_like(paragraph):
                ctx["title"] = paragraph.lstrip("# ").strip()
        return
    if node_type == "list":
        items = node.get("list items") or []
        if any(_is_structural_item(it) for it in items):
            # Structural wrapper: route each item through the list-item branch
            # so its own content (data) is emitted, not just its children.
            for item in items:
                _render(item, out, ctx)
        else:
            for item in items:
                text = _text_of(item).strip()
                if not text:
                    continue
                # A numbered-section title tagged as a bullet is a demoted
                # heading (common in the cluster fallback) — promote it back.
                classified = classify_section_heading(text)
                if classified:
                    number, title, level = classified
                    out.append(f"{'#' * level} {number.rstrip(')')} {title}")
                else:
                    out.append(f"- {text}")
        return
    if node_type == "list item":
        kids = [k for k in (node.get("kids") or []) if isinstance(k, dict)]
        content = (node.get("content") or "").strip()
        kid_text = _text_of(kids)

        prose, band = _split_header_band(content)
        
        # Deduplicate repeating captions (often caused by tables crossing page boundaries)
        if prose and prose == ctx.get("last_prose"):
            prose = ""
        elif prose:
            ctx["last_prose"] = prose
            
        kv_blocks = _kv_blocks_multiword(prose) if prose else []
        subsection = _subsection_heading_from_content(content)

        table_kids = [k for k in kids if k.get("type") in ("table", "list")]
        non_table_kids = [k for k in kids if k.get("type") not in ("table", "list")]

        saved_band = band

        kv_emitted = False
        for kid in non_table_kids:
            _render(kid, out, ctx)
            if prose and not kv_emitted and kid.get("type") in ("paragraph", "heading"):
                marker = (kid.get("content") or "").strip()
                if marker in ("Visitation Details", "Actual Visitation Dates") or _title_like(marker):
                    if kv_blocks:
                        out.extend(kv_blocks)
                    elif prose not in kid_text:
                        out.extend(_content_blocks(prose))
                    kv_emitted = True

        if prose and not kv_emitted and prose not in kid_text:
            if kv_blocks:
                out.extend(kv_blocks)
            else:
                out.extend(_content_blocks(prose))

        # A numbered subsection carried only in `content` (e.g. 2.4.1) is emitted
        # after its parent paragraph but before the nested table.
        if subsection and subsection not in kid_text:
            out.append(subsection)
            _update_ctx_title(ctx, subsection)

        if saved_band and table_kids:
            ctx["header_band"] = saved_band

        for kid in table_kids:
            _render(kid, out, ctx)
        return

    _render(node.get("kids") or [], out, ctx)


def _merge_adjacent_tables(markdown: str) -> str:
    """Concatenate adjacent HTML tables (separated only by whitespace or page markers)."""
    # Regex to find consecutive HTML tables separated only by spaces, newlines, or page markers.
    # It captures the first table's end (</tbody></table>) and the second table's start.
    # When replaced with "", the two tables merge into a single continuous <tbody>.
    import re
    pattern = re.compile(
        r"</tbody>\s*</table>\s*(?:<!--\s*page\s+\d+\s*-->\s*)*\s*<table[^>]*>(?:\s*<caption[^>]*>.*?</caption\s*>)?(?:\s*<thead[^>]*>.*?</thead\s*>)?\s*<tbody>",
        re.DOTALL
    )
    
    merged = markdown
    while True:
        new_md = pattern.sub("", merged, count=1)
        if new_md == merged:
            break
        merged = new_md
    return merged


def build_markdown(elements) -> str:
    """Reconstruct structured Markdown from an OpenDataLoader element JSON dict.

    Returns an empty string when `elements` is missing or carries no content.
    """
    if not isinstance(elements, dict):
        return ""
    out: list[str] = []
    _render(elements.get("kids") or [], out, {"title": None})
    raw_md = "\n\n".join(block for block in out if block.strip())
    return _merge_adjacent_tables(raw_md)
