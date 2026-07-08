"""Stage 4 — MarkItDown conversion to structured markdown.

MarkItDown consumes the source PDF file (not raw text) and produces a
markdown representation preserving headings, hierarchy, lists and tables.
Its output is stored alongside — never instead of — the merged raw text.
"""

from importlib.metadata import version as package_version

from markitdown import MarkItDown

_converter = MarkItDown(enable_plugins=False)


def convert(pdf_path: str) -> str:
    result = _converter.convert(pdf_path)
    return result.text_content or ""


def version() -> str:
    return package_version("markitdown")
