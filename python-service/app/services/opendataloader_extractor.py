"""Stage — OpenDataLoader-PDF structural extraction (local / fast mode).

OpenDataLoader-PDF is a layout-analysis engine (XY-Cut++ reading order,
heading hierarchy, table detection, header/footer filtering) that emits both
Markdown and an element JSON carrying per-element semantic type, table grids
and bounding boxes. It is positioned after MarkItDown as the last, and
highest-fidelity, structural engine; its Markdown is the preferred candidate
for the Final Structured Markdown (chosen by the validation stage) and its
JSON is preserved as the substrate for the future Rule Engine.

Structured Markdown is rebuilt from the element JSON (see
`odl_json_structurer`) rather than taken from OpenDataLoader's own Markdown
serializer: the serializer flattens borderless / multi-line-cell / merged-cell
tables into paragraphs and bullets and drops column mapping, whereas the JSON
retains the faithful table grid (cells with row/column spans). We run with
`use_struct_tree=True`, which uses the PDF's own tagged structure and yields
the richest, most accurate table set for the (tagged) NCISM reports.

Deployment notes:
- Local/fast mode only — no AI/OCR hybrid backend (that is out of Phase-1
  scope). Requires a Java 11+ runtime; each `convert()` spawns a JVM.
- File-based API: it writes outputs into a directory. We run it against a
  private temp directory and read the results back, so the service stays
  stateless. Image extraction is disabled (`image_output="off"`) because the
  service persists nothing to disk.
- Graceful degradation: if the package is missing, Java is unavailable, or a
  conversion fails, this stage returns an unproduced result and the pipeline
  continues — validation then falls back to the structurer / MarkItDown. If
  the JSON is missing/empty (e.g. an untagged PDF), it falls back to the
  native Markdown serializer output (with heading repair).
"""

import glob
import json
import logging
import os
import re
import tempfile
from dataclasses import dataclass
from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as package_version

from app.services import odl_json_structurer
from app.services.structurer import classify_section_heading

logger = logging.getLogger(__name__)

#: A markdown list item (bullet), capturing its text: "- 2.3 Foo" / "  * 2.3 Foo".
_LIST_ITEM_RE = re.compile(r"^(\s*)[-*]\s+(.*\S)\s*$")

try:  # Import is cheap and Java-free; JVM only spawns at convert() time.
    import opendataloader_pdf

    _IMPORTED = True
except Exception:  # pragma: no cover - import guard
    opendataloader_pdf = None
    _IMPORTED = False

#: Matches the structurer's `<!-- page N -->` convention for consistent artifacts.
PAGE_SEPARATOR = "<!-- page %page-number% -->"

#: The tagged structure tree gives the highest-fidelity tables, but only for
#: well-tagged PDFs. If its reconstruction retains less than this share of the
#: merged raw text, the PDF is poorly tagged (the struct tree dropped content)
#: and we fall back to the geometric `cluster` table method instead. Calibrated
#: on the NCISM samples: well-tagged ~0.75, poorly-tagged ~0.12-0.14.
STRUCT_TREE_MIN_COVERAGE = 0.5


@dataclass
class OpenDataLoaderResult:
    markdown: str
    elements: object | None  # parsed element JSON (dict) or None
    produced: bool
    mode: str = "struct_tree"  # which table strategy produced the output
    error: str | None = None


def is_available() -> bool:
    """True when the Python package imported (Java is checked at run time)."""
    return _IMPORTED


def version() -> str:
    if not _IMPORTED:
        return "unavailable"
    try:
        return package_version("opendataloader-pdf")
    except PackageNotFoundError:
        return "unknown"


def _repair_headings(markdown: str) -> str:
    """Re-promote numbered-section titles that cluster mode demoted to list
    items (e.g. "- 2.3 Area of the Teaching Departments") back to markdown
    headings. The shared `classify_section_heading` guards leave genuine data
    rows (e.g. "- 1 Ayurved Samhita & Siddhant 100 104.00 -") untouched.
    """
    lines = []
    for line in markdown.splitlines():
        match = _LIST_ITEM_RE.match(line)
        if match:
            classified = classify_section_heading(match.group(2))
            if classified:
                number, title, level = classified
                lines.append(f"{'#' * level} {number.rstrip(')')} {title}")
                continue
        lines.append(line)
    return "\n".join(lines)


def _read_first(directory: str, pattern: str) -> str | None:
    matches = sorted(glob.glob(os.path.join(directory, pattern)))
    if not matches:
        return None
    with open(matches[0], encoding="utf-8") as handle:
        return handle.read()


def _convert(pdf_path: str, **options) -> tuple[str, object | None]:
    """Run one OpenDataLoader conversion; returns (native_markdown, elements).

    Raises on JVM/parse failure so the caller can degrade gracefully.
    """
    with tempfile.TemporaryDirectory(prefix="odl_") as out_dir:
        opendataloader_pdf.convert(
            input_path=[pdf_path],
            output_dir=out_dir,
            format="markdown,json",
            image_output="off",  # stateless service — never write images
            markdown_page_separator=PAGE_SEPARATOR,
            quiet=True,
            **options,
        )
        native_markdown = _read_first(out_dir, "*.md") or ""
        raw_json = _read_first(out_dir, "*.json")

    elements = None
    if raw_json:
        try:
            elements = json.loads(raw_json)
        except json.JSONDecodeError:
            logger.warning("OpenDataLoader JSON could not be parsed")
    return native_markdown, elements


def _build(elements, native_markdown: str) -> str:
    """Rebuild structured Markdown from the element JSON, falling back to the
    native serializer output (with heading repair) when the JSON is unusable."""
    markdown = odl_json_structurer.build_markdown(elements)
    if not markdown and native_markdown:
        markdown = _repair_headings(native_markdown)
    return markdown


def extract(pdf_path: str, raw_text: str = "") -> OpenDataLoaderResult:
    """Structural extraction with per-document table-strategy selection.

    Runs the tagged structure tree first (best table fidelity). If its
    reconstruction retains too little of `raw_text` — i.e. the PDF is poorly
    tagged and the struct tree dropped content — it falls back to the geometric
    `cluster` table method, which recovers content from untagged layouts.
    """
    if not _IMPORTED:
        return OpenDataLoaderResult(
            markdown="",
            elements=None,
            produced=False,
            error="opendataloader-pdf is not installed",
        )

    try:
        native_st, elements_st = _convert(pdf_path, use_struct_tree=True)
    except Exception as exc:  # missing Java / JVM failure / parse error
        logger.exception("OpenDataLoader conversion failed")
        return OpenDataLoaderResult(
            markdown="", elements=None, produced=False,
            error=f"OpenDataLoader conversion failed: {exc}",
        )

    markdown = _build(elements_st, native_st)
    elements, mode = elements_st, "struct_tree"

    # Poorly-tagged PDF: the struct tree dropped content. Retry with the
    # geometric cluster method and keep whichever reconstruction is richer.
    raw_len = len(raw_text or "")
    coverage = (len(markdown) / raw_len) if raw_len else 1.0
    if raw_len and coverage < STRUCT_TREE_MIN_COVERAGE:
        try:
            native_cl, elements_cl = _convert(pdf_path, table_method="cluster")
            markdown_cl = _build(elements_cl, native_cl)
            if len(markdown_cl) > len(markdown):
                markdown, elements, mode = markdown_cl, elements_cl, "cluster"
        except Exception:  # cluster retry is best-effort
            logger.exception("OpenDataLoader cluster fallback failed")

    if not markdown:
        return OpenDataLoaderResult(
            markdown="", elements=elements, produced=False, mode=mode,
            error="OpenDataLoader produced no usable output",
        )

    return OpenDataLoaderResult(
        markdown=markdown, elements=elements, produced=True, mode=mode,
    )
