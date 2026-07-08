"""Stage 2b — PyMuPDF extraction: block-sorted text preserving reading order."""

import pymupdf

from app.interfaces.base_extractor import BaseExtractor, RawPage


class PymupdfExtractor(BaseExtractor):
    name = "pymupdf"

    def extract(self, pdf_path: str) -> list[RawPage]:
        pages: list[RawPage] = []
        with pymupdf.open(pdf_path) as doc:
            for index, page in enumerate(doc, start=1):
                # sort=True orders text blocks top-to-bottom, left-to-right.
                text = page.get_text("text", sort=True) or ""
                pages.append(RawPage(page=index, text=text))
        return pages

    def version(self) -> str:
        return pymupdf.__version__
