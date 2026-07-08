"""Stage 3 — Merge the two digital extractions into the raw text of record.

Per page, pdfplumber's text is preferred (better table/line fidelity on these
visitation reports); PyMuPDF's block-sorted text is the fallback when
pdfplumber yields nothing usable. The winning engine is recorded per page.
"""

from dataclasses import dataclass

from app.interfaces.base_extractor import RawPage
from app.utils.stats import char_count, word_count

#: pdfplumber output shorter than this falls back to PyMuPDF.
MIN_USABLE_CHARS = 10


@dataclass
class MergedPage:
    page: int
    text: str
    char_count: int
    word_count: int
    table_count: int
    engine: str


@dataclass
class MergedDocument:
    raw_text: str
    pages: list[MergedPage]


def merge(plumber_pages: list[RawPage], mupdf_pages: list[RawPage]) -> MergedDocument:
    mupdf_by_page = {p.page: p for p in mupdf_pages}
    merged_pages: list[MergedPage] = []

    for plumber_page in plumber_pages:
        mupdf_page = mupdf_by_page.get(plumber_page.page)
        plumber_text = plumber_page.text.strip()

        if len(plumber_text) >= MIN_USABLE_CHARS or mupdf_page is None:
            text, engine = plumber_page.text, "pdfplumber"
        else:
            text, engine = mupdf_page.text, "pymupdf"

        merged_pages.append(
            MergedPage(
                page=plumber_page.page,
                text=text,
                char_count=char_count(text),
                word_count=word_count(text),
                table_count=len(plumber_page.tables),
                engine=engine,
            )
        )

    raw_text = "\n\n".join(page.text for page in merged_pages)
    return MergedDocument(raw_text=raw_text, pages=merged_pages)
